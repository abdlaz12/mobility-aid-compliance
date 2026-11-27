import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { mockNow } from "./mock";
import type { PatientAdmin, ReidSample, Role, Settings, UserRow } from "./types";

export const AIDS = ["none", "cane", "crutches", "walker", "wheelchair"] as const;
export const ROOMS = ["R-201", "R-202", "R-203", "R-204", "R-205", "R-206"];
export const DEFAULT_SETTINGS: Settings = {
  identityConfidenceThreshold: 0.8, aidConfidenceThreshold: 0.6, cooldownMinutes: 10, ackTimeoutMinutes: 10,
  routing: { warning: ["nurse"], escalated: ["nurse", "family"], emergency: ["nurse", "family"] },
};

type Result = { ok: true } | { ok: false; error: string };
export type PatientInput = { code: string; name: string; initials: string; age: string; room: string; aid: string; consentBy: "patient" | "substitute" | "" };
export type Person = { id: number; name: string; email: string; role: Role; isActive: boolean };

const today = () => mockNow().toISOString().slice(0, 10);
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

const USERS: Person[] = [
  { id: 1, name: "Demo Admin", email: "admin@example.test", role: "admin", isActive: true },
  { id: 2, name: "Demo Nurse", email: "nurse@example.test", role: "nurse", isActive: true },
  { id: 3, name: "Demo Nurse 2", email: "nurse2@example.test", role: "nurse", isActive: true },
  { id: 4, name: "Demo Family", email: "family@example.test", role: "family", isActive: true },
  { id: 5, name: "Demo Family 2", email: "family2@example.test", role: "family", isActive: false },
];

const sample = (id: number, aid: string, isAssisted: boolean, createdAt: string): ReidSample => ({ id, aid, isAssisted, embeddingRef: `emb-${id}`, createdAt });
const SAMPLES: Record<number, ReidSample[]> = {
  1: [sample(1, "walker", false, "2026-11-10"), sample(2, "walker", true, "2026-11-10"), sample(3, "none", false, "2026-11-08")],
  2: [sample(4, "cane", false, "2026-11-09")],
};
const PATIENTS: PatientAdmin[] = [
  {
    id: 1, code: "P-0042", name: "Demo Patient A", initials: "DA", age: 79, status: "active", room: "R-204", prescribedAid: "walker",
    consent: { by: "patient", at: "2026-11-08" }, reid: { sampleCount: 3, lastAddedAt: "2026-11-10" },
    prescriptions: [{ aid: "walker", validFrom: "2026-09-14", validTo: null }, { aid: "cane", validFrom: "2026-04-02", validTo: "2026-09-13" }, { aid: "none", validFrom: "2026-01-01", validTo: "2026-04-01" }],
    contacts: [{ id: 2, type: "nurse", name: "Demo Nurse", email: "nurse@example.test" }, { id: 4, type: "family", name: "Demo Family", email: "family@example.test" }],
  },
  {
    id: 2, code: "P-0043", name: "Demo Patient B", initials: "DB", age: 84, status: "active", room: "R-205", prescribedAid: "cane",
    consent: { by: "substitute", at: "2026-11-09" }, reid: { sampleCount: 1, lastAddedAt: "2026-11-09" },
    prescriptions: [{ aid: "cane", validFrom: "2026-10-01", validTo: null }],
    contacts: [{ id: 2, type: "nurse", name: "Demo Nurse", email: "nurse@example.test" }, { id: 3, type: "nurse", name: "Demo Nurse 2", email: "nurse2@example.test" }, { id: 5, type: "family", name: "Demo Family 2", email: "family2@example.test" }],
  },
];

type Admin = {
  patients: PatientAdmin[];
  /** Known rooms and hallways. A new one is created by typing it (docs/decisions.md, 2026-11-14). */
  rooms: string[];
  patient: (id: number) => PatientAdmin | null;
  samples: (patientId: number) => ReidSample[];
  users: UserRow[];
  person: (id: number) => Person | null;
  settings: Settings;
  addPatient: (i: PatientInput) => Result & { id?: number };
  updatePatient: (id: number, d: { name: string; initials: string; age: string; room: string }) => Result;
  changePrescription: (id: number, aid: string) => Result;
  setCaregivers: (id: number, userIds: number[]) => Result;
  addSamples: (id: number, aid: string, assisted: boolean, count: number) => Result;
  deleteSample: (id: number, sampleId: number) => void;
  deleteAllSamples: (id: number) => void;
  withdrawConsent: (id: number) => void;
  recordConsent: (id: number, by: "patient" | "substitute") => void;
  discharge: (id: number) => void;
  reactivate: (id: number) => void;
  addUser: (i: { name: string; email: string; role: Role; password: string }) => Result & { id?: number };
  renameUser: (id: number, name: string) => Result;
  setActive: (id: number, active: boolean, actingId: number) => Result;
  resetPassword: (id: number) => string;
  saveSettings: (s: Settings) => void;
};

