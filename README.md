# LabBridge — Secure Serverless Clinical Lab-Results Exchange

CSCI 5411 Advanced Cloud Architecting — Term Project (Graduate Track)

LabBridge is a production-style, event-driven system for exchanging clinical lab
results securely. A **lab** submits a result over HTTPS; the system stores the raw
document encrypted, normalizes it into a FHIR-like shape, flags abnormal values,
and notifies the patient/provider. **Providers** query results through a separate
read path, and a nightly scheduled job publishes a **de-identified** dataset for
analytics. Every access is written to an append-only audit trail.

## Architecture summary

```
Client ──HTTPS──> API Gateway ──> Submit Lambda ──> S3 (encrypted raw doc)
                     │                   │
                     │                   └──> DynamoDB (metadata) + SQS (event)
                     │                                              │
                     │                                              v
                     │                      SQS ──> Normalize Lambda ──> Textract*/FHIR
                     │                                    │  writes DynamoDB
                     │                                    └──> SNS (results ready)
                     └──> Query Lambda ──> DynamoDB (audited read)

EventBridge (cron) ──> Export Lambda ──> de-identified dataset ──> S3
CloudWatch ── logs, metrics, X-Ray traces, DLQ alarm across all functions
```

*The optional AI enrichment (Amazon Comprehend Medical / Textract) is described in
the report as a production enhancement; it is commonly disabled in AWS Academy
Learner Lab, so the core pipeline does not depend on it.*

| Concern | Service |
| --- | --- |
| Compute | AWS Lambda (Node.js 20, arm64/Graviton) — Submit, Normalize, Query, Export, Authorizer |
| Application integration | Amazon API Gateway (REST, JWT token authorizer, throttling) |
| Messaging | Amazon SQS (+ dead-letter queue), Amazon SNS |
| Storage (object) | Amazon S3 (SSE, versioning, lifecycle tiering) |
| Storage (NoSQL) | Amazon DynamoDB (on-demand, PITR, SSE, GSI) |
| Scheduling | Amazon EventBridge (nightly export) |
| Monitoring / tracing | Amazon CloudWatch + AWS X-Ray |
| IaC | AWS SAM (CloudFormation) |
| CI/CD | GitHub Actions (test → staging on merge to main; production on version tag) |

## Well-Architected highlights

- **Security** — TLS in transit; SSE at rest on S3 and DynamoDB; JWT-authorized API;
  PHI separated from de-identified exports; append-only audit trail.
- **Reliability** — SQS buffering, partial-batch retries, a dead-letter queue with a
  CloudWatch alarm; DynamoDB point-in-time recovery (RPO ~5 min).
- **Performance Efficiency** — event-driven fan-out; on-demand DynamoDB; small esbuild
  bundles for low cold-start latency.
- **Cost Optimization** — pay-per-use Lambda/DynamoDB/SQS; arm64; S3 lifecycle tiering.
- **Operational Excellence** — full IaC, automated CI/CD, X-Ray tracing, structured logs.
- **Sustainability** — Graviton + lifecycle tiering reduce energy and stored-data footprint.

## Prerequisites

- Node.js 20+, AWS SAM CLI, AWS CLI
- AWS Academy Learner Lab session (or an AWS account). Note the **LabRole ARN** from
  the Learner Lab AWS Details panel — the stack attaches it as each Lambda's role.

## Deploy

```bash
npm ci                     # install dependencies
npm test                   # run unit tests

sam build
sam deploy --guided        # first time: set Stage, LabRoleArn, JwtSecret, NotificationEmail
# subsequent deploys:
sam deploy
```

The stack outputs the API base URL (`ApiUrl`) and resource names.

## Try it

```bash
# 1. mint a demo token (same secret you passed as JwtSecret)
export JWT_SECRET=your-secret
TOKEN=$(node scripts/mint-token.mjs provider demo-provider)

# 2. submit a result
curl -s -X POST "$API_URL/results" \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d @examples/sample-result.json

# 3. read it back (normalization takes a moment)
curl -s "$API_URL/patients/patient-001/results" -H "Authorization: Bearer $TOKEN"
```

## Testing

`npm test` runs the Node built-in test runner over the pure business logic
(FHIR normalization + abnormal flagging, de-identification, input validation, JWT
sign/verify). The same command runs in CI on every push.

## AWS Academy Learner Lab constraints (and production intent)

- **IAM** — Learner Lab forbids creating roles/policies, so every Lambda runs on the
  shared `LabRole`. In production each function would get its own least-privilege role
  scoped to exactly the table/bucket/queue it uses.
- **CI/CD credentials** — Learner Lab issues short-lived credentials, stored as GitHub
  Actions secrets and refreshed per session. In production, GitHub OIDC federation would
  remove stored keys entirely.
- **KMS / WAF / VPC endpoints** — often restricted in Learner Lab; documented in the
  report as production hardening (customer-managed keys, WAF on the API, private
  networking) rather than implemented here.

## AI-assisted development disclosure

Per the assignment, code was produced with AI-assisted tooling; the architecture,
design decisions, data model, and review are the author's own. Approximate
AI-generated proportion: __<fill in your honest estimate>__%.
