import { test } from "node:test";
import assert from "node:assert/strict";
process.env.JWT_SECRET = "test-secret";
const { sign, verifyToken } = await import("../src/lib/auth.mjs");

test("sign/verify roundtrip preserves claims", () => {
  const p = verifyToken(sign({ sub: "u1", role: "provider" }));
  assert.equal(p.sub, "u1");
  assert.equal(p.role, "provider");
});
test("a tampered token is rejected", () => {
  const t = sign({ sub: "u1" });
  assert.throws(() => verifyToken(t.slice(0, -2) + "xx"));
});
