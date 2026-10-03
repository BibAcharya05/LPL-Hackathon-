# Transition Copilot — Team 16

An AWS-powered hackathon prototype that helps advisors and transition specialists review account-transfer packets.

Transition Copilot extracts document evidence, applies deterministic checks, explains findings with AI, and records human review decisions. It uses synthetic documents and does not submit financial transfers.

## Features

- Document uploads for five synthetic account packets.
- Document extraction with page references and confidence values.
- Checks for missing documents, inconsistent fields, synthetic signature markers, and transaction indicators.
- Dashboard with account values, readiness, findings, and current-packet approvals.
- Specialist queue with transparent review priorities and migration-plan CSV export.
- Amazon Nova Micro summaries and a tool-using AI review assistant.
- Saved history of the latest ten AI reviews for the current packet version.
- Human approval and correction requests with packet-version checks.
- Responsive interface for desktops, tablets, and phones.

## Architecture

```text
React interface
      |
Flask backend coordinates processing
      |
      +--> Amazon S3: store uploaded PDFs
      +--> Amazon Textract: extract document evidence
      +--> Amazon S3: store extracted packet JSON
      +--> AWS Lambda: run deterministic checks
      |         |
      |         +--> Amazon DynamoDB: store checked account results
      |
      +--> Amazon Bedrock / Nova Micro: explain findings
      |
      +--> Amazon DynamoDB: read results and save review decisions
```

Flask coordinates the upload pipeline. Lambda runs the rule-checking portion; the prototype does not use an S3 event trigger to orchestrate the entire pipeline.

The AI review assistant uses Bedrock's Converse API with two application-executed tools:

- `get_packet`: retrieves extracted evidence from S3.
- `get_checked_results`: retrieves current findings from DynamoDB.

Rules determine readiness. AI explains evidence. A human records the review decision.

## Technology

| Component | Technology |
| --- | --- |
| Interface | React, TypeScript, Vite, CSS, Lucide icons |
| Backend | Python 3.11, Flask, Boto3 |
| Document storage | Amazon S3 |
| Document extraction | Amazon Textract |
| Rule execution | AWS Lambda |
| Account and review storage | Amazon DynamoDB |
| AI explanations | Amazon Bedrock, Amazon Nova Micro |
| AWS authorization | IAM permissions and execution roles |

## Repository Layout

```text
backend/
  app.py                 Flask API and frontend serving
  upload_api.py          Document intake and processing jobs
  extract_packet.py      Textract extraction
  check_packet.py        Document and field checks
  transaction_checks.py  Transaction review indicators
  lambda_function.py     Lambda entry point
  summarize_packet.py    Bedrock summaries
  review_api.py          Human review decisions
  agent_api.py           AI review endpoints
  live_agent.py          Tool-using review assistant
  agent_history.py       Current-packet AI review history
  bedrock_gate.py         Shared Bedrock request gate

frontend/figma-ui/        React application
infrastructure/          Supporting AWS deployment files
transition_copilot_synthetic_packages/
                         Synthetic PDFs and evaluation references
```

## Running the Application

### Prerequisites

- Python 3.11 and Node.js/npm.
- AWS credentials with access to the required resources.
- An S3 packet bucket, DynamoDB account table, and deployed rule-checking Lambda.
- Permission to invoke Textract and the configured Bedrock model.

This is an AWS-backed prototype. Cloning the repository alone does not create its AWS infrastructure or provide credentials.

### Backend

