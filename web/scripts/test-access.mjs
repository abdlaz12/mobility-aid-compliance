#!/usr/bin/env node
// Access-control test against a RUNNING server with the seeded demo data (npm run dev or npm start).
// It creates its own fresh alerts through the intake API, then checks who may see and acknowledge what.
//   node scripts/test-access.mjs [baseUrl]        (env: INTAKE_API_KEY, default dev-only-change-me)
import { randomUUID } from "node:crypto";

const BASE = process.argv[2] ?? "http://localhost:3000";
const KEY = process.env.INTAKE_API_KEY ?? "dev-only-change-me";
const PASSWORD = "demo-password-1";
let failed = 0;
let total = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  total++;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `   got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
}

/** Tiny cookie jar: Auth.js login is a CSRF round trip. */
async function login(email, password = PASSWORD, ip) {
  const jar = new Map();
  const absorb = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar.set(kv.slice(0, i), kv.slice(i + 1)); } };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const r1 = await fetch(`${BASE}/api/auth/csrf`); absorb(r1);
  const { csrfToken } = await r1.json();
  const r2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookie(), ...(ip ? { "x-forwarded-for": ip } : {}) },
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
  // One warning per episode (cooldown), and a compliant sighting ends an episode: send one first.
  await send("P-0042", "walker"); await send("P-0043", "cane");
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
  await send("P-0042", "walker");
  check("an acknowledged alert closes when the patient is seen with the aid again", (await (await admin(`/api/alerts/${a42}`)).json()).status, "closed");
  check("a new episode is accepted", await send("P-0042", "none"), 201);
  const race = (await (await admin("/api/alerts?status=pending&level=warning")).json()).alerts.filter((a) => a.patient.code === "P-0042")[0].id;
  const results = (await Promise.all([ack(nurse, race), ack(admin, race)])).sort();
  check("simultaneous acknowledge: exactly one wins", results, [200, 409]);

  const stamp = Date.now().toString(36);
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
  await sendFull(code, "walker"); // a new episode (the earlier warning is still inside the cooldown)
  const back = await sendFull(code, "none");
  check("reactivated patient raises alerts again", [back.status, back.alert], [201, "warning"]);


  console.log("# consent and ReID enrolment (admin only, biometric references)");
  const reidPath = `/api/patients/${pid}/reid`;
  const sampleBody = (n, o = {}) => ({ embeddingRef: `reid/${code}/sample-${n}`, aid: "walker", isAssisted: false, ...o });
  const keyed = (path, key = KEY) => fetch(`${BASE}${path}`, key ? { headers: { Authorization: `Bearer ${key}` } } : {}).then(async (r) => ({ status: r.status, body: await r.json() }));
  check("anonymous cannot list samples", await status(anon, reidPath), 401);
  check("nurse cannot list samples", await status(nurse2, reidPath), 403);
  check("family cannot list samples", await status(family2, reidPath), 403);
  check("nurse cannot enrol", (await call(nurse2, reidPath, "POST", sampleBody(1))).status, 403);
  check("nurse cannot delete", await status(nurse2, reidPath, "DELETE"), 403);
  check("enrolling without consent on file is refused (409)", (await call(admin, reidPath, "POST", sampleBody(1))).status, 409);
  check("an unknown consent value is refused", (await call(admin, `/api/patients/${pid}`, "PATCH", { consent: "bogus" })).status, 400);
  check("nurse cannot record consent", (await call(nurse2, `/api/patients/${pid}`, "PATCH", { consent: "patient" })).status, 403);
  check("admin records consent from the substitute decision-maker", (await call(admin, `/api/patients/${pid}`, "PATCH", { consent: "substitute" })).status, 200);
  const withConsent = await (await admin(`/api/patients/${pid}`)).json();
  check("the patient page shows who consented", withConsent.consent.by, "substitute");
  for (const [name, o] of [["a path-like reference", { embeddingRef: "../../etc/passwd" }], ["a reference with spaces", { embeddingRef: "my sample" }], ["a very long reference", { embeddingRef: "x".repeat(300) }],
    ["an unknown aid state", { aid: "jetpack" }], ["a missing aid state", { aid: "" }], ["assisted as a number", { isAssisted: 3 }]]) {
    check(`${name} is refused`, (await call(admin, reidPath, "POST", sampleBody(9, o))).status, 400);
  }
  const first = await call(admin, reidPath, "POST", sampleBody(1, { aid: "none", isAssisted: true }));
  check("admin links an assisted sample recorded without the aid", first.status, 201);
  check("and a normal one", (await call(admin, reidPath, "POST", sampleBody(2))).status, 201);
  const listed = await (await admin(reidPath)).json();
  check("the list has both, with aid state and assisted flag", [listed.sampleCount, listed.samples.map((x) => [x.aid, x.isAssisted])], [2, [["none", true], ["walker", false]]]);
  check("the admin patient page counts them without listing references", [(await (await admin(`/api/patients/${pid}`)).json()).reid.sampleCount, JSON.stringify(await (await admin(`/api/patients/${pid}`)).json()).includes("embeddingRef")], [2, false]);
  const nurseView = JSON.stringify(await (await nurse2(`/api/patients/${pid}`)).json());
  check("an assigned nurse sees no consent or ReID data", [nurseView.includes("consent"), nurseView.includes("reid"), nurseView.includes("embeddingRef")], [false, false, false]);
  const famView = JSON.stringify(await (await family2(`/api/patients/${pid}`)).json());
  check("a family member sees no consent or ReID data", [famView.includes("consent"), famView.includes("reid"), famView.includes("embeddingRef")], [false, false, false]);
  const histText = JSON.stringify(await (await admin(`/api/patients/${pid}/history`)).json()) + JSON.stringify(await (await admin("/api/alerts")).json());
  check("references never appear in history or alerts, even for an admin", histText.includes("embeddingRef") || histText.includes("reid/"), false);

  const gallery = await keyed("/api/reid/gallery");
  check("the model service gets the gallery with its API key", [gallery.status, gallery.body.samples.filter((x) => x.patient_code === code).length], [200, 2]);
  check("the gallery needs the API key", (await keyed("/api/reid/gallery", "")).status, 401);
  check("a wrong key is refused", (await keyed("/api/reid/gallery", "not-the-key")).status, 401);
  check("a session cookie does not open the gallery", (await admin("/api/reid/gallery")).status, 401);
  const enrolByService = (body, key = KEY) => fetch(`${BASE}/api/reid/enrol`, { method: "POST", headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify(body) }).then((r) => r.status);
  check("the model service enrols a sample by patient code", await enrolByService({ patient_code: code, embeddingRef: "svc/1", aid: "walker", isAssisted: false }), 201);
  check("the gallery then lists it", (await keyed("/api/reid/gallery")).body.samples.some((x) => x.embedding_ref === "svc/1"), true);
  const svcSample = (await (await admin(reidPath)).json()).samples.find((x) => x.embeddingRef === "svc/1");
  check("the sample appears in the admin list", Boolean(svcSample), true);
  check("and is removed again so later checks start clean", await status(admin, `${reidPath}/${svcSample.id}`, "DELETE"), 200);
  check("enrolling by the service needs the API key", await enrolByService({ patient_code: code, embeddingRef: "svc/2", aid: "walker" }, ""), 401);
  check("a session cookie does not enrol", (await call(admin, "/api/reid/enrol", "POST", { patient_code: code, embeddingRef: "svc/3", aid: "walker" })).status, 401);
  check("an unknown patient code is a 404", await enrolByService({ patient_code: "NOPE-0000", embeddingRef: "svc/4", aid: "walker" }), 404);
  check("a missing patient code is a 400", await enrolByService({ embeddingRef: "svc/5", aid: "walker" }), 400);
  check("a path-like reference is refused for the service too", await enrolByService({ patient_code: code, embeddingRef: "../x", aid: "walker" }), 400);
  check("the service cannot enrol a patient without consent", await enrolByService({ patient_code: "P-0043", embeddingRef: "svc/6", aid: "cane" }) === 201 ? "accepted" : "refused", "refused");

  const sampleId = listed.samples[0].id;
  check("delete one sample", (await (await admin(`${reidPath}/${sampleId}`, { method: "DELETE" })).json()).deleted, 1);
  check("deleting it again is 404", await status(admin, `${reidPath}/${sampleId}`, "DELETE"), 404);
  check("a non-numeric sample id is 404", await status(admin, `${reidPath}/abc`, "DELETE"), 404);
  check("nurse cannot delete one sample", await status(nurse2, `${reidPath}/${listed.samples[1].id}`, "DELETE"), 403);
  check("one sample is left", (await (await admin(reidPath)).json()).sampleCount, 1);

  check("discharge deletes the embeddings (section 7)", (await call(admin, `/api/patients/${pid}`, "PATCH", { status: "discharged" })).status, 200);
  check("the gallery no longer offers the discharged patient", (await keyed("/api/reid/gallery")).body.samples.some((x) => x.patient_code === code), false);
  check("a discharged patient cannot be enrolled", (await call(admin, reidPath, "POST", sampleBody(3))).status, 409);
  check("or given consent", (await call(admin, `/api/patients/${pid}`, "PATCH", { consent: "patient" })).status, 409);
  check("reactivated, the patient's history and consent remain but the samples are gone", await (async () => {
    await call(admin, `/api/patients/${pid}`, "PATCH", { status: "active" });
    const d = await (await admin(`/api/patients/${pid}`)).json();
    return [d.consent.by, d.reid.sampleCount];
  })(), ["substitute", 0]);

  check("enrol again", (await call(admin, reidPath, "POST", sampleBody(4))).status, 201);
  check("withdrawing consent deletes the samples and clears the consent", await (async () => {
    const r = await call(admin, `/api/patients/${pid}`, "PATCH", { consent: "withdrawn" });
    const d = await (await admin(`/api/patients/${pid}`)).json();
    return [r.status, d.consent, d.reid.sampleCount];
  })(), [200, null, 0]);
  check("enrolling after withdrawal needs fresh consent", (await call(admin, reidPath, "POST", sampleBody(5))).status, 409);
  check("a patient can be registered with consent", await (async () => {
    const r = await call(admin, "/api/patients", "POST", { code: `C-${stamp}`, name: "Consent Test", aid: "cane", consent: "patient" });
    const id = (await r.json()).patient?.id;
    return [r.status, (await (await admin(`/api/patients/${id}`)).json()).consent?.by];
  })(), [201, "patient"]);
  check("an invalid consent at registration is refused", (await call(admin, "/api/patients", "POST", { code: `D-${stamp}`, name: "X", aid: "cane", consent: "withdrawn" })).status, 400);

  console.log("# who a notification went to, and rooms");
  const detailFor = async (g) => (await g(`/api/alerts/${a42}`)).json();
  const adminNotes = (await detailFor(admin)).notifications;
  check("the care team sees who each notification went to", adminNotes.length > 0 && adminNotes.every((n) => typeof n.recipient?.name === "string" && ["nurse", "family"].includes(n.recipient.role)), true);
  check("family sees that messages went out but not to whom", (await detailFor(family)).notifications.some((n) => "recipient" in n), false);
  check("family sees no other person's name in the alert", JSON.stringify(await detailFor(family)).includes("Demo Nurse"), false);
  const rooms = await admin("/api/rooms");
  check("admin lists the rooms", [rooms.status, (await rooms.json()).some((r) => r.name === "R-204")], [200, true]);
  check("a nurse may not list rooms", await status(nurse, "/api/rooms"), 403);
  check("family may not list rooms", await status(family, "/api/rooms"), 403);
  check("no session, no rooms", (await fetch(`${BASE}/api/rooms`)).status, 401);

  console.log("# history of one patient");
  const p42 = (await (await admin("/api/patients")).json()).patients.find((p) => p.code === "P-0042").id;
  const hist = (g, id = p42) => status(g, `/api/patients/${id}/history`);
  check("anonymous", await hist(anon), 401);
  check("admin", await hist(admin), 200);
  check("assigned nurse", await hist(nurse), 200);
  check("own family member", await hist(family), 200);
  check("nurse not assigned (nurse2, P-0042)", await hist(nurse2), 403);
  check("family of another patient", await hist(family2), 403);
  check("missing patient", await hist(admin, 99999999), 404);
  check("non-numeric id", await hist(admin, "abc"), 404);
  const famHist = await (await family(`/api/patients/${p42}/history`)).json();
  check("family: no raw detections, no Info log", [famHist.detections.length, famHist.alerts.some((a) => a.level === "info")], [0, false]);
  const nurseHist = await (await nurse(`/api/patients/${p42}/history`)).json();
  check("nurse sees detections and alerts", [nurseHist.detections.length > 0, nurseHist.alerts.length > 0], [true, true]);

  console.log("# managing users (admin only)");
  const email = `t${stamp}@example.test`, pw1 = "correct horse battery", pw2 = "another long passphrase", pw3 = "third long passphrase!";
  const newUser = { name: "Test Nurse", email, role: "nurse", password: pw1 };
  check("anonymous cannot list users", await status(anon, "/api/users"), 401);
  check("nurse cannot list users", await status(nurse, "/api/users"), 403);
  check("family cannot create users", (await call(family, "/api/users", "POST", newUser)).status, 403);
  check("bad email is rejected", (await call(admin, "/api/users", "POST", { ...newUser, email: "nope" })).status, 400);
  check("short password is rejected", (await call(admin, "/api/users", "POST", { ...newUser, password: "short" })).status, 400);
  check("unknown role is rejected", (await call(admin, "/api/users", "POST", { ...newUser, role: "superuser" })).status, 400);
  const made = await call(admin, "/api/users", "POST", newUser);
  check("admin creates a user", made.status, 201);
  const madeUser = (await made.json()).user;
  check("duplicate email conflicts", (await call(admin, "/api/users", "POST", newUser)).status, 409);
  const listText = await (await admin("/api/users")).text();
  check("the list never contains password hashes", [listText.includes("passwordHash"), listText.includes("scrypt:")], [false, false]);
  check("nurse cannot read a user", await status(nurse, `/api/users/${madeUser.id}`), 403);
  const tu = await login(email, pw1);
  check("the new user can sign in", await status(tu, "/api/patients"), 200);
  check("and sees no patients until assigned", await pat(tu), []);
  check("admin renames the user", (await call(admin, `/api/users/${madeUser.id}`, "PATCH", { name: "Renamed" })).status, 200);
  check("the role cannot be changed", (await call(admin, `/api/users/${madeUser.id}`, "PATCH", { role: "admin" })).status, 400);
  const adminId = (await (await admin("/api/users")).json()).users.find((u) => u.email === "admin@example.test").id;
  check("an admin cannot deactivate themselves", (await call(admin, `/api/users/${adminId}`, "PATCH", { isActive: false })).status, 409);
  check("deactivate the new user", (await call(admin, `/api/users/${madeUser.id}`, "PATCH", { isActive: false })).status, 200);
  check("their open session stops working at once", await status(tu, "/api/patients"), 401);
  check("they cannot sign in again", await status(await login(email, pw1), "/api/patients"), 401);
  check("reactivate", (await call(admin, `/api/users/${madeUser.id}`, "PATCH", { isActive: true })).status, 200);
  check("nurse cannot reset a password", (await call(nurse, `/api/users/${madeUser.id}/password`, "POST", { password: pw2 })).status, 403);
  check("short reset password is rejected", (await call(admin, `/api/users/${madeUser.id}/password`, "POST", { password: "short" })).status, 400);
  check("admin resets the password", (await call(admin, `/api/users/${madeUser.id}/password`, "POST", { password: pw2 })).status, 200);
  check("the old password no longer works", await status(await login(email, pw1), "/api/patients"), 401);
  check("the new one works", await status(await login(email, pw2), "/api/patients"), 200);

  console.log("# own account");
  const me = await login(email, pw2);
  check("anonymous cannot change a password", (await anon("/api/account/password", { method: "POST", ...body({ currentPassword: pw2, newPassword: pw3 }) })).status, 401);
  check("wrong current password", (await call(me, "/api/account/password", "POST", { currentPassword: "not my password", newPassword: pw3 })).status, 400);
  check("new password equal to the old one", (await call(me, "/api/account/password", "POST", { currentPassword: pw2, newPassword: pw2 })).status, 400);
  check("new password too short", (await call(me, "/api/account/password", "POST", { currentPassword: pw2, newPassword: "short" })).status, 400);
  check("change the password", (await call(me, "/api/account/password", "POST", { currentPassword: pw2, newPassword: pw3 })).status, 200);
  check("the old password stops working", await status(await login(email, pw2), "/api/patients"), 401);
  check("the new password works", await status(await login(email, pw3), "/api/patients"), 200);
  check("pushover: bad key", (await call(me, "/api/account/pushover", "PUT", { key: "short" })).status, 400);
  const key = "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5";
  check("pushover: valid key", await (await call(me, "/api/account/pushover", "PUT", { key })).json(), { configured: true });
  check("the key never appears in the user list", (await (await admin("/api/users")).text()).includes(key), false);
  check("pushover: clear the key", await (await call(me, "/api/account/pushover", "PUT", { key: "" })).json(), { configured: false });
  check("anonymous cannot set a key", (await anon("/api/account/pushover", { method: "PUT", ...body({ key }) })).status, 401);
  let last = 0;
  for (let i = 0; i < 5; i++) last = (await call(me, "/api/account/password", "POST", { currentPassword: "guess " + i + " guess", newPassword: pw2 })).status;
  check("five wrong current passwords are answered normally", last, 400);
  check("then even the right one is refused for a while", (await call(me, "/api/account/password", "POST", { currentPassword: pw3, newPassword: pw2 })).status, 429);

  console.log("# login lock-out");
  const lockEmail = `l${stamp}@example.test`, lockPw = "lock test passphrase";
  check("create a throwaway user", (await call(admin, "/api/users", "POST", { name: "Lock Test", email: lockEmail, role: "family", password: lockPw })).status, 201);
  const fakeIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  for (let i = 0; i < 5; i++) await login(lockEmail, "wrong password " + i, fakeIp());
  check("after 5 wrong passwords even the right one is refused", await status(await login(lockEmail, lockPw, fakeIp()), "/api/patients"), 401);
  check("other accounts are not affected", await status(await login("admin@example.test"), "/api/patients"), 200);
  const unknownEmail = `nobody${stamp}@example.test`;
  for (let i = 0; i < 6; i++) await login(unknownEmail, "wrong password " + i, fakeIp());
  check("unknown emails lock too, so the lock does not reveal which accounts exist", await status(await login(unknownEmail, "whatever long password", fakeIp()), "/api/patients"), 401);
  const lockedId = (await (await admin("/api/users")).json()).users.find((u) => u.email === lockEmail).id;
  check("an admin password reset lifts the lock", (await call(admin, `/api/users/${lockedId}/password`, "POST", { password: "fresh long passphrase" })).status, 200);
  check("and the user can sign in again", await status(await login(lockEmail, "fresh long passphrase", fakeIp()), "/api/patients"), 200);

  const goodEvent = () => ({
    event_id: randomUUID(), timestamp: new Date().toISOString(), room_id: "R-204", person_track_id: "t-1",
    identity: { patient_id: "P-0042", confidence: 0.95 }, aid: { label: "walker", confidence: 0.95 }, event_type: "detection",
  });

  console.log("# settings (admin only)");
  check("anonymous cannot read settings", await status(anon, "/api/settings"), 401);
  check("nurse cannot read settings", await status(nurse, "/api/settings"), 403);
  check("family cannot change settings", (await call(family, "/api/settings", "PUT", { cooldownMinutes: 1 })).status, 403);
  check("nurse cannot reset settings", await status(nurse, "/api/settings", "DELETE"), 403);
  try {
    const base = await (await admin("/api/settings")).json();
    check("defaults follow the proposal (cooldown 10, identity threshold 0.8)", [base.defaults.cooldownMinutes, base.defaults.identityConfidenceThreshold], [10, 0.8]);
    for (const [name, o] of [["negative cooldown", { cooldownMinutes: -1 }], ["cooldown as a string", { cooldownMinutes: "5" }], ["threshold above 1", { identityConfidenceThreshold: 1.5 }],
      ["unknown setting", { nonsense: 1 }], ["empty update", {}], ["routing without a recipient for emergencies", { routing: { warning: ["nurse"], escalated: ["nurse"], emergency: [] } }],
      ["routing with an unknown role", { routing: { warning: ["admin"], escalated: ["nurse"], emergency: ["nurse"] } }]]) {
      check(`${name} is refused`, (await call(admin, "/api/settings", "PUT", o)).status, 400);
    }
    check("refused updates changed nothing", (await (await admin("/api/settings")).json()).changed.length, 0);
    const changed = await call(admin, "/api/settings", "PUT", { identityConfidenceThreshold: 0.99, cooldownMinutes: 3 });
    const after = await changed.json();
    check("admin changes two settings", [changed.status, after.settings.identityConfidenceThreshold, after.settings.cooldownMinutes], [200, 0.99, 3]);
    check("the response lists what was changed", after.changed, ["cooldownMinutes", "identityConfidenceThreshold"]);
    const strict = await (await fetch(`${BASE}/api/detections`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify(goodEvent()) })).json();
    check("the new threshold applies to the next detection (0.95 is now too low)", [strict.needs_review, strict.alert_level], [true, null]);
    check("routing can be changed", (await call(admin, "/api/settings", "PUT", { routing: { warning: ["nurse", "family"], escalated: ["nurse", "family"], emergency: ["nurse", "family"] } })).status, 200);
    check("and is stored as sent", (await (await admin("/api/settings")).json()).settings.routing.warning, ["nurse", "family"]);
    check("resetting an unknown key is refused", await status(admin, "/api/settings?keys=nope", "DELETE"), 400);
    const partial = await (await admin("/api/settings?keys=identityConfidenceThreshold", { method: "DELETE" })).json();
    check("resetting one key leaves the others", partial.changed, ["cooldownMinutes", "routing"]);
    check("the threshold is back to what it was before (the environment or the default)", partial.settings.identityConfidenceThreshold, base.settings.identityConfidenceThreshold);
  } finally {
    check("reset all settings (always, so other tests are unaffected)", await status(admin, "/api/settings", "DELETE"), 200);
  }
  console.log("# latency metrics (admin only)");
  check("anonymous cannot read the metrics", await status(anon, "/api/metrics/latency"), 401);
  check("nurse cannot read the metrics", await status(nurse, "/api/metrics/latency"), 403);
  const lat = await (await admin("/api/metrics/latency")).json();
  check("admin gets counts and the 5 s target", [typeof lat.count, lat.targetMs, typeof lat.generatedAt], ["number", 5000, "string"]);
  check("the notifications so far were sent well within the target", lat.count > 0 && lat.p95Ms < 5000, true);
  check("a bad 'since' is refused", await status(admin, "/api/metrics/latency?since=yesterday"), 400);
  check("a bad 'limit' is refused", await status(admin, "/api/metrics/latency?limit=-5"), 400);
  check("a future 'since' gives an empty summary", (await (await admin(`/api/metrics/latency?since=${encodeURIComponent(new Date(Date.now() + 3600_000).toISOString())}`)).json()).count, 0);

  console.log("# intake input hardening");
  const raw = (text, extra = {}) => fetch(`${BASE}/api/detections`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, ...extra }, body: text }).then((r) => r.status);
  const post = (o) => raw(JSON.stringify({ ...goodEvent(), ...o }));
  check("a normal event is accepted", await post({}), 201);
  check("a 20 KiB body is refused (413)", await raw(JSON.stringify({ ...goodEvent(), model_version: "x".repeat(20 * 1024) })), 413);
  check("a long room_id is refused", await post({ room_id: "R".repeat(33) }), 400);
  check("a long aid label is refused", await post({ aid: { label: "x".repeat(33), confidence: 0.9 } }), 400);
  check("an empty room_id is refused", await post({ room_id: "" }), 400);
  check("a timestamp from the future is refused", await post({ timestamp: new Date(Date.now() + 3600_000).toISOString() }), 400);
  check("a recorded replay in the past is accepted", await post({ timestamp: "2026-01-02T03:04:05Z" }), 201);
  check("confidence as a string is refused", await post({ aid: { label: "walker", confidence: "0.9" } }), 400);
  check("confidence above 1 is refused", await post({ identity: { patient_id: "P-0042", confidence: 1.5 } }), 400);
  check("an unknown extra field is refused", await post({ surprise: 1 }), 400);
  for (const [name, text] of [["an array", "[]"], ["null", "null"], ["a string", '"x"'], ["a number", "7"], ["broken JSON", "{oops"], ["an empty body", ""]]) {
    check(`${name} as the body is refused`, await raw(text), 400);
  }
  const injection = await fetch(`${BASE}/api/detections`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ ...goodEvent(), identity: { patient_id: "' OR '1'='1", confidence: 0.9 } }) });
  const injected = await injection.json();
  check("an SQL-looking patient code is just an unknown code (stored, flagged for review)", [injection.status, injected.needs_review, injected.alert_level], [201, true, null]);
  check("and the database is intact", (await pat(admin)).length >= 2, true);
} catch (e) {
  console.error(`Could not run the test against ${BASE}: ${e.cause?.code ?? e.message}`);
  process.exit(2);
}
console.log(failed ? `\n${failed} of ${total} check(s) FAILED` : `\nAll ${total} access checks passed`);
process.exit(failed ? 1 : 0);
