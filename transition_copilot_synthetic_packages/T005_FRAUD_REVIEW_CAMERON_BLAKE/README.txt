Transition Copilot Synthetic Package T005_FRAUD_REVIEW_CAMERON_BLAKE
==========================================================

SYNTHETIC DEMO DATA - NOT A REAL FINANCIAL DOCUMENT - CREATED FOR HACKATHON TESTING

Expected status: Flagged
Scenario: Individual brokerage transition with consistent core paperwork but recent transaction activity containing multiple fraud/AML review indicators.

Expected detections:
- RAPID_THIRD_PARTY_FUND_MOVEMENT: A $125,000 incoming ACH from a newly observed external originator is followed within 48 hours by $119,500 in outgoing wires to newly added third-party recipients.
- NEW_WIRE_RECIPIENTS: Both outgoing wires are directed to third-party recipients first added immediately before the transfers.
- RETURNED_ACH_NAME_MISMATCH: A separate $22,400 ACH debit is returned because the destination account name does not match the expected beneficiary name. This is an indicator for review, not proof of fraud.

Use ground_truth.json as the canonical synthetic record.
Use expected_detection.json to score your discrepancy-checking pipeline.
