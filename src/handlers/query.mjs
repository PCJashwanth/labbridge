import { queryByPatient, writeAudit } from "../lib/dynamo.mjs";

// GET /patients/{patientId}/results — a provider reads a patient's results.
// Every read is written to the audit trail before data is returned.
export const handler = async (event) => {
  const authorizer = event.requestContext?.authorizer || {};
  const actor = authorizer.sub || "provider";
  const patientId = event.pathParameters?.patientId;
  if (!patientId) return resp(400, { error: "patientId required" });

  const items = await queryByPatient(patientId);
  await writeAudit(patientId, actor, "QUERY", { count: items.length, role: authorizer.role });

  const results = items.map((i) => ({
    resultId: i.resultId,
    testType: i.testType,
    status: i.status,
    collectedAt: i.collectedAt,
    abnormalCount: i.abnormalCount ?? 0,
    normalized: i.normalized ?? null,
  }));
  return resp(200, { patientId, count: results.length, results });
};

function resp(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
