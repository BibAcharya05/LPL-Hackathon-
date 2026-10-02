import json
from pathlib import Path

results_file = Path(__file__).parent / "results" / "application-textract.json"
data = json.loads(results_file.read_text())

if data.get("JobStatus") != "SUCCEEDED":
    raise SystemExit(f"Extraction is not complete: {data.get('JobStatus')}")

if data.get("NextToken"):
    raise SystemExit("Results have more pages. Retrieve them before continuing.")

blocks = data.get("Blocks", [])
by_id = {block["Id"]: block for block in blocks}


def child_text(block):
    parts = []
    for relationship in block.get("Relationships", []):
        if relationship["Type"] == "CHILD":
            for child_id in relationship["Ids"]:
                child = by_id.get(child_id, {})
                if child.get("BlockType") == "WORD":
                    parts.append(child.get("Text", ""))
                elif child.get("BlockType") == "SELECTION_ELEMENT":
                    parts.append(child.get("SelectionStatus", ""))
    return " ".join(parts)


print("DOCUMENT TEXT")
for block in blocks:
    if block["BlockType"] == "LINE":
        print(f"Page {block.get('Page', 1)}: {block['Text']}")

print("\nFORM FIELDS")
for block in blocks:
    if (
        block["BlockType"] == "KEY_VALUE_SET"
        and "KEY" in block.get("EntityTypes", [])
    ):
        values = []
        for relationship in block.get("Relationships", []):
            if relationship["Type"] == "VALUE":
                for value_id in relationship["Ids"]:
                    values.append(child_text(by_id.get(value_id, {})))

        print(
            f"Page {block.get('Page', 1)} | "
            f"{child_text(block)}: {' '.join(values) or '[blank]'}"
        )