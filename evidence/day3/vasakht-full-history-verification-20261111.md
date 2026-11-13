# Day 3 — TSETMC full-history verification

Verification run: 2026-11-11 against the user-uploaded original `0.json`.

## Reproducible file checks
- File: `0.json`
- Byte size: **1,890,848**
- SHA-256: `df85d417371d476edf1637f2e03ccae9df7518e02d37b8076442189e047b8247`
- JSON parsed successfully.
- Root key: `closingPriceDaily`
- Rows: **5,935**
- Instrument code: **25514780181345713** on all 5,935 rows.
- Date field: `dEven`; range **2001-03-25** (`20010325`) through **2026-11-10** (`20261110`).
- Duplicate dates: **0**.
- Zero-volume rows (`qTotTran5J == 0`): **379**.
- Null values: **0** across all 17 fields in the sampled schema / all rows.

## Interpretation and limits
- This verifies internal JSON parseability and structural consistency of the user-provided file. It does **not** independently authenticate the HTTP origin, response time, completeness of TSETMC history, or correctness of corporate-action adjustments.
- The workbook `vasakht_full_history_5935.xlsx` is a derived convenience artifact; the JSON remains the source artifact.
- Prior claims that the 500-row capture matches the first 500 rows and that 15 adjustment dates reconcile are retained as reported comparisons until a reproducible comparison script/log is committed.

## Gate status
**EVIDENCE STRUCTURALLY VERIFIED / SOURCE AUTHENTICATION PENDING / NOT AUTHORIZED FOR TRADING.**

Next: preserve the original JSON in repository evidence (or an immutable artifact store), add a repeatable verifier, then independently reconcile adjustment events and CODAL disclosures. Do not open recommendation or live-trading gates on this verification alone.
