from datetime import datetime, timezone

from botocore.exceptions import ClientError
from flask import jsonify, request

ACCOUNTS = {"T001", "T002", "T003", "T004", "T005"}


def register_review_routes(app, table):
    @app.post("/api/accounts/<account_id>/review")
    def save_review(account_id):
        if account_id not in ACCOUNTS:
            return jsonify({"error": "Account not found."}), 404

        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return jsonify({"error": "Send a JSON review."}), 400

        decision = body.get("decision")
        reviewer = body.get("reviewer_name")
        notes = body.get("review_notes", "")
        version = body.get("packet_version")
        revision = body.get("review_revision")

        if decision not in {"approved", "corrections_requested"}:
            return jsonify({"error": "Choose a valid review decision."}), 400

        if not isinstance(reviewer, str) or not 1 <= len(reviewer.strip()) <= 100:
            return jsonify({"error": "Enter a demo reviewer name, up to 100 characters."}), 400

        if not isinstance(notes, str) or len(notes) > 2000:
            return jsonify({"error": "Review notes must be under 2,000 characters."}), 400

        if decision == "corrections_requested" and not notes.strip():
            return jsonify({"error": "Explain which corrections are needed."}), 400

        if body.get("confirmed") is not True:
            return jsonify({"error": "Confirm that you reviewed the source documents."}), 400

        if (
            not isinstance(version, str)
            or not version
            or type(revision) is not int
            or revision < 0
        ):
            return jsonify({"error": "Refresh the account before reviewing."}), 409

        current = table.get_item(
            Key={"account_id": account_id},
            ConsistentRead=True,
        ).get("Item")

        if current is None:
            return jsonify({"error": "Account not found."}), 404

        if (
            current.get("packet_version") != version
            or current.get("review_revision", 0) != revision
        ):
            return jsonify({"error": "This packet or review changed. Refresh before deciding."}), 409

        if decision == "approved" and (
            current.get("status") != "Ready" or current.get("issues")
        ):
            return jsonify({"error": "Resolve findings and recheck before approval."}), 409

        now = datetime.now(timezone.utc).isoformat()
        entry = {
            "review_status": decision,
            "reviewer_name": reviewer.strip(),
            "review_notes": notes.strip(),
            "reviewed_at": now,
            "reviewed_packet_version": version,
        }

        names = {
            "#version": "packet_version",
            "#revision": "review_revision",
        }
        values = {
            ":version": version,
            ":revision": revision,
            ":next": revision + 1,
            ":decision": decision,
            ":name": entry["reviewer_name"],
            ":notes": entry["review_notes"],
            ":time": now,
            ":entry": [entry],
            ":empty": [],
        }
        condition = "#version = :version AND #revision = :revision"

        if decision == "approved":
            names["#status"] = "status"
            names["#issues"] = "issues"
            values[":ready"] = "Ready"
            condition += " AND #status = :ready AND #issues = :empty"

        try:
            table.update_item(
                Key={"account_id": account_id},
                ConditionExpression=condition,
                UpdateExpression=(
                    "SET review_status = :decision, reviewer_name = :name, "
                    "review_notes = :notes, reviewed_at = :time, "
                    "reviewed_packet_version = :version, #revision = :next, "
                    "review_history = list_append("
                    "if_not_exists(review_history, :empty), :entry)"
                ),
                ExpressionAttributeNames=names,
                ExpressionAttributeValues=values,
            )
        except ClientError as error:
            if error.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return jsonify({"error": "This packet or review changed. Refresh and try again."}), 409
            raise

        return jsonify({
            "review_status": decision,
            "message": (
                "Packet approved for the synthetic demo. No transfer has been submitted."
                if decision == "approved"
                else "Correction request saved."
            ),
        })
