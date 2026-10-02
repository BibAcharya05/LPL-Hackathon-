# UPLOAD_ENV_SUPPORT
import os
PACKET_ID = os.environ.get("PACKET_ID", "T002")

import json
import time
from pathlib import Path

import boto3

REGION = "us-east-1"
BUCKET = "transition-copilot-bibek-demo-2026"
PREFIX = os.environ.get("S3_PREFIX", f"{PACKET_ID}/")

OUTPUT = Path(os.environ.get("RESULTS_DIR", str(Path(__file__).parent / "results")))
OUTPUT.mkdir(exist_ok=True)

s3 = boto3.client("s3", region_name=REGION)
textract = boto3.client("textract", region_name=REGION)


def extract_document(key):
    response = textract.start_document_analysis(
        DocumentLocation={
            "S3Object": {"Bucket": BUCKET, "Name": key}
        },
        FeatureTypes=["FORMS", "TABLES"],
    )
    job_id = response["JobId"]

    # Wait up to five minutes for this document.
    deadline = time.monotonic() + 300
    while time.monotonic() < deadline:
        result = textract.get_document_analysis(JobId=job_id)
        status = result["JobStatus"]

        if status == "SUCCEEDED":
            break
        if status in ("FAILED", "PARTIAL_SUCCESS"):
            raise RuntimeError(
                f"{key}: {status}. Job ID: {job_id}. "
                "Review this document before continuing."
            )
        time.sleep(3)
    else:
        raise TimeoutError(f"{key}: timed out. Job ID: {job_id}")

    # Collect every result page.
    blocks = list(result.get("Blocks", []))
    token = result.get("NextToken")
    while token:
        result = textract.get_document_analysis(
            JobId=job_id,
            NextToken=token,
        )
        blocks.extend(result.get("Blocks", []))
        token = result.get("NextToken")

    by_id = {block["Id"]: block for block in blocks}

    def child_text(block):
        words = []
        for relationship in block.get("Relationships", []):
            if relationship["Type"] == "CHILD":
                for child_id in relationship["Ids"]:
                    child = by_id.get(child_id, {})
                    if child.get("BlockType") == "WORD":
                        words.append(child.get("Text", ""))
                    elif child.get("BlockType") == "SELECTION_ELEMENT":
                        words.append(child.get("SelectionStatus", ""))
        return " ".join(words)

    lines = [
        {
            "text": block["Text"],
            "page": block.get("Page", 1),
            "confidence": block.get("Confidence"),
        }
        for block in blocks
        if block["BlockType"] == "LINE"
    ]

    fields = []
    for block in blocks:
        if (
            block["BlockType"] != "KEY_VALUE_SET"
            or "KEY" not in block.get("EntityTypes", [])
        ):
            continue

        values = []
        for relationship in block.get("Relationships", []):
            if relationship["Type"] == "VALUE":
                for value_id in relationship["Ids"]:
                    values.append(child_text(by_id.get(value_id, {})))

        fields.append({
            "label": child_text(block),
            "value": " ".join(values),
            "page": block.get("Page", 1),
            "confidence": block.get("Confidence"),
        })

    # Keep raw blocks for later table processing and troubleshooting.
    raw_file = OUTPUT / (Path(key).stem + "-raw.json")
    raw_file.write_text(
        json.dumps({"job_id": job_id, "blocks": blocks}, indent=2),
        encoding="utf-8",
    )

    return {
        "document": Path(key).name,
        "s3_key": key,
        "job_id": job_id,
        "lines": lines,
        "fields": fields,
    }


def main():
    keys = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix=PREFIX):
        keys.extend(
            item["Key"]
            for item in page.get("Contents", [])
            if item["Key"].lower().endswith(".pdf")
        )

    if not keys:
        raise RuntimeError("No PDFs found in the packet folder.")

    packet = {
        "packet_id": PACKET_ID,
        "synthetic": True,
        "documents": [],
    }

    for key in sorted(keys):
        print(f"Extracting {Path(key).name}...", flush=True)
        document = extract_document(key)
        packet["documents"].append(document)
        print(
            f"  Found {len(document['lines'])} lines "
            f"and {len(document['fields'])} fields.",
            flush=True,
        )

    output_file = OUTPUT / f"{PACKET_ID}-extracted.json"
    output_file.write_text(
        json.dumps(packet, indent=2),
        encoding="utf-8",
    )
    print(f"\nSaved complete packet to {output_file}")


if __name__ == "__main__":
    main()