# Day 3 — actually executed local original-file checks (2026-11-11)

Scope: DEC-008 **bounded engineering pilot**. Local Python 3 with stdlib `json`, `hashlib`, `decimal`, against the user-uploaded byte originals; this is not a GitHub Actions CI attestation.

Inputs were the original user attachments: `0.json` (5,935 rows), 500-row daily file, 15-event adjustment file, and original CODAL PDFs for FY1403/1404. File identity/SHA256 and lengths are recorded in `DAY3-ENGINEERING-PILOT-CLOSEOUT-20261111.md` and `MASTER-PLAN.md`.

Executed checks and results:

```
PASS original sha256 integrity (5 files previously checked)
PASS full JSON shape and instrument identity
PASS 500-row overlap all fields
PASS 2 in-window dividend events and original source closes
PASS 500 x 6 = 3000 deterministic price-field computations
PASS all 15 event dates found; 10 historic pre-event close mismatches flagged
```

Algorithm: parse with `json.loads(..., parse_float=Decimal)`; compare the first 500 complete row objects; identify adjustment events within the 500-session date range; validate daily close against each event's pre-adjust close and event cash deltas 30/80 IRR, consistent with the original CODAL dividend PDFs; for each of six price fields and each of 500 rows multiply by chronological event ratios and quantize under `ROUND_HALF_EVEN` (2 decimals on `priceFirst`,`pClosing`,`pDrCotVal`; integer on remaining three), asserting finite/nonnegative computed values. Event-date existence and 10 historical raw-price mismatches retained as warnings.

**Limits:** Neither the user's original raw files nor these computations cryptographically attest to remote provider transport, 5,935-row adjustment correctness, reviewer identity, current CI, or real-trading readiness. This report does not assert upstream `tse-client` 0/1/2 results. Current post-documentation-commit GitHub CI status not independently established from available connector responses.

**Result:** `DAY3_BOUNDED_ENGINEERING_COMPLETE` and `day3FinalAccepted=false`, `threeModesVerified=false`, `historyBasisAuthenticated=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. No PR merge or deployment.
