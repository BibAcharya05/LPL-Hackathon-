Build the frontend here.

Backend endpoints:
- GET /api/health
- GET /api/accounts
- GET /api/accounts/DEMO-001

All current responses are mock data, not Textract or Bedrock output.

Initial screen:
- Account list
- Selected account summary and status
- Issue cards showing sources and suggested actions
- Document upload placeholder, labeled "Not connected"

Statuses:
- Ready: ready for human review
- Missing Info: required demo information is absent
- Flagged: an issue needs review; takes priority over Missing Info
- Submitted: simulated submission only

Processing status is separate from the account status.

Never put AWS credentials in frontend code.
