#!/usr/bin/env node
// Access-control test against a RUNNING server with the seeded demo data (npm run dev or npm start).
// It creates its own fresh alerts through the intake API, then checks who may see and acknowledge what.
//   node scripts/test-access.mjs [baseUrl]        (env: INTAKE_API_KEY, default dev-only-change-me)
import { randomUUID } from "node:crypto";

const BASE = process.argv[2] ?? "http://localhost:3000";
const KEY = process.env.INTAKE_API_KEY ?? "dev-only-change-me";
const PASSWORD = "demo-password-1";
let failed = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `   got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
}

/** Tiny cookie jar: Auth.js login is a CSRF round trip. */
async function login(email, password = PASSWORD) {
  const jar = new Map();
  const absorb = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar.set(kv.slice(0, i), kv.slice(i + 1)); } };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const r1 = await fetch(`${BASE}/api/auth/csrf`); absorb(r1);
  const { csrfToken } = await r1.json();
  const r2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookie() },
    body: new URLSearchParams({ csrfToken, email, password, json: "true" }),
  });
  absorb(r2);
  return (path, init = {}) => fetch(`${BASE}${path}`, { ...init, headers: { ...init.headers, cookie: cookie() } });
}

const sendFull = (patient, aid) => fetch(`${BASE}/api/detections`, {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({
    event_id: randomUUID(), timestamp: new Date().toISOString(), room_id: "R-204", person_track_id: "t-1",
    identity: { patient_id: patient, confidence: 0.95 }, aid: { label: aid, confidence: 0.95 }, event_type: "detection",
  }),
}).then(async (r) => ({ status: r.status, alert: (await r.json()).alert_level ?? null }));

const send = (patient, aid) => fetch(`${BASE}/api/detections`, {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({
    event_id: randomUUID(), timestamp: new Date().toISOString(), room_id: patient === "P-0042" ? "R-204" : "R-205",
    person_track_id: "t-1", identity: { patient_id: patient, confidence: 0.95 }, aid: { label: aid, confidence: 0.95 }, event_type: "detection",
  }),
}).then((r) => r.status);

const codes = async (get, path, key, pick) => (await (await get(path)).json())[key].map(pick).sort();
const status = async (get, path, method = "GET") => (await get(path, { method })).status;

try {
  const anon = (path, init) => fetch(`${BASE}${path}`, init);
  const [admin, nurse, nurse2, family, family2, wrong] = await Promise.all([
    login("admin@example.test"), login("nurse@example.test"), login("nurse2@example.test"),
    login("family@example.test"), login("family2@example.test"), login("admin@example.test", "wrong-password"),
  ]);

  console.log("# not signed in");
  for (const p of ["/api/patients", "/api/alerts", "/api/detections?needs_review=true", "/api/alerts/1"]) check(`GET ${p}`, await status(anon, p), 401);
  check("POST acknowledge", await status(anon, "/api/alerts/1/acknowledge", "POST"), 401);
  check("wrong password gives no session", await status(wrong, "/api/patients"), 401);
  check("session cookie does not replace the intake API key", await status(admin, "/api/detections", "POST"), 401);

  console.log("# which patients each role sees");
  const pat = (g) => codes(g, "/api/patients", "patients", (p) => p.code);
  // Earlier runs of this test leave their own patients behind, so the scope checks look at the seeded ones only.
  const seeded = (list) => list.filter((c) => /^P-004[23]$/.test(c));
  check("admin sees all", seeded(await pat(admin)), ["P-0042", "P-0043"]);
  check("nurse (both patients)", seeded(await pat(nurse)), ["P-0042", "P-0043"]);
  check("nurse2 (P-0043 only)", seeded(await pat(nurse2)), ["P-0043"]);
  check("family (P-0042 only)", seeded(await pat(family)), ["P-0042"]);
  check("family2 (P-0043 only)", seeded(await pat(family2)), ["P-0043"]);

  console.log("# fresh alerts");
  check("send noncompliant event for P-0042", await send("P-0042", "none"), 201);
  check("send noncompliant event for P-0043", await send("P-0043", "none"), 201);
  const latest = async (code) => {
    const { alerts } = await (await admin("/api/alerts?status=pending&level=warning")).json();
    return Math.max(...alerts.filter((a) => a.patient.code === code).map((a) => a.id));
  };
  const a42 = await latest("P-0042"), a43 = await latest("P-0043");
  const alertPatients = (g) => codes(g, "/api/alerts?status=pending", "alerts", (a) => a.patient.code).then((l) => seeded([...new Set(l)]));
  check("nurse2 sees only P-0043 alerts", await alertPatients(nurse2), ["P-0043"]);
  check("family sees only P-0042 alerts", await alertPatients(family), ["P-0042"]);
  check("family does not see the silent info log", (await codes(family, "/api/alerts", "alerts", (a) => a.level)).includes("info"), false);

  console.log("# review queue (admin and nurse only)");
  check("admin", await status(admin, "/api/detections?needs_review=true"), 200);
  check("nurse", await status(nurse, "/api/detections?needs_review=true"), 200);
  check("family", await status(family, "/api/detections?needs_review=true"), 403);

  console.log("# reading one alert");
  check("admin reads P-0042 alert", await status(admin, `/api/alerts/${a42}`), 200);
  check("nurse2 reads P-0042 alert (not assigned)", await status(nurse2, `/api/alerts/${a42}`), 403);
  check("family reads own patient's alert", await status(family, `/api/alerts/${a42}`), 200);
  check("family2 reads another patient's alert", await status(family2, `/api/alerts/${a42}`), 403);
  check("missing alert", await status(admin, "/api/alerts/99999999"), 404);
  check("non-numeric id", await status(admin, "/api/alerts/abc"), 404);

  console.log("# acknowledging");
  const ack = (g, id) => status(g, `/api/alerts/${id}/acknowledge`, "POST");
  check("family cannot (role)", await ack(family, a42), 403);
  check("nurse2 cannot (not assigned to P-0042)", await ack(nurse2, a42), 403);
  check("nurse2 can for P-0043", await ack(nurse2, a43), 200);
  check("a second acknowledge conflicts", await ack(nurse2, a43), 409);
  check("nurse can for P-0042", await ack(nurse, a42), 200);
  check("missing alert", await ack(nurse, 99999999), 404);
  const [r1, r2] = await Promise.all([send("P-0042", "none"), send("P-0042", "none")]);
  check("two new events accepted", [r1, r2], [201, 201]);
  const race = (await (await admin("/api/alerts?status=pending&level=warning")).json()).alerts.filter((a) => a.patient.code === "P-0042")[0].id;
  const results = (await Promise.all([ack(nurse, race), ack(admin, race)])).sort();
  check("simultaneous acknowledge: exactly one wins", results, [200, 409]);

  console.log("# managing patients (admin only)");
  const body = (o) => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
  const call = (g, path, method, o) => g(path, { method, ...body(o) });
  const code = `T-${Date.now().toString(36).toUpperCase()}`;
  const newPatient = { code, name: "Test Patient", age: "80", room: "R-204", aid: "cane" };
  check("anonymous cannot create", (await anon("/api/patients", { method: "POST", ...body(newPatient) })).status, 401);
  check("nurse cannot create", (await call(nurse, "/api/patients", "POST", newPatient)).status, 403);
  check("family cannot create", (await call(family, "/api/patients", "POST", newPatient)).status, 403);
  check("bad code is rejected", (await call(admin, "/api/patients", "POST", { ...newPatient, code: "x" })).status, 400);
  check("script in code is rejected", (await call(admin, "/api/patients", "POST", { ...newPatient, code: "<script>" })).status, 400);
  check("missing aid is rejected", (await call(admin, "/api/patients", "POST", { ...newPatient, aid: "" })).status, 400);
  check("unknown aid is rejected", (await call(admin, "/api/patients", "POST", { ...newPatient, aid: "jetpack" })).status, 400);
  check("body that is not an object", (await admin("/api/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: "[1]" })).status, 400);
  const created = await call(admin, "/api/patients", "POST", newPatient);
  check("admin creates a patient", created.status, 201);
  const pid = (await created.json()).patient.id;
  check("duplicate code conflicts", (await call(admin, "/api/patients", "POST", newPatient)).status, 409);
  check("unassigned nurse does not see the new patient", (await pat(nurse2)).includes(code), false);

  console.log("# reading one patient");
  check("admin", await status(admin, `/api/patients/${pid}`), 200);
  check("nurse not assigned", await status(nurse, `/api/patients/${pid}`), 403);
  check("family not assigned", await status(family, `/api/patients/${pid}`), 403);
  check("anonymous", await status(anon, `/api/patients/${pid}`), 401);
  check("missing patient", await status(admin, "/api/patients/99999999"), 404);
  check("non-numeric id", await status(admin, "/api/patients/abc"), 404);
  const detail = await (await admin(`/api/patients/${pid}`)).json();
  check("admin sees room and aid", [detail.room, detail.prescribedAid], ["R-204", "cane"]);

  console.log("# assigning caregivers");
  const p43 = (await (await admin("/api/patients")).json()).patients.find((p) => p.code === "P-0043").id;
  const crew = (await (await admin(`/api/patients/${p43}`)).json()).contacts;
  const n2 = crew.find((c) => c.email === "nurse2@example.test").id;
  const f2 = crew.find((c) => c.email === "family2@example.test").id;
  check("nurse cannot assign", (await call(nurse, `/api/patients/${pid}/contacts`, "PUT", { userIds: [n2] })).status, 403);
  check("unknown user is rejected", (await call(admin, `/api/patients/${pid}/contacts`, "PUT", { userIds: [99999999] })).status, 400);
  check("userIds must be numbers", (await call(admin, `/api/patients/${pid}/contacts`, "PUT", { userIds: ["abc"] })).status, 400);
  check("failed assignment changed nothing", (await (await admin(`/api/patients/${pid}`)).json()).contacts.length, 0);
  check("admin assigns nurse2 and family2", (await call(admin, `/api/patients/${pid}/contacts`, "PUT", { userIds: [n2, f2] })).status, 200);
  check("nurse2 now sees the patient", (await pat(nurse2)).includes(code), true);
  check("family2 now sees the patient", (await pat(family2)).includes(code), true);
  check("nurse (not assigned) still does not", (await pat(nurse)).includes(code), false);

  console.log("# changing the prescription");
  check("nurse cannot", (await call(nurse, `/api/patients/${pid}/prescriptions`, "POST", { aid: "walker" })).status, 403);
  check("unknown aid is rejected", (await call(admin, `/api/patients/${pid}/prescriptions`, "POST", { aid: "jetpack" })).status, 400);
  check("same aid conflicts", (await call(admin, `/api/patients/${pid}/prescriptions`, "POST", { aid: "cane" })).status, 409);
  check("admin changes cane to walker", (await call(admin, `/api/patients/${pid}/prescriptions`, "POST", { aid: "walker" })).status, 201);
  const after = await (await admin(`/api/patients/${pid}`)).json();
  check("history keeps both, one open", [after.prescribedAid, after.prescriptions.length, after.prescriptions.filter((x) => x.validTo === null).length], ["walker", 2, 1]);
  const walker = await sendFull(code, "walker"), none = await sendFull(code, "none");
  check("walker matches the new prescription", [walker.status, walker.alert], [201, "info"]);
  check("no aid now raises a warning", [none.status, none.alert], [201, "warning"]);

  console.log("# editing and discharging");
  check("nurse cannot edit", (await call(nurse, `/api/patients/${pid}`, "PATCH", { age: "70" })).status, 403);
  check("admin edits age", (await call(admin, `/api/patients/${pid}`, "PATCH", { age: "70" })).status, 200);
  check("bad status is rejected", (await call(admin, `/api/patients/${pid}`, "PATCH", { status: "deleted" })).status, 400);
  check("empty update is rejected", (await call(admin, `/api/patients/${pid}`, "PATCH", {})).status, 400);
  check("age was changed", (await (await admin(`/api/patients/${pid}`)).json()).age, 70);
  check("admin discharges", (await call(admin, `/api/patients/${pid}`, "PATCH", { status: "discharged" })).status, 200);
  check("discharged patient leaves the active list", (await pat(admin)).includes(code), false);
  const gone = await sendFull(code, "none");
  check("discharged patient: event stored, no alert", [gone.status, gone.alert], [201, null]);
  check("history is kept after discharge", (await status(admin, `/api/patients/${pid}`)), 200);
  check("admin reactivates", (await call(admin, `/api/patients/${pid}`, "PATCH", { status: "active" })).status, 200);
  const back = await sendFull(code, "none");
  check("reactivated patient raises alerts again", [back.status, back.alert], [201, "warning"]);
} catch (e) {
  console.error(`Could not run the test against ${BASE}: ${e.cause?.code ?? e.message}`);
  process.exit(2);
}
console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll access checks passed");
process.exit(failed ? 1 : 0);
