import re

REPORT = "07_transaction_activity_report.pdf"


def review_transaction_notes(documents):
    report = documents.get(REPORT)
    if report is None:
        return []

    lines = report.get("lines", [])
    third_party = []
    returned = []

    for index, line in enumerate(lines):
        # Join nearby lines on the same page because Textract splits notes.
        nearby = [
            entry["text"]
            for entry in lines[index:index + 3]
            if entry.get("page") == line.get("page")
        ]
        text = " ".join(nearby)
        first = line["text"].casefold()

        source = {
            "document": REPORT,
            "page": line.get("page", 1),
            "label": "Transaction report note",
            "value": text,
            "confidence": line.get("confidence"),
        }

        if (
            "third-party recipient" in first
            and "destination added" in text.casefold()
        ):
            third_party.append(source)

        if (
            re.search(r"\breturned\b", first)
            and "destination account name mismatch" in text.casefold()
        ):
            returned.append(source)

    findings = []

    if third_party:
        findings.append({
            "code": "TRANSACTION_DESTINATION_REVIEW",
            "severity": "Flagged",
            "message": (
                f"The activity report notes {len(third_party)} third-party "
                "recipient entries with added destinations."
            ),
            "sources": third_party,
            "action": (
                "Have a transition specialist review the transactions, "
                "recipient ownership, destination dates, and supporting "
                "authorization. These notes do not establish fraud."
            ),
        })

    if returned:
        findings.append({
            "code": "RETURNED_PAYMENT_REVIEW",
            "severity": "Flagged",
            "message": (
                "The activity report notes a returned payment "
                "with a destination account name mismatch."
            ),
            "sources": returned,
            "action": (
                "Review the return reason and verify the recipient account "
                "details against supporting records. This is not proof of fraud."
            ),
        })

    return findings
