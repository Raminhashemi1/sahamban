# Day 3 — وساخت full-history handoff (2026-11-11)

Status: **EVIDENCE RECEIVED / NOT AUTHORIZED FOR TRADING**.

## User-supplied evidence
- Original TSETMC daily-history response saved by user as `0.json`, requested from `https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/25514780181345713/0` (`Top=0`).
- Reported parsing result: **5,935 rows**, earliest `2001-03-25`, latest `2026-11-10`, `insCode=25514780181345713` for all records, **zero duplicate dates**, **379 zero-volume rows**. These counts were reported in the conversation; re-run the repository verifier against the original attachment before treating as independently reproducible.
- An Excel workbook `vasakht_full_history_5935.xlsx` was generated in the conversation for user review; Excel is a derivative, not raw-source evidence.
- Earlier separate TSETMC capture: `dailyTop=500` with 500 records; adjustment endpoint returned 15 rows. Conversation reports all 500 rows matched the prefix of the full history and 15 adjustment dates were found; preserve this as **reported comparison pending reproducible verifier log**.
- Two original user-uploaded CODAL PDFs: FY1403 approved DPS 30 IRR (tracking 1304830), FY1404 approved DPS 80 IRR (tracking 1478213). TSETMC adjustment events for 2025-02-02 and 2026-01-20 have price differences 30 and 80 IRR, respectively, consistent with those PDFs.

## Remaining work
1. Bring original full-history JSON into durable repository evidence, verify hash/size, actual row counts and identity with scripts, and record machine-readable outputs.
2. Reconcile adjustment-event semantics, corporate actions and adjustment bases independently; retain provenance distinctions between user-uploaded files and directly authenticated sources.
3. Keep source-authentication, financial-verification, recommendations and live-trading gates **CLOSED** unless separately satisfied.
4. Re-check GitHub PR #164 CI before any merge; this note is not approval or completion of Day 3.