const Ctx = createContext<Admin | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState(PATIENTS);
  const [samples, setSamples] = useState(SAMPLES);
  const [people, setPeople] = useState(USERS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const patch = useCallback((id: number, f: (p: PatientAdmin) => PatientAdmin) => setPatients((all) => all.map((p) => (p.id === id ? f(p) : p))), []);
  const writeSamples = useCallback((id: number, next: ReidSample[]) => {
    setSamples((s) => ({ ...s, [id]: next }));
    patch(id, (p) => ({ ...p, reid: { sampleCount: next.length, lastAddedAt: next.map((x) => x.createdAt).sort().at(-1) ?? null } }));
  }, [patch]);

  const value = useMemo<Admin>(() => ({
    patients,
    rooms: [...new Set([...ROOMS, ...patients.flatMap((p) => (p.room ? [p.room] : []))])].sort(),
    patient: (id) => patients.find((p) => p.id === id) ?? null,
    samples: (id) => samples[id] ?? [],
    users: people.map((u) => ({ ...u, patientCount: u.role === "admin" ? patients.length : patients.filter((p) => p.contacts.some((c) => c.id === u.id)).length })),
    person: (id) => people.find((u) => u.id === id) ?? null,
    settings,
    addPatient: (i) => {
      const code = i.code.trim().toUpperCase();
      if (patients.some((p) => p.code === code)) return { ok: false, error: "This patient code is already in use." };
      const id = Math.max(0, ...patients.map((p) => p.id)) + 1;
      setPatients((all) => [...all, {
        id, code, name: i.name.trim(), initials: (i.initials.trim() || initialsOf(i.name)).toUpperCase(), age: i.age ? Number(i.age) : null, status: "active",
        room: i.room.trim().toUpperCase() || null, prescribedAid: i.aid, consent: i.consentBy ? { by: i.consentBy, at: today() } : null, reid: { sampleCount: 0, lastAddedAt: null },
        prescriptions: [{ aid: i.aid, validFrom: today(), validTo: null }], contacts: [],
      }]);
      return { ok: true, id };
    },
    updatePatient: (id, d) => { patch(id, (p) => ({ ...p, name: d.name.trim(), initials: d.initials.trim().toUpperCase() || initialsOf(d.name), age: d.age ? Number(d.age) : null, room: d.room.trim().toUpperCase() || p.room })); return { ok: true }; },
    changePrescription: (id, aid) => {
      const p = patients.find((x) => x.id === id);
      if (p?.prescribedAid === aid) return { ok: false, error: "That aid is already the current prescription." };
      patch(id, (x) => ({ ...x, prescribedAid: aid, prescriptions: [{ aid, validFrom: today(), validTo: null }, ...x.prescriptions.map((r) => (r.validTo === null ? { ...r, validTo: today() } : r))] }));
      return { ok: true };
    },
    setCaregivers: (id, userIds) => {
      const chosen = people.filter((u) => userIds.includes(u.id));
      if (chosen.some((u) => !u.isActive || u.role === "admin")) return { ok: false, error: "Only active nurses and family members can be assigned." };
      patch(id, (p) => ({ ...p, contacts: chosen.map((u) => ({ id: u.id, type: u.role as "nurse" | "family", name: u.name, email: u.email })) }));
      return { ok: true };
    },
    addSamples: (id, aid, assisted, count) => {
      const p = patients.find((x) => x.id === id);
      if (!p?.consent) return { ok: false, error: "Consent is required before calibration samples can be recorded." };
      if (count < 1) return { ok: false, error: "Choose at least one calibration sample." };
      const next = Math.max(0, ...Object.values(samples).flat().map((s) => s.id)) + 1;
      writeSamples(id, [...Array.from({ length: count }, (_, k) => sample(next + k, aid, assisted, today())), ...(samples[id] ?? [])]);
      return { ok: true };
    },
    deleteSample: (id, sampleId) => writeSamples(id, (samples[id] ?? []).filter((s) => s.id !== sampleId)),
    deleteAllSamples: (id) => writeSamples(id, []),
    // Section 7, and the backend does the same: withdrawing consent always deletes the biometric data.
    withdrawConsent: (id) => { patch(id, (p) => ({ ...p, consent: null })); writeSamples(id, []); },
    recordConsent: (id, by) => patch(id, (p) => ({ ...p, consent: { by, at: today() } })),
    // The backend deletes the samples on discharge as well; consent record and history stay.
    discharge: (id) => { patch(id, (p) => ({ ...p, status: "discharged" })); writeSamples(id, []); },
    reactivate: (id) => patch(id, (p) => ({ ...p, status: "active" })),
    addUser: (i) => {
      const email = i.email.trim().toLowerCase();
      if (people.some((u) => u.email === email)) return { ok: false, error: "An account with this email already exists." };
      const id = Math.max(0, ...people.map((u) => u.id)) + 1;
      setPeople((all) => [...all, { id, name: i.name.trim(), email, role: i.role, isActive: true }]);
      return { ok: true, id };
    },
    renameUser: (id, name) => { setPeople((all) => all.map((u) => (u.id === id ? { ...u, name: name.trim() } : u))); return { ok: true }; },
    setActive: (id, active, actingId) => {
      if (!active && id === actingId) return { ok: false, error: "You cannot deactivate your own account." };
      setPeople((all) => all.map((u) => (u.id === id ? { ...u, isActive: active } : u)));
      return { ok: true };
    },
    resetPassword: () => `temp-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`,
    saveSettings: setSettings,
  }), [patients, samples, people, settings, patch, writeSamples]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin(): Admin {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used inside AdminProvider");
  return v;
}
