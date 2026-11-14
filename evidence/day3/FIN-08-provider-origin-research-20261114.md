# FIN-08 — provider-origin research checkpoint (2026-11-14)

## Scope and disposition

Read-only research after the exact committed-artifact verifier passed on PR #169. This work does not change raw prices, adjustment rows, manifests, identity mappings, verifier rules, financial flags, holdings, or the five-day plan.

**Disposition: `PROVIDER_ORIGIN_NOT_AUTHENTICATED / EXTERNAL_CAPTURE_REQUIRED`.** No live provider payload was retrieved in this research session. No HTTP status, response bytes, response headers, or new SHA-256 digest are available. No evidence gate is lifted.

## Existing repository implementation found

The branch already contains `scripts/day3_chrome_source_probe.py`. It is a bounded, read-only diagnostic using `curl_cffi` Chrome impersonation with TLS certificate verification and redirects disabled. It requests:
- TSETMC daily history for `insCode=25514780181345713`;
- TSETMC price-adjustment list for the same code;
- the TSE gateway archive endpoint keyed by `InstrumentId=IRO1SAKH0007`;
- two fixed CODAL download URLs.

It writes raw responses and a manifest only after HTTP 200 and basic format/schema checks. The manifest explicitly keeps `sourceAuthenticated=false`, `issuerOriginalVerified=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `day3FinalAccepted=false`, `entryEligible=false`, and `tradingSignalsEnabled=false`.

Important limitation: this probe does **not** execute the three independent TSE Client `adjustPrices=0/1/2` captures. The TSETMC endpoints provide raw daily/adjustment records; the TSE gateway endpoint is only a candidate independent archive and its response schema is intentionally unmapped. The probe's format checks do not establish provider identity or corporate-action completeness. Do not represent a successful run as financial acceptance.

## External research performed

1. The public TSETMC CDN paths are described by community-maintained endpoint catalogues as:
   - `/api/ClosingPrice/GetClosingPriceDailyList/{insCode}/{Top}`
   - `/api/ClosingPrice/GetPriceAdjustList/{insCode}`
   The same catalogues describe `Top=0` as an all-available request, not proof that the response is a complete historical archive.
   References (reverse-engineered/community documentation, not primary provider attestation):
   - https://github.com/amirziveh/tsetmc-skill/blob/master/references/api-endpoints.md
   - https://github.com/m-ahmadi/exref/blob/master/tse/urls.txt
   - https://github.com/5j9/tsetmc/blob/main/tsetmc/instruments.py

2. Secondary symbol directories/search results associate `25514780181345713` with `وساخت` and associate ISIN `IRO1SAKH0007` with سرمایه‌گذاری ساختمان ایران. One secondary directory also lists multiple trading-board instruments sharing that ISIN, so ISIN alone is not a sufficient substitute for exact TSETMC instrument identity.
   References (secondary, not primary exchange identity evidence):
   - https://github.com/semnan-university-ai/tsetmc-dataset/blob/master/tsetmc.php
   - https://www.shakhesban.com/markets/stock/وساخت/specification

3. The candidate independent archive endpoint already embedded in the repository is:
   `https://webgw.tse.ir/InstrumentProvider/api/v1/History/Archive/fa?InstrumentId=IRO1SAKH0007`
   It is on a separate `tse.ir` host and is worth testing as a second price archive, but this session could not retrieve it and has not verified its response schema, completeness, instrument mapping, units, or historical adjustment semantics. Treat it as an unverified candidate, not an authenticated corroborating source.

4. Public search surfaced third-party reposts of CODAL disclosures for وساخت, including a FY1404 ordinary annual meeting decision and historic capital-increase material. The search result is not an original issuer filing. Direct retrieval of the linked CODAL download URL was inaccessible in this session. No PDF bytes, `LetterSerial`, issuer signature, or original filing metadata were independently inspected. Do not ingest third-party reposts as primary corporate-action evidence.
   - A reposted FY1404 meeting-decision result reported DPS of 80 Rial; this is only a lead for locating the original CODAL filing and is **not** accepted as a verified dividend event.
   - A reposted 1400 capital-increase item is likewise only a lead; its application/proposal is not proof of final approval, registration, or effective date.

