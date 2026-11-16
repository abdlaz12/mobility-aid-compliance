import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMessage } from "./notify/message";
import { channelNameFor, pushoverChannel } from "./notify/channels";
import { backoffMs, recipientTypes } from "./notify/queue";

const input = { level: "warning", initials: "A.A.", code: "P-0042", roomId: "R-204", aidLabel: "none", timestamp: new Date("2026-11-03T14:22:05Z") };

test("message has room, aid, time and a patient reference, and no full name", () => {
  const m = buildMessage(input);
  assert.match(m.title, /Warning: A\.A\. \(P-0042\)/);
  assert.match(m.body, /Room R-204/);
  assert.match(m.body, /aid detected: none/);
  assert.match(m.body, /14:22 UTC/);
  // The builder is not even given a name, so it cannot leak one. Guard the inputs too:
  assert.deepEqual(Object.keys(input).sort(), ["aidLabel", "code", "initials", "level", "roomId", "timestamp"]);
});
test("message priority: escalated and emergency are urgent, warning is normal, never 2", () => {
  assert.equal(buildMessage(input).priority, 0);
  assert.equal(buildMessage({ ...input, level: "escalated" }).priority, 1);
  assert.equal(buildMessage({ ...input, level: "emergency" }).priority, 1);
});
test("who is told: nurses for a warning, nurses and family when escalated or emergency, nobody for info", () => {
  assert.deepEqual(recipientTypes("warning"), ["nurse"]);
  assert.deepEqual(recipientTypes("escalated"), ["nurse", "family"]);
  assert.deepEqual(recipientTypes("emergency"), ["nurse", "family"]);
  assert.deepEqual(recipientTypes("info"), []);
});
test("backoff doubles from 30 s and is capped", () => {
  assert.deepEqual([1, 2, 3, 4].map(backoffMs), [30_000, 60_000, 120_000, 240_000]);
  assert.equal(backoffMs(30), 15 * 60_000);
});
test("channel choice: pushover only when both the app token and the user key exist", () => {
  assert.equal(channelNameFor({ id: 1, pushoverUserKey: "k" }, { PUSHOVER_APP_TOKEN: "t" }), "pushover");
  assert.equal(channelNameFor({ id: 1, pushoverUserKey: null }, { PUSHOVER_APP_TOKEN: "t" }), "log");
  assert.equal(channelNameFor({ id: 1, pushoverUserKey: "k" }, {}), "log");
});

const fakeFetch = (status: number) => {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const f = (async (url: string, init: RequestInit) => { calls.push({ url, body: init.body as URLSearchParams }); return new Response("{}", { status }); }) as unknown as typeof fetch;
  return { f, calls };
};
const to = { id: 1, pushoverUserKey: "user-key" };

test("pushover: success sends only the minimal fields", async () => {
  const { f, calls } = fakeFetch(200);
  const r = await pushoverChannel("app-token", f).send(to, buildMessage(input));
  assert.deepEqual(r, { ok: true });
  assert.equal(calls[0].url, "https://api.pushover.net/1/messages.json");
  assert.deepEqual([...calls[0].body.keys()].sort(), ["message", "priority", "title", "token", "user"]);
  assert.ok(!calls[0].body.get("message")!.includes("Demo Patient"));
});
test("pushover: 4xx is permanent, 5xx and 429 are retried, network error is retried, missing key is permanent", async () => {
  const retry = async (s: number) => { const r = await pushoverChannel("t", fakeFetch(s).f).send(to, buildMessage(input)); return r.ok ? null : r.retry; };
  assert.equal(await retry(400), false);
  assert.equal(await retry(500), true);
  assert.equal(await retry(429), true);
  const boom = (async () => { throw new Error("down"); }) as unknown as typeof fetch;
  const net = await pushoverChannel("t", boom).send(to, buildMessage(input));
  assert.deepEqual(net.ok === false && net.retry, true);
  const noKey = await pushoverChannel("t", fakeFetch(200).f).send({ id: 1, pushoverUserKey: null }, buildMessage(input));
  assert.deepEqual(noKey.ok === false && noKey.retry, false);
});