From the repository root:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install Flask boto3
```

If a dependency requirements file is supplied, install from that file to reproduce its pinned versions.

Configure AWS access through your AWS profile or environment credentials. Do not commit credentials.

### Build the Frontend

```bash
cd frontend/figma-ui
npm ci
npx tsc --noEmit
npm run build
cd ../..
```

The Flask application serves the generated frontend build.

### Start the Server

```bash
source backend/.venv/bin/activate
python backend/app.py
```

Open:

```text
http://127.0.0.1:8000/
```

In the workshop environment, use the provided port-8000 browser URL with a trailing slash. The workshop link is temporary and is not a permanent production deployment.

### Check Backend Connectivity

```bash
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/accounts
```

The health endpoint checks account-data access. It does not verify every AWS service in the pipeline.

## Demo AWS Resources

The workshop configuration uses:

| Resource | Value |
| --- | --- |
| Region | `us-east-1` |
| S3 bucket | `transition-copilot-bibek-demo-2026` |
| DynamoDB table | `TransitionCopilotAccounts` |
| Lambda function | `TransitionCopilotRules` |
| Bedrock model | `amazon.nova-micro-v1:0` |

These are workshop resource identifiers, not credentials. To run in another account, create equivalent resources and update the relevant configuration and resource references in the backend.

The Lambda requires its packet bucket and table settings, an appropriate IAM execution role, and the rule-checker deployment package.

## Synthetic Demo Accounts

| ID | Client | Checked readiness |
| --- | --- | --- |
| T001 | Jordan Kim | Ready |
| T002 | Priya Shah | Missing Info |
| T003 | Marcus Lee | Flagged |
| T004 | Elena Rodriguez | Flagged |
| T005 | Cameron Blake | Flagged |

Upload the available PDFs from the matching packet folder using their original filenames. The upload interface supports up to seven PDFs, including the optional transaction activity report.

Evaluation files such as `ground_truth.json` and `expected_detection.json` are reference answers for testing. They are not documents to upload or evidence to provide to the AI.

## Review Behavior

**Ready** means the implemented checks found no outstanding issues. **Approved** means a person recorded an approval for the current packet version.

Approval requires a Ready account with no findings. Correction requests require review notes.

A successfully reprocessed upload creates a new packet version and resets human approval to pending. Current review histories are replaced with the account record; they are not retained as a permanent history across uploads.

Conditional updates reject decisions made against stale packet versions or review revisions.

Reviewer names are self-reported in this demo. Authenticated reviewer sign-off is future work.

## Transaction Checks and Validation

The transaction checks identify newly added third-party destinations, returned-payment account-name mismatches, and rapid fund movement.

The rapid movement demo rule looks for an incoming ACH from a newly observed external originator followed by outgoing wires totaling at least 90% of that amount to at least two distinct newly added recipients within two calendar days.

For T005, it identifies $125,000 incoming followed by $119,500 outgoing to two recipients. The source contains dates rather than exact transaction timestamps, so this does not establish an exact 48-hour interval or prove fraud.

Testing against the five synthetic packets covered all ten seeded issue categories. Additional demo-checklist findings also appear. This is a small synthetic evaluation, not a real-world accuracy benchmark.

Negative-case tests covered movement outside the window, amounts below the threshold, one distinct recipient, and a previously known originator.

Frontend TypeScript checks and a production build were also completed.

## Safeguards and Prototype Limits

- Uploaded documents use private S3 storage and server-side encryption.
- AWS access depends on IAM permissions.
- The supported workflow requires synthetic demo packets.
- AI inputs are treated as untrusted document data.
- AI output does not change readiness or authorize transfers.
- Bedrock calls use a shared gate with at least approximately 1.1 seconds between requests on the same host and user.
- The gate does not coordinate unrelated machines or scripts.
- Upload and AI job tracking is held in server memory and does not survive a backend restart.
- AI review history retains the latest ten reviews for the current packet.
- Review priorities are a demo policy, not an official LPL risk score or fraud probability.
- Synthetic signature checks do not authenticate real signatures.
- This prototype does not claim production readiness or regulatory compliance.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| AWS permission or credential error | Verify credentials, expiration, region, and IAM permissions |
| Dashboard cannot load accounts | Verify the DynamoDB table and backend access |
| Backend changes are not reflected | Restart Flask |
| UI changes are not reflected | Rebuild the frontend and refresh the browser |
| Packet changed during review | Refresh the account before retrying |
| AI review fails | Check backend logs, Bedrock access, and packet consistency |
| Job disappears after restart | In-memory job tracking was lost; check results before retrying |
| Workshop API URL fails | Open the provided application URL with a trailing slash |

## Future Work

- Authenticated reviewer access and role-based authorization.
- Permanent review history across packet versions.
- Durable background processing and retry handling.
- Broader document formats and representative evaluation datasets.
- Production monitoring, security review, and deployment automation.
- Integration with specialist and advisor workflows.

## Team 16

Ashritha Kota, Bibek Acharya, Brenton Lian, Santosh Guntuku, and Ayomide Isinkaye.

Built for the LPL hackathon using synthetic demonstration data.
