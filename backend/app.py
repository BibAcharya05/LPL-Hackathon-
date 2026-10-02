import os
from flask import Flask, jsonify

app = Flask(__name__)

# Set this to the exact origin where the frontend runs.
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

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
                "action": "Obtain the client's signature and signing date."
            },
            {
                "code": "ADDRESS_REVIEW",
                "severity": "Flagged",
                "message": "Residential and mailing addresses differ.",
                "sources": [
                    {
                        "document": "application.pdf",
                        "page": 1,
                        "value": "100 Demo Lane"
                    },
                    {
                        "document": "statement.pdf",
                        "page": 2,
                        "value": "200 Sample Street"
                    }
                ],
                "action": "Confirm whether the different addresses are intentional."
            },
            {
                "code": "MISSING_BENEFICIARY",
                "severity": "Missing Info",
                "message": "Beneficiary details are missing under the demo checklist.",
                "sources": [
                    {"document": "application.pdf", "page": 1}
                ],
                "action": "Confirm and complete the beneficiary designation."
            }
        ]
    }
]

@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"] = FRONTEND_ORIGIN
    response.headers["Vary"] = "Origin"
    return response

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "mode": "mock"})

@app.get("/api/accounts")
def accounts():
    return jsonify({"mode": "mock", "accounts": ACCOUNTS})

@app.get("/api/accounts/<account_id>")
def account(account_id):
    match = next(
        (item for item in ACCOUNTS if item["account_id"] == account_id),
        None
    )
    if match is None:
        return jsonify({"error": "Account not found"}), 404
    return jsonify({"mode": "mock", "account": match})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)