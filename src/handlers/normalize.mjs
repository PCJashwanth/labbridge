import { getJson } from "../lib/s3.mjs";
import { updateNormalized, writeAudit } from "../lib/dynamo.mjs";
import { normalize } from "../lib/fhir.mjs";
import { notify } from "../lib/sns.mjs";

// SQS consumer. Normalizes each submitted result into a FHIR-like bundle,
// flags abnormal values, persists it, and notifies. Uses partial-batch
// responses so a single bad message is retried and ultimately sent to the DLQ
// without failing its healthy neighbours.
export const handler = async (event) => {
  const batchItemFailures = [];
  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body);
      const raw = await getJson(msg.s3Key);
      const bundle = normalize(raw);
      await updateNormalized(msg.patientId, msg.resultId, bundle);
      await writeAudit(msg.patientId, "system", "NORMALIZE", {
        resultId: msg.resultId, abnormalCount: bundle.abnormalCount,
      });
      // PHI-minimal notification: no clinical values in the message body.
      await notify(
        "Lab results ready",
        `A lab result (${msg.resultId}) is ready to view. Abnormal flags: ${bundle.abnormalCount}.`
      );
    } catch (err) {
      console.error("normalize failed", record.messageId, err);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
