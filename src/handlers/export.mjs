import { scanResults, writeAudit } from "../lib/dynamo.mjs";
import { putJson } from "../lib/s3.mjs";
import { deidentify } from "../lib/deidentify.mjs";

// Scheduled (EventBridge) nightly job: builds a de-identified dataset from all
// normalized results and writes it to S3 for downstream analytics/research.
const SALT = process.env.DEID_SALT || "labbridge-demo-salt";

export const handler = async () => {
  const items = await scanResults();
  const normalized = items.filter((i) => i.status === "NORMALIZED");
  const dataset = normalized.map((r) => deidentify(r, SALT));

  const date = new Date().toISOString().slice(0, 10);
  const key = `deidentified/${date}.json`;
  await putJson(key, { generatedAt: new Date().toISOString(), count: dataset.length, records: dataset });
  await writeAudit("SYSTEM", "system", "EXPORT", { key, count: dataset.length });

  return { exported: dataset.length, key };
};
