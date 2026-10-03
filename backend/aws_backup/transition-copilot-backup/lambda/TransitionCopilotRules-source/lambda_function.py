import contextlib
import io
import json
import os
import runpy
import tempfile
from decimal import Decimal
from pathlib import Path

import boto3

def lambda_handler(event, context):
    account_id = event.get("account_id")
    if account_id not in {"T001", "T002", "T003"}:
        raise ValueError("Unsupported demo account")

    bucket = os.environ["PACKET_BUCKET"]
    key = f"extracted/{account_id}.json"

    response = boto3.client("s3").get_object(Bucket=bucket, Key=key)
    packet = json.loads(response["Body"].read())

    if packet.get("packet_id") != account_id or packet.get("synthetic") is not True:
        raise ValueError("Packet identity or synthetic marker is invalid")

    names = ("PACKET_ID", "RESULTS_DIR")
    previous = {name: os.environ.get(name) for name in names}

    try:
        with tempfile.TemporaryDirectory() as directory:
            results = Path(directory)
            (results / f"{account_id}-extracted.json").write_text(
                json.dumps(packet), encoding="utf-8"
            )

            os.environ["PACKET_ID"] = account_id
            os.environ["RESULTS_DIR"] = directory

            # Reuse the same rules without logging document contents.
            with contextlib.redirect_stdout(io.StringIO()):
                runpy.run_path(
                    str(Path(__file__).with_name("check_packet.py")),
                    run_name="__main__",
                )

            checked_text = (
                results / f"{account_id}-checked.json"
            ).read_text(encoding="utf-8")

            checked = json.loads(checked_text)
            if checked.get("account_id") != account_id:
                raise ValueError("Checked account identity is invalid")

            # DynamoDB accepts Decimal rather than Python float.
            item = json.loads(checked_text, parse_float=Decimal)
            boto3.resource("dynamodb").Table(
                os.environ["TABLE_NAME"]
            ).put_item(Item=item)

            return {
                "account_id": account_id,
                "status": checked["status"],
                "issue_count": len(checked.get("issues", [])),
                "saved_to": os.environ["TABLE_NAME"],
            }
    finally:
        for name, value in previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value
