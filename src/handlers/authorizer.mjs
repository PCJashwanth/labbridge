import { verifyToken } from "../lib/auth.mjs";

export const handler = async (event) => {
  try {
    const token = (event.authorizationToken || "").replace(/^Bearer\s+/i, "");
    const claims = verifyToken(token);
    return policy(claims.sub || "user", "Allow", apiWildcard(event.methodArn), {
      role: claims.role || "unknown",
      sub: claims.sub || "",
    });
  } catch {
    return policy("user", "Deny", event.methodArn);
  }
};

function apiWildcard(methodArn) {
  const parts = methodArn.split(":");
  const arnPrefix = parts.slice(0, 5).join(":");
  const [apiId, stage] = parts[5].split("/");
  return `${arnPrefix}:${apiId}/${stage}/*`;
}

function policy(principalId, effect, resource, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [{ Action: "execute-api:Invoke", Effect: effect, Resource: resource }],
    },
    context,
  };
}