5. Direct opens of both TSETMC CDN endpoints and the `webgw.tse.ir` archive endpoint were inaccessible from this research environment. Direct CODAL PDF download was also inaccessible. Therefore there is no new live evidence bundle from this pass.

## What this establishes — and does not establish

Established:
- A bounded capture script already exists; do not create a duplicate probe.
- The known CDN endpoint descriptions are consistent across several independent community-maintained code references.
- Secondary references are consistent with the provisional symbol/ISIN mapping, but do not provide primary-source authentication.
- The independent TSE gateway route and CODAL download leads are concrete targets for a later capture on a network with access.

Not established:
- Current live TSETMC response bytes or source-origin authenticity.
- Exact instrument identity confirmed by a primary TSETMC instrument record.
- Complete daily history or complete adjustment/corporate-action event coverage.
- Original issuer CODAL documents and final effective dates for all capital actions/dividends.
- Genuine independent TSE Client outputs for `adjustPrices=0`, `1`, and `2`.
- An independently enrolled reviewer key/signature or any financial eligibility.

## Next bounded action (no duplicate work)

Use the existing `scripts/day3_chrome_source_probe.py` only on an authorized, trusted network/device where TSETMC, TSE gateway, and CODAL are reachable. Preserve raw response bytes, exact requested URL, final URL (if redirects are separately reviewed), HTTP status, content type, UTC capture time, tool/version, instrument identity fields and SHA-256 in a manifest. Do not loosen TLS verification, follow untrusted redirects, use a proxy, or substitute search snippets/third-party reposts.

In parallel, obtain original CODAL disclosure files for every relevant event and confirm proposal vs approval vs registration/effective date. Capture genuine TSE Client mode outputs 0/1/2 separately; do not synthesize them from a single raw endpoint. Then run existing validators and a provenance-bound independent review. Keep the reviewer-key registry empty until the reviewer's identity and key are independently verified.

All financial flags remain false:
`sourceAuthenticated=false`, `historyPriceBasisVerified=false`, `capitalActionsVerified=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`, `day3FinalAccepted=false`.

No tests were rerun because this was a source-research/documentation-only pass and the exact-artifact regression has already passed on PR #169. No source code, test code, raw capture, financial value, app state, APK, portfolio, order, trade, payment, merge, deployment, or publication was changed.


## 2026-11-14 — exact PR #169 candidate diagnostic artifact inspection
- Rechecked exact candidate commit `87083b2d3f0b666532c99604d5db8bef4ad60d6e`. At inspection time, 13/14 Check Runs and 12/13 workflow runs were SUCCESS; one Check Run and the Smoke workflow remained in progress. Do not label this exact SHA fully green until the remaining run completes.
- Downloaded and inspected artifact `sahamban-live-market-v111-outcome` from Smoke run `43578261253` (artifact ID `14107257780`). Its JSON says:
  - `status=UNVERIFIED_NETWORK`
  - `checked_at=2026-11-14T08:58:23.902Z`
  - `source=https://cdn.tsetmc.com/api`
  - `symbol=فولاد`
  - `network_error_code=UND_ERR_CONNECT_TIMEOUT`
- This is a current CI-run transport diagnostic for فولاد, not a fresh raw capture for وساخت. It confirms the candidate's fail-closed diagnostic behavior; it does not authenticate provider origin, deliver any new history/adjustment bytes, or establish a quote/history basis. Do not transfer the فولاد result to وساخت.
- Separately attempted direct read-only opens of the exact وساخت TSETMC daily endpoint, adjustment endpoint and TSE gateway archive through the web retrieval environment; all three were inaccessible. This is tool-access evidence only, not proof the providers are globally unavailable.
- No tests were re-run or modified. No financial gates were relaxed; no source data, holdings, trade, order, payment, merge, deploy or publication changed.
