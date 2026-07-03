import { test } from "node:test";
import assert from "node:assert/strict";
import { pseudonym, deidentify } from "../src/lib/deidentify.mjs";

test("pseudonym is deterministic and hides the real id", () => {
  const a = pseudonym("patient-123", "salt");
  const b = pseudonym("patient-123", "salt");
  assert.equal(a, b);
  assert.ok(!a.includes("patient-123"));
});
test("deidentify strips direct identifiers", () => {
  const rec = {
    patientId: "patient-123",
    patientEmail: "jane@example.com",
    testType: "CBC",
    collectedAt: "2026-07-02T10:00:00.000Z",
    normalized: { abnormalCount: 1, entry: [{
      resource: {
        code: { coding: [{ code: "718-7" }] },
        valueQuantity: { value: 20, unit: "g/dL" },
        interpretation: [{ coding: [{ code: "H" }] }],
      },
    }] },
  };
  const out = deidentify(rec, "salt");
  const s = JSON.stringify(out);
  assert.ok(!s.includes("patient-123"));
  assert.ok(!s.includes("jane@example.com"));
  assert.equal(out.collectedMonth, "2026-07");
  assert.equal(out.analytes[0].interpretation, "H");
});
