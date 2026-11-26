import type { Level, PatientState } from "../../data/types";
import type { AlertLevel, Status } from "../../components/ui";

export const levelName = (l: Level): AlertLevel => (l[0]!.toUpperCase() + l.slice(1)) as AlertLevel;

const stateStatus: Record<PatientState, Status> = { emergency: "Emergency", escalated: "Escalated", warning: "Warning", ok: "OK", no_data: "No data" };
export const stateName = (s: PatientState): Status => stateStatus[s];

/** The coloured bar on the left of an alert card. */
export const accent: Record<string, string> = {
  warning: "border-l-warning",
  escalated: "border-l-escalated",
  emergency: "border-l-emergency",
  info: "border-l-info",
};

/** A link that is also a 44 px target, as the Foundations page asks for every control. */
export const textLink = "inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline";
