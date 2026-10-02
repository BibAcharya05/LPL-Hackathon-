import json
import os
import subprocess
import sys
import tempfile
import threading
import uuid
from pathlib import Path

import boto3
from flask import jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"

BUCKET = "transition-copilot-bibek-demo-2026"

# Existing demo rules support these packet scenarios.
PACKETS = {"T001", "T002", "T003"}

ALLOWED_FILES = {
    "01_existing_account_statement.pdf",
    "02_new_account_application.pdf",
    "03_account_transfer_form.pdf",
    "04_investor_profile.pdf",
    "05_beneficiary_designation.pdf",
    "06_advisory_agreement.pdf",
}

MAX_FILE_BYTES = 5 * 1024 * 1024
jobs = {}
lock = threading.Lock()
busy = False


def process_upload(job_id, packet_id, files):
    global busy

    def update(**changes):
        with lock:
            jobs[job_id].update(changes)

    try:
        s3 = boto3.client("s3", region_name="us-east-1")

        # Each upload gets a fresh prefix so old documents do not
        # accidentally hide a missing-document finding.
        prefix = f"uploads/{job_id}/{packet_id}/"

        update(stage="Uploading to private S3")

        for filename, data in files:
            s3.put_object(
                Bucket=BUCKET,
                Key=prefix + filename,
                Body=data,
                ContentType="application/pdf",
                ServerSideEncryption="AES256",
            )

        with tempfile.TemporaryDirectory() as temporary:
            env = os.environ.copy()
            env.update({
                "PACKET_ID": packet_id,
                "S3_PREFIX": prefix,
                "RESULTS_DIR": temporary,
                "AWS_DEFAULT_REGION": "us-east-1",
            })

            def run_script(filename):
                subprocess.run(
                    [sys.executable, str(ROOT / filename)],
                    env=env,
                    check=True,
                    capture_output=True,
                    text=True,
                    timeout=1800,
                )

            update(stage="Extracting documents with Textract")
            run_script("extract_packet.py")

            update(stage="Running demo-policy checks")
            run_script("check_packet.py")

            RESULTS.mkdir(exist_ok=True)

            # Publish complete files atomically. The checked result is
            # published last because the dashboard reads it.
            for suffix in ("extracted", "checked"):
                source = Path(temporary) / f"{packet_id}-{suffix}.json"
                data = json.loads(source.read_text(encoding="utf-8"))

                if data.get(
                    "account_id", data.get("packet_id")
                ) != packet_id:
                    raise ValueError("Unexpected result account.")

                destination = RESULTS / source.name
                staging = RESULTS / f".{job_id}-{source.name}"
                staging.write_text(
                    json.dumps(data, indent=2),
                    encoding="utf-8",
                )
                staging.replace(destination)

        update(status="complete", stage="Complete")

    except Exception:
        # Keep SDK errors, document contents, and credentials out
        # of browser responses.
        update(
            status="failed",
            stage="Failed",
            error="Upload or processing failed. Check AWS permissions "
                  "and retry. Previously checked results were retained.",
        )
        print(f"Upload job {job_id} failed.", flush=True)

    finally:
        with lock:
            busy = False


def register_upload_routes(app):
    app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024

    @app.errorhandler(RequestEntityTooLarge)
    def upload_too_large(error):
        return jsonify({"error": "Total upload must be under 32 MB."}), 413

    @app.post("/api/uploads")
    def upload_documents():
        global busy

        packet_id = request.form.get("packet_id", "")
        if packet_id not in PACKETS:
            return jsonify({"error": "Choose T001, T002, or T003."}), 400

        if request.form.get("synthetic") != "true":
            return jsonify({"error": "Synthetic demo documents only."}), 400

        uploads = request.files.getlist("files")
        if not 1 <= len(uploads) <= 6:
            return jsonify({"error": "Select 1–6 PDF documents."}), 400

        files = []
        names = set()

        for upload in uploads:
            filename = upload.filename or ""

            if filename not in ALLOWED_FILES or filename in names:
                return jsonify({
                    "error": "Use the original demo PDF filenames, "
                             "without duplicates."
                }), 400

            data = upload.read(MAX_FILE_BYTES + 1)

            if len(data) > MAX_FILE_BYTES:
                return jsonify({"error": "Each PDF must be under 5 MB."}), 400

            if not data.startswith(b"%PDF-"):
                return jsonify({"error": f"{filename} is not a PDF."}), 400

            names.add(filename)
            files.append((filename, data))

        with lock:
            if busy:
                return jsonify({
                    "error": "Another upload is processing. Try again shortly."
                }), 409

            busy = True
            job_id = uuid.uuid4().hex
            jobs[job_id] = {
                "job_id": job_id,
                "account_id": packet_id,
                "status": "processing",
                "stage": "Queued",
            }

        worker = threading.Thread(
            target=process_upload,
            args=(job_id, packet_id, files),
            daemon=True,
        )

        try:
            worker.start()
        except Exception:
            with lock:
                busy = False
                jobs.pop(job_id, None)
            return jsonify({"error": "Could not start processing."}), 503

        return jsonify({"job_id": job_id}), 202

    @app.get("/api/uploads/<job_id>")
    def upload_status(job_id):
        with lock:
            job = jobs.get(job_id)
            snapshot = dict(job) if job else None

        if snapshot is None:
            return jsonify({"error": "Upload job not found."}), 404

        return jsonify(snapshot)