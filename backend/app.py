import json
import os
from decimal import Decimal
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from flask import Flask, jsonify

from upload_api import register_upload_routes

app = Flask(__name__)
register_upload_routes(app)

FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN", "http://localhost:5173"
)
RESULTS = Path(__file__).parent / "results"
TABLE = boto3.resource(
    "dynamodb", region_name="us-east-1"
).Table("TransitionCopilotAccounts")


def json_number(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    raise TypeError("Unsupported JSON value")


def load_accounts():
    accounts = []

    # Read each supported demo account directly from DynamoDB.
    for account_id in ("T001", "T002", "T003"):
        item = TABLE.get_item(
            Key={"account_id": account_id},
            ConsistentRead=True,
        ).get("Item")

        if item is None:
            continue

        account = json.loads(json.dumps(item, default=json_number))
        summary_file = RESULTS / f"{account_id}-summary.json"

        if summary_file.exists():
            try:
                saved = json.loads(summary_file.read_text(encoding="utf-8"))
                if (
                    saved.get("account_id") == account_id
                    and saved.get("input_snapshot") == account
                ):
                    account["summary"] = saved["summary"]
                    account["summary_source"] = "bedrock"
            except (OSError, ValueError, KeyError):
                app.logger.warning("Could not read saved summary for %s", account_id)

        accounts.append(account)

    return "dynamodb", accounts


@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"] = FRONTEND_ORIGIN
    response.headers["Vary"] = "Origin"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.errorhandler(ClientError)
@app.errorhandler(BotoCoreError)
def aws_error(error):
    app.logger.error("AWS account-data request failed.")
    return jsonify({
        "error": "Could not load transition results from DynamoDB. "
                 "Check backend AWS permissions and retry."
    }), 503


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
        (item for item in items if item["account_id"] == account_id),
        None,
    )

    if match is None:
        return jsonify({"error": "Account not found"}), 404

    return jsonify({"mode": mode, "account": match})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)
