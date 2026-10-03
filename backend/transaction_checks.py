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

    findings.extend(rapid_fund_movement(report))
    return findings


def transaction_rows(report):
    # Recognize a row only when a standalone date is immediately followed
    # by a known transaction type and signed amount on the same page.
    from datetime import datetime
    from decimal import Decimal

    lines = report.get("lines", [])
    types = {"incoming ach", "outgoing wire", "ach debit", "dividend credit"}
    starts = []

    for index in range(len(lines) - 2):
        date_text = lines[index].get("text", "").strip()
        kind = lines[index + 1].get("text", "").strip().casefold()
        same_page = all(
            entry.get("page") == lines[index].get("page")
            for entry in lines[index:index + 3]
        )
        if (
            same_page
            and re.fullmatch(r"\d{2}/\d{2}/\d{4}", date_text)
            and kind in types
        ):
            starts.append(index)

    rows = []
    for position, start in enumerate(starts):
        end = starts[position + 1] if position + 1 < len(starts) else len(lines)
        entries = [
            entry for entry in lines[start:end]
            if entry.get("page") == lines[start].get("page")
        ]
        if len(entries) < 4:
            continue

        amount_text = entries[2].get("text", "").strip()
        if not re.fullmatch(
            r"[+-]\$(?:\d+|\d{1,3}(?:,\d{3})+)\.\d{2}", amount_text
        ):
            continue
        try:
            date = datetime.strptime(entries[0]["text"].strip(), "%m/%d/%Y").date()
            amount = Decimal(amount_text.replace("$", "").replace(",", ""))
        except (ValueError, ArithmeticError):
            continue

        rows.append({
            "date": date,
            "kind": entries[1]["text"].strip().casefold(),
            "amount": amount,
            "counterparty": entries[3]["text"].strip(),
            "notes": " ".join(entry["text"] for entry in entries[4:]),
            "source": {
                "document": REPORT,
                "page": entries[0].get("page", 1),
                "label": "Transaction activity",
                "value": " | ".join(entry["text"] for entry in entries),
                "confidence": min(
                    (entry.get("confidence", 0) or 0 for entry in entries[:4]),
                    default=0,
                ),
            },
        })
    return rows


def rapid_fund_movement(report):
    from datetime import datetime
    from decimal import Decimal

    rows = transaction_rows(report)
    findings = []

    for incoming in rows:
        notes = incoming["notes"].casefold()
        if not (
            incoming["kind"] == "incoming ach"
            and incoming["amount"] > 0
            and "external originator" in notes
            and "first observed" in notes
        ):
            continue

        wires = []
        for row in rows:
            if row["kind"] != "outgoing wire" or row["amount"] >= 0:
                continue
            elapsed_days = (row["date"] - incoming["date"]).days
            if not 0 <= elapsed_days <= 2:
                continue

            note = row["notes"].casefold()
            if "third-party recipient" not in note:
                continue
            added = re.search(
                r"destination added\s+(\d{2}/\d{2}/\d{4})",
                row["notes"], re.I,
            )
            if not added:
                continue
            try:
                added_date = datetime.strptime(added.group(1), "%m/%d/%Y").date()
            except ValueError:
                continue

            if 0 <= (row["date"] - added_date).days <= 2:
                wires.append(row)

        recipients = {row["counterparty"].casefold() for row in wires}
        total = sum((-row["amount"] for row in wires), Decimal("0"))

        if len(recipients) < 2 or total < incoming["amount"] * Decimal("0.90"):
            continue

        findings.append({
            "code": "RAPID_THIRD_PARTY_FUND_MOVEMENT",
            "severity": "Flagged",
            "message": (
                f"A ${incoming['amount']:,.2f} incoming ACH from a newly "
                f"observed external originator is followed by ${total:,.2f} "
                f"in outgoing wires to {len(recipients)} newly added "
                "third-party recipients within two calendar days."
            ),
            "sources": [
                incoming["source"],
                *[row["source"] for row in wires],
            ],
            "action": (
                "Have a specialist verify the incoming funds, recipient "
                "ownership, destination setup dates, and supporting "
                "authorization. Demo rule: at least 90% of the incoming "
                "amount moves to two or more distinct newly added "
                "third-party recipients within two calendar days. "
                "The report lacks timestamps, so an exact 48-hour interval "
                "cannot be confirmed. This pattern does not establish fraud."
            ),
        })

    return findings
