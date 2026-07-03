import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const RESULTS_TABLE = process.env.RESULTS_TABLE;
export const AUDIT_TABLE = process.env.AUDIT_TABLE;

export async function putResult(item) {
  await doc.send(new PutCommand({ TableName: RESULTS_TABLE, Item: item }));
}

export async function updateNormalized(patientId, resultId, normalized) {
  await doc.send(new UpdateCommand({
    TableName: RESULTS_TABLE,
    Key: { patientId, resultId },
    UpdateExpression: "SET #s = :s, normalized = :n, abnormalCount = :c, normalizedAt = :t",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: {
      ":s": "NORMALIZED",
      ":n": normalized,
      ":c": normalized.abnormalCount,
      ":t": new Date().toISOString(),
    },
  }));
}

export async function queryByPatient(patientId) {
  const r = await doc.send(new QueryCommand({
    TableName: RESULTS_TABLE,
    KeyConditionExpression: "patientId = :p",
    ExpressionAttributeValues: { ":p": patientId },
  }));
  return r.Items ?? [];
}

export async function scanResults() {
  const r = await doc.send(new ScanCommand({ TableName: RESULTS_TABLE }));
  return r.Items ?? [];
}

// Append-only access/audit trail — a core Security-pillar control.
export async function writeAudit(patientId, actor, action, meta = {}) {
  await doc.send(new PutCommand({
    TableName: AUDIT_TABLE,
    Item: {
      patientId,
      timestamp: `${new Date().toISOString()}#${randomUUID().slice(0, 8)}`,
      actor, action, meta,
    },
  }));
}
