Transition Copilot Synthetic Package T004_COMPLEX_ELENA_RODRIGUEZ
==========================================================

SYNTHETIC DEMO DATA - NOT A REAL FINANCIAL DOCUMENT - CREATED FOR HACKATHON TESTING

Expected status: Flagged
Scenario: Multi-issue individual brokerage transition: value variance, unsigned transfer form, objective mismatch, and name formatting inconsistency.

Expected detections:
- NAME_VARIATION: Application uses Elena Rodriguez while statement uses Elena M. Rodriguez; requires identity confirmation rather than automatic rejection.
- ACCOUNT_VALUE_VARIANCE: Transfer form estimated value is $603,145.75 versus statement value $638,145.75.
- MISSING_TRANSFER_SIGNATURE: Transfer form signature field is blank/not signed.
- OBJECTIVE_MISMATCH: Application lists Balanced Growth while investor profile lists Aggressive Growth.

Use ground_truth.json as the canonical synthetic record.
Use expected_detection.json to score your discrepancy-checking pipeline.
