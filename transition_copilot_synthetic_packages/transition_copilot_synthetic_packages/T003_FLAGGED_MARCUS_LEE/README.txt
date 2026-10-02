Transition Copilot Synthetic Package T003_FLAGGED_MARCUS_LEE
==========================================================

SYNTHETIC DEMO DATA - NOT A REAL FINANCIAL DOCUMENT - CREATED FOR HACKATHON TESTING

Expected status: Flagged
Scenario: Traditional IRA with cross-document address mismatch and risk-tolerance mismatch.

Expected detections:
- ADDRESS_MISMATCH: Existing statement lists 350 Prototype Road while new account application lists 305 Prototype Road.
- RISK_TOLERANCE_MISMATCH: New account application lists Conservative while investor profile lists Moderate.

Use ground_truth.json as the canonical synthetic record.
Use expected_detection.json to score your discrepancy-checking pipeline.
