# Market freshness acceptance — v111

Read-only diagnostic changes only. Production quote, portfolio, NAV, storage and financial calculations are unchanged.

A live PASS requires:
- Tehran Saturday–Wednesday regular session, 09:00 to before 12:30.
- Quote date equals today's Tehran market date.
- A valid TSETMC last-trade time (`lastHEven`).
- Last trade is no more than 15 minutes old and not in the future.
- Closing price matches the same-day history row.

The 15-minute threshold is a conservative test threshold, not an official TSETMC service-level guarantee.

Outside session, stale date, missing trade time, stale trade or network failure must remain UNVERIFIED. Historical consistency alone is not live-price acceptance.

Tests: `tests/market-freshness-v111.test.cjs`, `tests/live-market-connectivity.cjs`, and the browser diagnostic `market-connectivity-test.html`.

CI does not replace physical iOS/Android or Persian VoiceOver/TalkBack acceptance. Keep issue #106 open until field evidence is recorded.
