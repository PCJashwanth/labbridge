import { test } from "node:test";
import assert from "node:assert/strict";
import { validateResult } from "../src/lib/validation.mjs";

const valid = {
  patientId: "p1", patientEmail: "a@b.com", providerId: "prov1",
  testType: "CBC", collectedAt: "2026-07-02T10:00:00.000Z",
  analytes: [{ code: "718-7", name: "Hemoglobin", value: 14, unit: "g/dL", refLow: 12, refHigh: 16 }],
};

test("accepts a valid result", () => {
  assert.equal(validateResult(valid).success, true);
});
test("rejects empty analytes", () => {
  assert.equal(validateResult({ ...valid, analytes: [] }).success, false);
});
test("rejects a malformed email", () => {
  assert.equal(validateResult({ ...valid, patientEmail: "not-an-email" }).success, false);
});
