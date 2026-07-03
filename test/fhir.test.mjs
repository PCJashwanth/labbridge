import { test } from "node:test";
import assert from "node:assert/strict";
import { flagAnalyte, normalize } from "../src/lib/fhir.mjs";

test("flags high values", () => {
  assert.equal(flagAnalyte({ value: 12, refLow: 4, refHigh: 10 }), "H");
});
test("flags low values", () => {
  assert.equal(flagAnalyte({ value: 2, refLow: 4, refHigh: 10 }), "L");
});
test("normal within range", () => {
  assert.equal(flagAnalyte({ value: 7, refLow: 4, refHigh: 10 }), "N");
});
test("normalize builds a FHIR-like bundle and counts abnormals", () => {
  const bundle = normalize({
    patientId: "p1",
    analytes: [
      { code: "718-7", name: "Hemoglobin", value: 20, unit: "g/dL", refLow: 12, refHigh: 16 },
      { code: "789-8", name: "RBC", value: 5, unit: "x10^6/uL", refLow: 4, refHigh: 6 },
    ],
  });
  assert.equal(bundle.resourceType, "Bundle");
  assert.equal(bundle.entry.length, 2);
  assert.equal(bundle.abnormalCount, 1);
  assert.equal(bundle.abnormalFlags[0].flag, "H");
});
