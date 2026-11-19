#!/usr/bin/env node
// One command for every automated check, on a throwaway database, so nothing touches your development data.
//   npm run test:all                 production build + server (closest to deployment)
//   npm run test:all -- --dev        next dev instead of a build (faster to start)
//   npm run test:all -- --only=unit,access      run just some stages (names are printed in the summary)
//   npm run test:all -- --keep       keep the temporary folder and print its path
// Works on Linux, macOS and Windows: tools are started through node, not through a shell.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(web, "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const only = (args.find((a) => a.startsWith("--only=")) ?? "").slice("--only=".length).split(",").filter(Boolean);

const bin = (...p) => {
  const f = path.join(web, "node_modules", ...p);
  if (!existsSync(f)) { console.error(`Missing ${f}. Run "npm install" in web/ first.`); process.exit(2); }
  return f;
};
const TSC = bin("typescript", "bin", "tsc"), ESLINT = bin("eslint", "bin", "eslint.js"), TSX = bin("tsx", "dist", "cli.mjs");
const PRISMA = bin("prisma", "build", "index.js"), NEXT = bin("next", "dist", "bin", "next");

// "next build" into another folder rewrites tsconfig.json (reformats it and adds that folder). Put it back afterwards.
const tsconfigFile = path.join(web, "tsconfig.json");
const tsconfigBefore = readFileSync(tsconfigFile, "utf8");

const tmp = mkdtempSync(path.join(os.tmpdir(), "mac-test-all-"));
const dbFile = path.join(tmp, "test.db");
const secret = () => randomBytes(24).toString("base64");
const INTAKE_API_KEY = secret();
const env = {
  ...process.env,
  DATABASE_URL: `file:${dbFile}`,
  AUTH_SECRET: secret(),
  AUTH_TRUST_HOST: "true",
  INTAKE_API_KEY,
  BACKGROUND_JOBS: "off", // the scripted tests drive escalation and delivery themselves
  // Empty values keep a developer's own .env from changing the settings the tests expect (Next does not override them).
  IDENTITY_CONFIDENCE_THRESHOLD: "",
  AID_CONFIDENCE_THRESHOLD: "",
  ACK_TIMEOUT_MINUTES: "",
  COOLDOWN_MINUTES: "",
  NEXT_DIST_DIR: ".next-test",
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_ENV: undefined,
};
delete env.NODE_ENV;

// Prisma starts the seed as "tsx prisma/seed.ts" and finds tsx on PATH, which npm normally fills in.
// The variable is called "Path" on Windows, so look for it case-insensitively.
const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "PATH";
env[pathKey] = `${path.join(web, "node_modules", ".bin")}${path.delimiter}${env[pathKey] ?? ""}`;

const results = [];
let server = null;
let logFd = null;
const tail = (text, n) => text.trim().split("\n").slice(-n).join("\n");
const summary = (text) => text.split("\n").filter((l) => /^# (tests|pass|fail) |^All .*passed|check\(s\) (failed|FAILED)|^Errors:/.test(l)).slice(-4).join(" | ");

function wanted(name) { return only.length === 0 || only.includes(name); }

function run(name, nodeArgs, opts = {}) {
  if (!wanted(name)) return true;
  const t0 = Date.now();
  process.stdout.write(`> ${name} ... `);
  const r = spawnSync(process.execPath, nodeArgs, { cwd: opts.cwd ?? web, env: { ...env, ...opts.env }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const ok = r.status === 0;
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  results.push({ name, ok, secs, note: ok ? summary(out) : "" });
  console.log(`${ok ? "ok" : "FAILED"} (${secs}s)`);
  if (ok && opts.show) console.log(out.trim().split("\n").map((l) => `    ${l}`).join("\n")); // reports worth reading
  if (!ok) {
    // Show every failed check, not only what happens to be in the last lines of a long output.
    const failedLines = out.split("\n").filter((l) => /^(FAIL|not ok)\b/.test(l));
    if (failedLines.length) console.log(failedLines.join("\n"));
    console.log(tail(out, failedLines.length ? 8 : 60));
  }
  return ok;
}

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
  s.on("error", reject);
});

async function startServer(port) {
  const useDev = flag("dev");
  // The server writes to a file, not a pipe. The stages above run with spawnSync, which blocks this process, so
  // a pipe would fill up (64 KB) during a long stage and freeze the server in the middle of a console.log.
  const logFile = path.join(tmp, "server.log");
  logFd = openSync(logFile, "a");
  server = spawn(process.execPath, [NEXT, useDev ? "dev" : "start", "-p", String(port), "-H", "127.0.0.1"], { cwd: web, env, stdio: ["ignore", logFd, logFd] });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/login`)).status === 200) return; } catch { /* not up yet */ }
    if (server.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(tail(readFileSync(logFile, "utf8"), 30));
  throw new Error("The server did not start");
}

function cleanup() {
  if (server && server.exitCode === null) server.kill();
  if (logFd !== null) { try { closeSync(logFd); } catch { /* already closed */ } }
  if (readFileSync(tsconfigFile, "utf8") !== tsconfigBefore) writeFileSync(tsconfigFile, tsconfigBefore);
  if (flag("keep")) console.log(`Kept ${tmp}`);
  else rmSync(tmp, { recursive: true, force: true });
}
process.on("SIGINT", () => { cleanup(); process.exit(130); });

(async () => {
  const unitFiles = readdirSync(path.join(web, "src", "lib")).filter((f) => f.endsWith(".test.ts")).map((f) => path.join("src", "lib", f));
  let alive = true;
  const step = (...a) => { if (alive && !run(...a)) alive = false; };

  step("generate", [PRISMA, "generate"]);
  step("typecheck", [TSC, "--noEmit"]);
  step("lint", [ESLINT, "src", "scripts"]);
  step("unit", [TSX, "--test", ...unitFiles]);
  step("migrate", [PRISMA, "migrate", "deploy"]);
  step("seed", [PRISMA, "db", "seed"]);
  step("integration", [TSX, "--test", path.join("src", "lib", "escalation.integration.ts")]);

  const needsServer = ["access", "generator", "replay", "latency"].some(wanted);
  if (alive && needsServer) {
    if (!flag("dev")) step("build", [NEXT, "build"]);
    if (alive) {
      const port = await freePort();
      const t0 = Date.now();
      process.stdout.write("> server ... ");
      try { await startServer(port); console.log(`up on port ${port} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }
      catch (e) { console.log("FAILED"); results.push({ name: "server", ok: false, secs: "0", note: e.message }); alive = false; }
      if (alive) {
        const url = `http://127.0.0.1:${port}`;
        step("access", [path.join("scripts", "test-access.mjs"), url]);
        step("generator", [path.join(repo, "tools", "mock-generator", "generate.mjs"), "all", "--url", url, "--key", INTAKE_API_KEY], { cwd: repo });
        for (const [name, script] of [["replay", "replay-scenarios.mjs"], ["latency", "measure-latency.mjs"]]) {
          if (existsSync(path.join(web, "scripts", script))) step(name, [path.join("scripts", script), url], { show: true });
        }
      }
    }
  }

  cleanup();
  console.log("\nSummary");
  for (const r of results) console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(12)} ${r.secs.padStart(6)}s  ${r.note}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} stage(s) failed` : "\nAll stages passed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); cleanup(); process.exit(1); });
