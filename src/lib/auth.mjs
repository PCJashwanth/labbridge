import { createHmac, timingSafeEqual } from "node:crypto";

// Minimal, dependency-free HS256 JWT sign/verify. In production this would be
// replaced by a managed identity provider (Cognito) — see README/report.
const SECRET = process.env.JWT_SECRET || "";

const b64urlJson = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

export function sign(payload, { expiresInSec = 3600 } = {}) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const data = `${b64urlJson(header)}.${b64urlJson(body)}`;
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token) {
  const parts = (token || "").split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const [h, p, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("bad signature");
  const payload = JSON.parse(Buffer.from(p, "base64url").toString());
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) throw new Error("expired");
  return payload;
}
