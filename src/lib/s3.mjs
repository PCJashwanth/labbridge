import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
export const BUCKET = process.env.DOCUMENTS_BUCKET;

export async function putJson(key, obj) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(obj),
    ContentType: "application/json",
    ServerSideEncryption: "AES256",
  }));
}

export async function getJson(key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return JSON.parse(await r.Body.transformToString());
}
