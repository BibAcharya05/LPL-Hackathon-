import json
from pathlib import Path

file = Path(__file__).parent / "results" / "T002-extracted.json"
packet = json.loads(file.read_text())

for document in packet["documents"]:
    print(f"\n--- {document['document']} ---")
    for field in document["fields"]:
        value = field["value"] or "[blank]"
        print(f"{field['label']}: {value}")