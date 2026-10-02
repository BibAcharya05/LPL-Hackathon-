import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

RESULTS = Path(__file__).parent / "results"
packet = json.loads(
    (RESULTS / "T002-extracted.json").read_text(encoding="utf-8")
)

# Demo policy only; not official LPL requirements.
REQUIRED_DOCUMENTS = {
    "01_existing_account_statement.pdf": "Account statement",
    "02_new_account_application.pdf": "Account application",
    "03_account_transfer_form.pdf": "Transfer form",
    "04_investor_profile.pdf": "Investor profile",
    "05_beneficiary_designation.pdf": "Beneficiary designation",
    "06_advisory_agreement.pdf": "Advisory agreement",
}

documents = {doc["document"]: doc for doc in packet["documents"]}
issues = []
observations = []

STATEMENT = "01_existing_account_statement.pdf"
APPLICATION = "02_new_account_application.pdf"
TRANSFER = "03_account_transfer_form.pdf"
PROFILE = "04_investor_profile.pdf"
AGREEMENT = "06_advisory_agreement.pdf"


def normalize(value):
    return " ".join(value.split()).casefold()


def lookup(filename, label):
    """Keep duplicate extracted fields instead of overwriting them."""
    doc = documents.get(filename, {})
    return [
        {
            "document": filename,
            "page": field.get("page", 1),
            "label": field["label"],
            "value": field["value"].strip(),
            "confidence": field.get("confidence"),
        }
        for field in doc.get("fields", [])
        if normalize(field["label"]) == normalize(label)
    ]


def add_issue(code, severity, message, sources, action, **extra):
    issues.append({
        "code": code,
        "severity": severity,
        "message": message,
        "sources": sources,
        "action": action,
        **extra,
    })


# 1. Document completeness
for filename, label in REQUIRED_DOCUMENTS.items():
    if filename not in documents:
        add_issue(
            "MISSING_DOCUMENT",
            "Missing Info",
            f"{label} is missing under the demo checklist.",
            [],
            f"Obtain and upload the {label.lower()}.",
            expected_document=filename,
        )


# 2. Cross-document comparisons
comparisons = {
    "client_name": [
        (filename, "Client Name")
        for filename in (STATEMENT, APPLICATION, TRANSFER, PROFILE, AGREEMENT)
    ],
    "mailing_address": [
        (STATEMENT, "Mailing Address"),
        (APPLICATION, "Mailing Address"),
    ],
    "account_type": [
        (STATEMENT, "Account Type"),
        (APPLICATION, "Requested Account Type"),
        (TRANSFER, "Account Type"),
    ],
    "risk_tolerance": [
        (APPLICATION, "Risk Tolerance"),
        (PROFILE, "Risk Tolerance"),
    ],
    "investment_objective": [
        (APPLICATION, "Investment Objective"),
        (PROFILE, "Investment Objective"),
    ],
    "source_account_number": [
        (STATEMENT, "Account Number"),
        (TRANSFER, "Delivering Account Number"),
        (AGREEMENT, "Account Number"),
    ],
    "transfer_value": [
        (STATEMENT, "Ending Account Value"),
        (TRANSFER, "Estimated Transfer Value"),
    ],
}

normalized_fields = {}

for field_name, locations in comparisons.items():
    evidence = []

    for filename, label in locations:
        if filename not in documents:
            continue  # Already reported as a missing document.

        matches = lookup(filename, label)
        nonempty = [item for item in matches if item["value"]]

        if not nonempty:
            add_issue(
                "FIELD_REVIEW",
                "Flagged",
                f"Could not extract {label} from {filename}.",
                matches or [{
                    "document": filename,
                    "page": None,
                    "label": label,
                }],
                "Inspect the document; extraction failure does not prove "
                "the information is absent.",
            )
        else:
            evidence.extend(nonempty)

    normalized_fields[field_name] = evidence
    values = set()

    for item in evidence:
        if field_name == "transfer_value":
            try:
                value = Decimal(
                    item["value"].replace("$", "").replace(",", "").strip()
                )
                if not value.is_finite():
                    raise InvalidOperation
                values.add(value)
            except InvalidOperation:
                add_issue(
                    "VALUE_EXTRACTION_REVIEW",
                    "Flagged",
                    "Could not interpret an extracted dollar amount.",
                    [item],
                    "Confirm the amount in the source document.",
                )
        else:
            values.add(normalize(item["value"]))

    if len(values) > 1:
        add_issue(
            "FIELD_DIFFERENCE",
            "Flagged",
            f"Different values found for {field_name.replace('_', ' ')}.",
            evidence,
            "Review the sources and confirm whether the difference "
            "is expected. Do not automatically overwrite either value.",
        )


# 3. Synthetic signature-marker review
# This recognizes test-fixture text, not authentic signatures.
for filename in (APPLICATION, TRANSFER, AGREEMENT):
    if filename not in documents:
        continue

    names = {
        normalize(item["value"])
        for item in lookup(filename, "Client Name")
        if item["value"]
    }

    markers = []
    for line in documents[filename].get("lines", []):
        match = re.fullmatch(
            r"SIGNED\s+(.+)", line["text"].strip(), flags=re.IGNORECASE
        )
        if match and normalize(match.group(1)) in names:
            markers.append({
                "document": filename,
                "page": line.get("page", 1),
                "value": line["text"],
            })

    if markers:
        observations.append({
            "code": "SYNTHETIC_SIGNATURE_MARKER",
            "message": "Matching synthetic signature marker found. "
                       "This does not authenticate a signature.",
            "sources": markers,
        })
    else:
        add_issue(
            "SIGNATURE_REVIEW",
            "Flagged",
            f"Could not confirm a synthetic signature marker in {filename}.",
            lookup(filename, "Client Signature"),
            "Inspect the signature area manually.",
        )

    dates = [
        item for item in lookup(filename, "Signature Date")
        if item["value"]
    ]
    if not dates:
        add_issue(
            "SIGNATURE_DATE_REVIEW",
            "Flagged",
            f"Could not extract a signing date from {filename}.",
            lookup(filename, "Signature Date"),
            "Inspect the signing date manually.",
        )


# Flagged takes priority when both kinds of issue exist.
status = (
    "Flagged"
    if any(issue["severity"] == "Flagged" for issue in issues)
    else "Missing Info"
    if issues
    else "Ready"
)

name_sources = normalized_fields.get("client_name", [])
type_sources = normalized_fields.get("account_type", [])

result = {
    "account_id": packet["packet_id"],
    "client_name": name_sources[0]["value"] if name_sources else None,
    "account_type": type_sources[0]["value"] if type_sources else None,
    "status": status,
    "summary": (
        f"Demo checks found {len(issues)} issue(s). "
        "Human review is required."
    ),
    "synthetic": True,
    "processing_status": "Complete",
    "checks_completed": [
        "required_documents",
        "field_comparisons",
        "synthetic_signature_markers",
    ],
    "normalized_fields": normalized_fields,
    "issues": issues,
    "observations": observations,
    "notice": "Demo preflight only. Ready means ready for human review. "
              "No signature authentication or transfer authorization.",
}

output = RESULTS / "T002-checked.json"
output.write_text(json.dumps(result, indent=2), encoding="utf-8")

print(f"Client: {result['client_name']}")
print(f"Status: {status}")
for issue in issues:
    print(f"- {issue['code']}: {issue['message']}")
print(f"Saved: {output}")