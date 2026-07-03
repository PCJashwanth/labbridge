// Transforms a validated lab result into a FHIR-like Observation bundle and
// flags each analyte against its reference range. No external dependencies so
// it is trivially unit-testable and cheap to run in a Lambda.

export function flagAnalyte(a) {
  if (a.refLow != null && a.value < a.refLow) return "L";  // low
  if (a.refHigh != null && a.value > a.refHigh) return "H"; // high
  return "N";                                               // normal
}

export function toObservation(a, subjectRef) {
  const interpretation = flagAnalyte(a);
  return {
    resourceType: "Observation",
    status: "final",
    code: { coding: [{ code: a.code, display: a.name }] },
    subject: { reference: subjectRef },
    valueQuantity: { value: a.value, unit: a.unit },
    referenceRange: [{ low: a.refLow ?? null, high: a.refHigh ?? null }],
    interpretation: [{ coding: [{ code: interpretation }] }],
  };
}

export function normalize(result) {
  const subjectRef = `Patient/${result.patientId}`;
  const observations = result.analytes.map((a) => toObservation(a, subjectRef));
  const abnormalFlags = observations
    .filter((o) => o.interpretation[0].coding[0].code !== "N")
    .map((o) => ({
      code: o.code.coding[0].code,
      name: o.code.coding[0].display,
      flag: o.interpretation[0].coding[0].code,
    }));
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: observations.map((o) => ({ resource: o })),
    abnormalFlags,
    abnormalCount: abnormalFlags.length,
  };
}
