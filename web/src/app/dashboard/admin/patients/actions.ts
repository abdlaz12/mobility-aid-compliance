"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { createPatient, HttpError, requireUser, setContacts, setPrescription, updatePatient } from "@/lib/dal";
import { parseContacts, parseNewPatient, parsePatientUpdate, parsePrescription, type Result } from "@/lib/patient-input";

const fields = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));

/** Runs one admin operation. Authorisation is inside the dal functions; this only reports errors to the form. */
async function run<T>(parsed: Result<T>, op: (value: T) => Promise<unknown>, okMessage: string, path?: string): Promise<FormState> {
  if (!parsed.ok) return { error: parsed.error };
  try {
    await op(parsed.value);
  } catch (e) {
    if (e instanceof HttpError) return { error: e.message };
    throw e;
  }
  if (path) revalidatePath(path);
  return { ok: okMessage };
}

export async function createPatientAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseNewPatient(fields(fd));
  if (!parsed.ok) return { error: parsed.error };
  let id: number;
  try {
    id = (await createPatient(user, parsed.value)).id;
  } catch (e) {
    if (e instanceof HttpError) return { error: e.message };
    throw e;
  }
  revalidatePath("/dashboard/admin/patients");
  redirect(`/dashboard/admin/patients/${id}`); // redirect throws, so it stays outside the try block
}

const idOf = (fd: FormData) => Number(fd.get("patientId"));

export async function updateDetailsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { name, initials, age, room } = fields(fd);
  return run(parsePatientUpdate({ name, initials, age, room }), (v) => updatePatient(user, idOf(fd), v), "Details saved.", "/dashboard/admin/patients");
}

export async function setStatusAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const status = fields(fd).status;
  return run(parsePatientUpdate({ status }), (v) => updatePatient(user, idOf(fd), v),
    status === "discharged" ? "Patient discharged. History is kept." : "Patient is active again.", "/dashboard/admin/patients");
}

export async function setPrescriptionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  return run(parsePrescription(fields(fd)), (v) => setPrescription(user, idOf(fd), v.aid), "Prescription updated.", "/dashboard/admin/patients");
}

export async function setContactsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  return run(parseContacts({ userIds: fd.getAll("userIds") }), (v) => setContacts(user, idOf(fd), v.userIds), "Caregivers saved.", "/dashboard/admin/patients");
}
