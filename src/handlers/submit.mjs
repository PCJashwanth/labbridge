import { randomUUID } from "node:crypto";
import { validateResult } from "../lib/validation.mjs";
import { putResult, writeAudit } from "../lib/dynamo.mjs";
import { putJson } from "../lib/s3.mjs";
import { enqueue } from "../lib/sqs.mjs";

// POST /results  — a lab submits a new result.
// Stores the raw document (encrypted) in S3, metadata in DynamoDB, then hands
// off asynchronously via SQS so the caller gets a fast 202.
export const handler = async (event) => {
  const actor = event.requestContext?.authorizer?.sub || "lab";

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { error: "invalid JSON" }); }

  const parsed = validateResult(body);
  if (!parsed.success) {
    return resp(400, { error: "validation failed", details: parsed.error.issues });
  }

  const data = parsed.data;
  const resultId = randomUUID();
  const s3Key = `raw/${data.patientId}/${resultId}.json`;

  await putJson(s3Key, data);
  await putResult({
    patientId: data.patientId,
    resultId,
    providerId: data.providerId,
    patientEmail: data.patientEmail,
    testType: data.testType,
    collectedAt: data.collectedAt,
    status: "SUBMITTED",
    rawS3Key: s3Key,
    submittedAt: new Date().toISOString(),
  });
  await writeAudit(data.patientId, actor, "SUBMIT", { resultId, testType: data.testType });
  await enqueue({ patientId: data.patientId, resultId, s3Key });

  return resp(202, { resultId, status: "SUBMITTED" });
};

function resp(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
