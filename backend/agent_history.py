from datetime import datetime, timezone

from botocore.exceptions import ClientError
from flask import jsonify

ACCOUNTS = {"T001", "T002", "T003", "T004", "T005"}


def save_agent_review(table, account_id, version, job_id, result, events):
    record = {
        "job_id": job_id,
        "packet_version": version,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "answer": result["answer"],
        "model_id": result["model_id"],
        "tool_trace": list(result.get("tool_trace", [])),
        "events": list(events),
    }

    for _ in range(3):
        current = table.get_item(
            Key={"account_id": account_id},
            ConsistentRead=True,
        ).get("Item")

        if not current or current.get("packet_version") != version:
            raise ValueError(
                "Packet changed. Refresh before running another AI review."
            )

        revision = int(current.get("ai_review_revision", 0))
        history = list(current.get("ai_review_history", []))
        history = (history + [record])[-10:]

        try:
            table.update_item(
                Key={"account_id": account_id},
                ConditionExpression=(
                    "packet_version = :version AND "
                    "(attribute_not_exists(ai_review_revision) OR "
                    "ai_review_revision = :previous)"
                ),
                UpdateExpression=(
                    "SET ai_review_history = :history, "
                    "ai_review_revision = :next"
                ),
                ExpressionAttributeValues={
                    ":version": version,
                    ":previous": revision,
                    ":next": revision + 1,
                    ":history": history,
                },
            )
            return record
        except ClientError as error:
            if error.response["Error"]["Code"] != \
                    "ConditionalCheckFailedException":
                raise

    raise ValueError("Review history changed. Refresh and try again.")


def register_agent_history_routes(app, table):
    @app.get("/api/accounts/<account_id>/agent-review-history")
    def agent_history(account_id):
        if account_id not in ACCOUNTS:
            return jsonify({"error": "Account not found."}), 404

        current = table.get_item(
            Key={"account_id": account_id},
            ConsistentRead=True,
        ).get("Item")

        if not current:
            return jsonify({"error": "Account not found."}), 404

        version = current.get("packet_version")
        history = [
            record for record in current.get("ai_review_history", [])
            if record.get("packet_version") == version
        ]
        return jsonify({
            "packet_version": version,
            "reviews": history,
        })
