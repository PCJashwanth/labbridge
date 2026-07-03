import { createHash } from "node:crypto";

// Deterministic pseudonym: the same patient maps to a stable token across
// exports, but the real identifier cannot be recovered from the token.
export function pseudonym(patientId, salt) {
  return createHash("sha256").update(`${salt}:${patientId}`).digest("hex").slice(0, 16);
}

// Strips direct identifiers (HIPAA Safe-Harbor style) from a stored record,
// keeping only clinically useful, de-identified fields for analytics.
export function deidentify(record, salt) {
  const normalized = record.normalized ?? {};
  return {
    pseudoId: pseudonym(record.patientId, salt),
    testType: record.testType,
    collectedMonth: (record.collectedAt ?? "").slice(0, 7), // YYYY-MM, day dropped
    abnormalCount: normalized.abnormalCount ?? 0,
    analytes: (normalized.entry ?? []).map((e) => ({
      code: e.resource.code.coding[0].code,
      value: e.resource.valueQuantity.value,
      unit: e.resource.valueQuantity.unit,
      interpretation: e.resource.interpretation[0].coding[0].code,
    })),
  };
}
