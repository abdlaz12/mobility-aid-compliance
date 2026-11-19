// Compliance engine (FR3, FR4). evaluateDetection is a pure function so it can be tested
// without a database; processDetection (in detection-intake.ts) applies the result.

export type AlertLevel = "info" | "warning" | "escalated" | "emergency";

export type ComplianceInput = {
  eventType: "detection" | "fall_indication";
  /** The patient was matched in the database. */
  patientKnown: boolean;
  /** The patient is still admitted (not discharged). */
  patientActive: boolean;
  /** ReID returned a patient code (null = unknown person, staff or visitor). */
  identified: boolean;
  identityConfidence: number;
  aidLabel: string;
  aidConfidence: number;
  /** The detected aid label exists in the mobility_aids table. */
  aidKnown: boolean;
  /** Name of the patient's current prescribed aid, or null if none is set. */
  prescribedAid: string | null;
  /** An alert for this same episode of non-compliance was raised within the cooldown (FR3.3). */
  inCooldown: boolean;
};

export type ComplianceDecision = {
  needsReview: boolean;
  /** null = no alert is created. */
  alertLevel: AlertLevel | null;
  reason: string;
};

export type Thresholds = { identity: number; aid: number };

export function evaluateDetection(i: ComplianceInput, t: Thresholds): ComplianceDecision {
  // FR3.4: unrecognised people are excluded from compliance checking.
  if (!i.identified) {
    return { needsReview: false, alertLevel: null, reason: "unknown person, excluded" };
  }
  // A code the database does not know cannot be checked; a human should look.
  if (!i.patientKnown) {
    return { needsReview: true, alertLevel: null, reason: "patient code not in database" };
  }
  // A discharged patient is no longer monitored. The detection is still stored, history is kept.
  if (!i.patientActive) {
    return { needsReview: false, alertLevel: null, reason: "patient discharged" };
  }
  // FR4.3: a fall indication is an emergency for an identified patient.
  if (i.eventType === "fall_indication") {
    return { needsReview: false, alertLevel: "emergency", reason: "fall indication" };
  }
  // FR3.2: low confidence creates no alert and is flagged for review.
  if (i.identityConfidence < t.identity || i.aidConfidence < t.aid) {
    return { needsReview: true, alertLevel: null, reason: "low confidence" };
  }
  if (!i.aidKnown) {
    return { needsReview: true, alertLevel: null, reason: "unknown aid label" };
  }
  if (i.prescribedAid === null) {
    return { needsReview: true, alertLevel: null, reason: "no current prescription" };
  }
  // FR3.1, FR4.1, FR4.2
  if (i.aidLabel === i.prescribedAid) {
    return { needsReview: false, alertLevel: "info", reason: "aid matches prescription" };
  }
  // FR3.3: one warning per episode. A patient walking without the aid is detected again every moment.
  if (i.inCooldown) {
    return { needsReview: false, alertLevel: null, reason: "repeat within cooldown, alert suppressed" };
  }
  return {
    needsReview: false,
    alertLevel: "warning",
    reason: `detected ${i.aidLabel}, prescribed ${i.prescribedAid}`,
  };
}
