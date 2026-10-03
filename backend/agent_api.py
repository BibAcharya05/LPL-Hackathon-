from agent_history import register_agent_history_routes, save_agent_review
import threading
import uuid
from datetime import datetime, timezone

from flask import jsonify, request

from live_agent import run_review

jobs = {}
lock = threading.Lock()
busy = False


def register_agent_routes(app, table):
    register_agent_history_routes(app, table)
    @app.post("/api/accounts/<account_id>/agent-review")
    def start_agent_review(account_id):
        global busy
        if account_id not in {"T001", "T002", "T003", "T004", "T005"}:
            return jsonify({"error": "Account not found."}), 404
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return jsonify({"error": "Send the current packet version."}), 400

        item = table.get_item(
            Key={"account_id": account_id}, ConsistentRead=True
        ).get("Item")
        version = body.get("packet_version")
        if not item:
            return jsonify({"error": "Account not found."}), 404
        if not isinstance(version, str) or not version or item.get("packet_version") != version:
            return jsonify({"error": "Packet changed. Refresh before running the agent."}), 409

        with lock:
            if busy:
                return jsonify({"error": "An AI review is already running. Try again shortly."}), 409
            if len(jobs) >= 50:
                for key in list(jobs):
                    if jobs[key]["status"] != "processing":
                        del jobs[key]
                        break
            busy = True
            job_id = uuid.uuid4().hex
            jobs[job_id] = {
                "job_id": job_id, "account_id": account_id,
                "packet_version": version, "status": "processing", "events": [],
            }

        def emit(service, status, message):
            with lock:
                jobs[job_id]["events"].append({
                    "service": service, "status": status, "message": message,
                    "time": datetime.now(timezone.utc).isoformat(),
                })

        def worker():
            global busy
            try:
                result = run_review(account_id, version, emit)
                with lock:
                    saved_events = list(jobs[job_id]["events"])
                record = save_agent_review(table, account_id, version,
                                           job_id, result, saved_events)
                result["saved_at"] = record["saved_at"]
                emit("Amazon DynamoDB", "complete",
                     "AI explanation saved for this packet version")

                with lock:
                    jobs[job_id].update(status="complete", **result)
            except Exception as error:
                if isinstance(error, ValueError):
                    message = str(error)
                else:
                    message = "AI review failed. Check backend AWS access and retry."
                with lock:
                    jobs[job_id].update(status="failed", error=message)
                code = getattr(error, "response", {}).get("Error", {}).get(
                    "Code", type(error).__name__
                )
                print(f"Agent job {job_id} failed ({code}).", flush=True)
            finally:
                with lock:
                    busy = False

        try:
            threading.Thread(target=worker, daemon=True).start()
        except Exception:
            with lock:
                busy = False
                jobs.pop(job_id, None)
            return jsonify({"error": "Could not start AI review."}), 503

        return jsonify({"job_id": job_id}), 202

    @app.get("/api/agent-reviews/<job_id>")
    def agent_review_status(job_id):
        with lock:
            job = jobs.get(job_id)
            snapshot = {
                **job, "events": list(job["events"])
            } if job else None
        if snapshot is None:
            return jsonify({"error": "Review job not found. Run the agent again."}), 404
        return jsonify(snapshot)
