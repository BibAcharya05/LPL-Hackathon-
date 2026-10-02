import json
import os
from pathlib import Path

from flask import Flask, jsonify

app = Flask(__name__)

FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:5173",
)

ACCOUNTS = [
    {
        "account_id": "DEMO-001",
        "client_name": "Jordan Example",
        "account_type": "Traditional IRA",
        "status": "Flagged",
        "summary": "IRA packet requires signature, beneficiary, and address review.",
        "synthetic": True,
        "processing_status": "Complete",
        "issues": [
            {
                "code": "MISSING_SIGNATURE",
                "severity": "Missing Info",
                "message": "Client signature and signing date are missing.",
                "sources": [
                    {"document": "application.pdf", "page": 1}
                ],
                "action": "Obtain the client's signature and signing date.",
            },
            {
                "code": "ADDRESS_REVIEW",
                "severity": "Flagged",
                "message": "Residential and mailing addresses differ.",
                "sources": [
                    {
                        "document": "application.pdf",
                        "page": 1,
                        "value": "100 Demo Lane",
                    },
                    {
                        "document": "statement.pdf",
                        "page": 2,
                        "value": "200 Sample Street",
                    },
                ],
                "action": "Confirm whether the different addresses are intentional.",
            },
            {
                "code": "MISSING_BENEFICIARY",
                "severity": "Missing Info",
                "message": "Beneficiary details are missing under the demo checklist.",
                "sources": [
                    {"document": "application.pdf", "page": 1}
                ],
                "action": "Confirm and complete the beneficiary designation.",
            },
        ],
    }
]

def load_accounts():
    results = Path(__file__).parent / "results"
    result_file = results / "T002-checked.json"
    summary_file = results / "T002-summary.json"

    if not result_file.exists():
        return "mock", ACCOUNTS

    account = json.loads(result_file.read_text(encoding="utf-8"))

    if summary_file.exists():
        saved = json.loads(summary_file.read_text(encoding="utf-8"))

        # Only use the summary if its source results still match.
        if (
            saved.get("account_id") == account["account_id"]
            and saved.get("input_snapshot") == account
        ):
            account["summary"] = saved["summary"]
            account["summary_source"] = "bedrock"

    return "extracted", [account]

@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"] = FRONTEND_ORIGIN
    response.headers["Vary"] = "Origin"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
def health():
    mode, _ = load_accounts()
    return jsonify({"status": "ok", "mode": mode})


@app.get("/api/accounts")
def accounts():
    mode, items = load_accounts()
    return jsonify({"mode": mode, "accounts": items})


@app.get("/api/accounts/<account_id>")
def account(account_id):
    mode, items = load_accounts()
    match = next(
        (
            item
            for item in items
            if item["account_id"] == account_id
        ),
        None,
    )

    if match is None:
        return jsonify({"error": "Account not found"}), 404

    return jsonify({"mode": mode, "account": match})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)