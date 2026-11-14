# Phase 2 — Joint Device Acceptance Test Register

Repository: `Raminhashemi1/sahamban`
Working branch: `feat/day2-history-basis-gates-20261109`
Created: 2026-11-14
Purpose: durable, non-duplicative register for owner-assisted acceptance tests on the installed isolated Sahamban Android app (Samsung S23 FE).

## Operating rules

- This register is the source of truth for the remaining joint/device tests. On each continuation, read this file and the latest linked evidence before asking the owner to do anything.
- Never repeat a test whose PASS evidence is already recorded. Extend an existing test only to close a specifically identified evidence gap.
- Every test result must be one of: `PASS`, `FAIL`, `UNVERIFIED`, or `BLOCKED`. Distinguish automated/source-level evidence from physical-device evidence.
- Use synthetic data and the isolated acceptance package only. Never use a real portfolio, real backup, payment, trade, order, or live asset.
- Do not clear app/browser data, overwrite personal files, uninstall/replace existing apps, merge, deploy, publish, or change the five-day plan.
- Restore is allowed only inside the isolated acceptance app, with a correctly shaped synthetic fixture and an explicit on-screen consent step. Stop if the app requests a real backup or access to existing app/Chrome/PWA storage.
- Do not ask for TalkBack/VoiceOver testing; the owner placed dedicated screen-reader testing outside current delivery scope.
- After each completed test, update this register with date, exact app/build identifier, device/Android/WebView details if supplied, evidence reference, result, and next uncompleted step. Commit the update to this branch. Do not claim PASS without observable evidence.

## Evidence already on record — do not repeat

| Area | Recorded evidence | Classification |
|---|---|---|
| Isolated Android app launch and Persian home screen | Owner screenshot of the isolated app showing the Sahamban home UI | Physical PASS |
| Local PWA backup export | Owner-confirmed export action and local JSON file presence in Downloads; one-section success message | Physical PASS (limited: file presence only) |
| Synthetic local-backup file reopen/preview | Owner screenshot showing valid one-section preview and explicit no replacement | Physical PASS |
| Earlier local synthetic fixture | `test-ramin-5.json` | Physical PASS (historical fixture test) |
| Earlier risk synthetic fixture | `test-risk-6.json` | Physical PASS (historical fixture test) |
| Synthetic SAF export/readback implementation | Java verifier and bridge tests, exact-byte comparison including EOF/trailing-byte rejection | Automated PASS; not physical callback proof |
| PWA/native bridge mocked integration | Smoke tests exercise protocol, allowlisted payload and mocked native acknowledgements | Automated PASS; not physical integration proof |
| Browser/mobile UI matrix | Chromium and WebKit proxy matrix at 320/360/390/520/768 px | Automated proxy PASS; not physical-device module acceptance |
| Security, backup policy, risk, subscription/order, rollback, calculation and other module suites | Active-branch Smoke/Browser CI artifact inventory | Automated PASS; not live-market or physical-device proof |
| TalkBack/VoiceOver | Explicitly moved out of current delivery scope by owner | Out of scope; do not schedule |

## Six joint acceptance work packages

### J1 — Local backup: native acknowledgement and isolated restore

- [x] PWA local-backup UI produced a one-section JSON backup and owner confirmed file presence.
- [x] Previously saved synthetic file reopened and showed a valid preview; no data was replaced.
- [x] Observe a visible Android completion message after SAF write: screenshot reports Android completion for the filename `sahamban-local-backup-v1.json`; message states one saved section and no recorded audio. Physical native write-completion acknowledgement: PASS. **File presence confirmed:** Downloads screenshot shows a newly named `sahamban-local-b...phase2-01.json` file, size 226 bytes, alongside a separate older `sahamban-local-backup-v1 (4).json` file (also 226 bytes). This resolves the earlier confusion: the `(4)` item is a separate older file; `v1.json` is the JS default export title. The content viewer screenshot shows JSON-like text but is insufficient to establish byte-for-byte equality with the native write payload. Exact-byte readback remains UNVERIFIED.
- [x] Select the exact new `sahamban-local-backup-phase2-01.json` in the app; screenshot shows selected filename truncated as `sahamban-l...se2-01.json` and app preview reports: `فایل معتبر است؛ ۱ بخش؛ هیچ چیزی هنوز جایگزین نشده.` Physical selection and valid one-section preview: PASS; no data has been changed.
- [x] Owner explicitly approved restore and confirmed the app action. Result screenshot reports: `۱ بخش در همین مرورگر بازیابی شد. برای نمایش تنظیمات بازیابی‌شده، صفحه را یک بار بارگذاری مجدد کنید.` Restore acknowledgement PASS; post-reentry screenshot confirms the synthetic manual-alert symbol `نماد-ساختگی-آزمایش`, `aStop=100`, `aTarget=200` still appear (visible persistence PASS).
- [x] Exact-byte SAF save/readback **PASS by native-code-enforced protocol and observed physical `saved` reply**, not by independently downloading a byte dump from the phone. The installed acceptance flow uses `BackupExportBridge.onActivityResult`: it closes the `wt` output stream, opens the same selected document for read, calls `BackupFileVerifier.matches(input, work.bytes)` and replies `failed` on mismatch/exception. `BackupFileVerifier.matches` verifies all bytes and the EOF boundary; only then is the correlated `saved` reply sent and displayed by `native-backup-export-v1.js`. Screenshot showed that success text on device. CI on PR #178 HEAD `a9627397ed2cebfef2f395968d560a1bf02dc4a5` completed its 12 listed checks SUCCESS, including isolated acceptance APK and smoke; these are corroborating source/CI evidence, not separate physical byte capture.
- [x] Unrelated-key mutation boundary **PASS by restore source + automated regression**, not an independently measured full-device before/after. The accepted synthetic local JSON is limited by the native guard to `items` with exactly one key `sahamban-v1` (fixed symbol/stop/target). `local-backup-v148.js` calls `restoreSnapshot`, whose `setItem` loop iterates only `Object.keys(snapshot.items)`; all other keys remain outside the mutation loop, and rollback touches only attempted keys. `tests/local-backup-v148.test.cjs` asserts preserved `unrelated` and rollback behavior. Actual full device-wide key inventory before/after was never collected and is explicitly NOT MEASURED. No real data was imported.
- **Do not repeat:** export merely to prove a file exists; reselect/re-preview the already accepted `-01.json`/`-02.json` files; never restore a real profile.
- Current status: `J1 CLOSED — PASS for the original synthetic isolated Android scope AND the owner's two extra requested checks: (a) 226-byte exact raw-file match to source-format reconstruction PASS; (b) unrelated-key preservation PASS in 200 independent simulated restores and 100 independent fault/rollback cases. Native saved acknowledgement, valid file preview, consent-based restore and post-reentry visible fixture persistence are separately physical PASS. Caveats: not a direct capture of original pre-export payload, not a forensic snapshot of all physical WebView storage, and not real-user-data or production proof.`.

### J2 — Risk portfolio backup: PWA path and isolated restore

- [x] Earlier synthetic risk fixture `test-risk-6.json` has a recorded on-device PASS. Do not repeat that fixture test.
- [x] Automated tests cover risk-portfolio PWA backup wiring, shared native helper, payload size cap and synthetic-only acceptance guard.
- [ ] In the isolated acceptance build, exercise the actual PWA risk-backup control once with the seeded synthetic risk data, save to a dedicated empty test folder, and record the visible native result.
- [ ] Select that same synthetic file for preview and, only after explicit in-app consent, restore within isolated synthetic storage; verify the expected synthetic record.
- Current status: `PARTIAL — earlier fixture PASS; new isolated PWA risk roundtrip physical acceptance UNVERIFIED`.

### J3 — Physical UI and module walkthrough

- [x] Isolated app launch and Persian home screen rendering observed in owner screenshot.
- [x] Automated browser/mobile responsive UI matrix passed as a proxy.
- [ ] On the installed isolated app, inspect only the still-unverified main module navigation/cards and representative screens; record any rendering, navigation, overflow or interaction defect. Do not rerun the full automated matrix or re-prove the home screen.
- Current status: `PARTIAL — launch/home PASS; remaining physical module walkthrough UNVERIFIED`.

### J4 — Physical security and stability edge cases

- [x] Automated validation, malformed-payload, URI/navigation boundary, file-size and failure-closed tests are recorded in CI/source tests.
- [ ] Perform only the physical cases not already evidenced: cancel an in-progress SAF picker once; attempt one harmless malformed synthetic JSON file and verify preview rejects it without mutation; observe app behavior on a controlled offline/online transition if not already captured on this exact installed build.
- [ ] Stop immediately if any prompt requests broad storage permission, existing app/Chrome data, or a real portfolio.
- Current status: `PARTIAL — automated PASS; device-specific edge cases UNVERIFIED`.

### J5 — Financial calculations and subscription UI

- [x] Synthetic portfolio/risk calculations, trade-cost boundaries, subscription/order behavior and fail-closed guards have automated coverage in active-branch CI.
- [x] Synthetic lifecycle and holdings browser proxies are recorded; do not rerun them merely for repetition.
- [ ] On device, do a read-only display sanity check using the existing synthetic acceptance data: verify displayed quantities/values/risk summary are consistent with the known synthetic fixture. No real symbols, live prices, trade actions or portfolio mutation.
- [ ] Inspect subscription/plan/status UI only if present in the isolated build; do not initiate checkout, payment or activation. If the isolated app has no subscription surface, record `NOT APPLICABLE` with evidence.
- Current status: `PARTIAL — automated PASS; physical display sanity check UNVERIFIED`.

### J6 — Final isolated-app acceptance and closeout

- [ ] Reconcile J1–J5 evidence and open defects; no new test unless required by a specific failure.
- [ ] Verify installed package/build identity and that existing apps and personal data remained untouched.
- [ ] Publish a final acceptance summary with PASS/FAIL/UNVERIFIED/BLOCKED counts and explicit residual limitations.
- Current status: `BLOCKED BY J1–J5 CLOSEOUT`.

## Current next action

J1 has been scoped-accepted on 2026-11-14 using joint physical observation plus native/source/CI evidence: native `saved` is emitted only after closed write, exact byte comparison and EOF check, and one-section restore touches only `sahamban-v1`; synthetic manual-alert settings remain visible after app re-entry. No repeat J1 actions are needed. IMPORTANT evidence boundary: no independent full before/after phone-localStorage dump exists; absence of side effects beyond the permitted key is verified by code path and automated regression, not independently observed on the physical phone. Owner-requested independent J1 closeout is now completed. Owner uploaded the exact synthetic `sahamban-local-backup-phase2-01.json`; independent raw-file comparison against a separately reconstructed export snapshot using the included timestamp and source fixture yields exact 226-byte equality and SHA-256 `3f984fcd06fb3946d25e564d69c7f7533af67f43f6b36aed92be114d8264d543`. All 200/200 unrelated-key preservation and 100/100 error/rollback synthetic tests passed. J1 FULLY CLOSED within the defined synthetic isolated-Android acceptance scope. Full independent physical WebView storage forensics and original pre-save raw payload capture were not part of the completed evidence, and no conclusion is drawn about real-user data or public release. Next J2 only on owner's instruction. No real portfolio, merge, deploy or release.

## GitHub evidence pointers

- Android history and acceptance evidence: `ANDROID-TEST-ACCEPTANCE-2026-11-12.md` on branch `feta`.
- Current isolated acceptance design/checkpoint: `ANDROID-ISOLATED-ACCEPTANCE-CHECKPOINT-2026-11-14.md` on the acceptance branch.
- Active-branch autonomous test inventory: `AUTONOMOUS-TEST-AUDIT-20261114.md` on `feat/day2-history-basis-gates-20261109`.
- Android implementation/acceptance candidates: PR #166 and Issue #167; newer isolated PWA acceptance candidate PR #178. These remain separate open refs; this register does not authorize merge or deployment.

## Change log

- 2026-11-14: Initial non-duplicate six-work-package register created from existing Android acceptance log, Issue #167 evidence, PR #166/#178 context, and active-branch autonomous test audit.
- 2026-11-14: J1 physical step — owner tapped the synthetic-only local backup export. Android save picker opened; owner accepted the save and the app displayed a completion message naming `sahamban-local-backup-v1.json`, one saved section, and no recorded audio. Native completion acknowledgement is PASS. Owner supplied Downloads screenshots: a newly named `sahamban-local-b...phase2-01.json` file is listed at 226 bytes, and a separate older `sahamban-local-backup-v1 (4).json` file is also listed at 226 bytes. The new test file is therefore present; the message `sahamban-local-backup-v1.json` names the source-defined default filename, while the user's SAF picker saved the new `phase2-01.json`; the `(4)` item was an older separate file. The opened content screenshot is not sufficient to prove exact-byte readback. No file was renamed/deleted and no restore performed. Next: select only `phase2-01.json` in the app for preview; stop before restore.

- 2026-11-14: J1 file-presence follow-up — Downloads screenshot confirms `sahamban-local-b...phase2-01.json` at 226 bytes; separate older `sahamban-local-backup-v1 (4).json` also exists at 226 bytes. The new test artifact is present. Exact-byte comparison and restore remain unverified. Next action is in-app selection/preview of only the exact `phase2-01.json` file; no restore until a separate explicit approval.

- 2026-11-14: J1 in-app preview — owner selected `sahamban-local-backup-phase2-01.json`. Screenshot shows selected filename truncated as `sahamban-l...se2-01.json`; app reports `فایل معتبر است؛ ۱ بخش؛ هیچ چیزی هنوز جایگزین نشده.` Marked physical file selection and valid one-section preview PASS. No restore was executed and no data was replaced. Exact-byte readback remains UNVERIFIED. Owner then explicitly approved restore. The app confirmation screenshot reports one section restored in the same browser and requests one page reload to display restored settings. Next: reload once and verify the restored synthetic value and unrelated-data integrity; do not restore again.

- 2026-11-14: J1 restore step — after explicit owner approval, app displayed `۱ بخش در همین مرورگر بازیابی شد. برای نمایش تنظیمات بازیابی‌شده، صفحه را یک بار بارگذاری مجدد کنید.` Restore acknowledgement for one section: PASS. Post-reload persistence/visible values and no-unrelated-change verification remain pending. Exact-byte readback remains UNVERIFIED. Next: reload the same page once and capture the resulting settings view; do not repeat restore.

- 2026-11-14: J1 post-reopen evidence — owner exited and re-entered the app, then supplied screenshots of the valuation/portfolio module. The screenshots show module overview and a notice that no real-asset file is stored in this browser; no synthetic backup value is visible and no before/after comparison is available. This is not sufficient to claim restore persistence. Post-reopen persistence and unrelated-data integrity remain UNVERIFIED. Next: inspect read-only `دارایی‌ها و قیمت‌ها` tab only, without triggering any data fetch/update/import. Exact-byte readback remains UNVERIFIED.

- 2026-11-14: J1 read-only post-reopen inspection — owner opened `دارایی‌ها و قیمت‌ها`. Screenshot shows `جدول هنوز آماده نمایش نیست` and instructs user to fetch prices from Overview or run offline file valuation before displaying assets; it also states optional network test does not read the portfolio. No synthetic restored value or restored settings are visible in this screen. This confirms only that the assets/prices table is not populated/rendered in the reopened browser; it does not prove restore failure or success. To avoid mutating/fetching data, no further button was pressed. Post-reopen persistence and unrelated-data integrity remain UNVERIFIED; exact-byte readback remains UNVERIFIED. J1 stays PARTIAL. Next action: stop here and determine from the backup's saved-section manifest which exact setting/value should be checked, rather than triggering market-price retrieval or offline valuation speculatively.

- 2026-11-14: J1 manifest-to-UI mapping established from active-branch source `local-backup-v148.js` and `app.js`: the single saved key `sahamban-v1` is the manual price-alert settings object with exactly three persisted fields: `symbol`, `aStop`, `aTarget` (the visible UI labels are symbol, stop-loss alert, take-profit alert). The source restores these fields into the manual price-alert inputs on page load. The owner-provided JSON viewer screenshot appears to show the synthetic fixture symbol `نماد-ساختگی` with `aStop=100` and `aTarget=200`; this is treated as the expected fixture only insofar as the screenshot text is legible. Next device check: open the `هشدار دستی قیمت` section read-only and inspect the three displayed values after app re-entry; do not press save/check, change inputs, or invoke price/network actions. This targeted UI check can establish visible restored values, but by itself does not prove unrelated localStorage keys were unchanged or exact-byte file readback.

- 2026-11-14: J1 post-reopen manual-alert UI evidence — owner supplied a device screenshot of the read-only `هشدار دستی قیمت` section after app re-entry. Visible values: symbol `نماد-ساختگی-آزمایش`, checked price `10000` ریال, stop alert `100` ریال, target alert `200` ریال. This matches the expected synthetic stop/target values and demonstrates that the non-default synthetic symbol and alert values are visible after re-entry; classify post-reopen persistence of the manual-alert fields as physical PASS. The symbol string includes the visible `-آزمایش` suffix and is not asserted byte-identical to the earlier fixture label. No save/check/audio action was pressed in this observation. This does not prove exact-byte SAF readback, nor that unrelated localStorage keys were unchanged. J1 remains PARTIAL pending those independent evidence gaps; do not repeat restore/export.

- 2026-11-14: J1 closeout: exact-byte readback PASS (proof is the physical native `saved` result coupled to fail-closed verifier source, NOT an external file-hash comparison); unrelated-key preservation PASS at code-path and existing automated-regression level (NOT an independent whole-device storage snapshot). The physical synthetic restore and post-reentry persistence were observed and passed. J1 accepted within synthetic-only isolated-app scope. No merge, deployment, publication, real portfolio change, payment or trade. Next session should begin with J2 and consult this register first.

- 2026-11-14: J1 additional owner-authorized independent synthetic restore exercise, executed against *actual unmodified* `local-backup-v148.js` fetched from PR #178 branch `test/native-saf-pwa-visible-20261114` (blob SHA `cafbe9cdda89b6091a556504e3757f2bc49376ab`): 200 synthetic runs restored one `sahamban-v1` alert and compared all other seeded keys (custom unrelated key, watchlist and risk portfolio) byte-for-byte before and after: **200/200 PASS**. 100 independently fault-injected runs simulated `setItem` mutating then throwing, and checked exact restoration of original key/value pairs: **100/100 PASS**. These were performed in a detached JS runtime with fake storage; they do **not** constitute a forensic dump of on-phone WebView storage. The file itself has not been uploaded into this chat, so a separately reconstructed *physical file-byte* comparison is still **UNVERIFIED**; native Android's fail-closed verifier `saved` remains the prior evidence for device readback. To close the added independent file check, owner needs to supply only the exact synthetic `sahamban-local-backup-phase2-01.json` as a file attachment (not a screenshot), after which compare its raw UTF-8 bytes with the canonical known-format PWA export for the embedded timestamp. No real files or portfolios are needed.

- 2026-11-14: **J1 final independent file closeout — PASS.** The owner uploaded the *actual synthetic exported file* `sahamban-local-backup-phase2-01.json` for offline inspection (file kept in conversation, **not committed to the public repository**). Raw UTF-8 length = 226 bytes; SHA-256 = `3f984fcd06fb3946d25e564d69c7f7533af67f43f6b36aed92be114d8264d543`. JSON keys exactly `format`, `schema`, `createdAt`, `items`; values: `sahamban-local-backup`, schema `1`, timestamp `2026-11-14T17:27:52.891Z`; items has only `sahamban-v1` with stringified alert `{symbol:'نماد-ساختگی-آزمایش', aStop:'100', aTarget:'200'}`. Independently reconstructing the expected bytes as pretty-printed two-space JSON with the saved timestamp and the pinned source-defined synthetic alert fixture yielded **exact 226/226 byte equality**, no BOM or trailing bytes. This independent check does not constitute a retained *pre-write raw-byte capture*; the Android native verifier's already observed `saved` acknowledgement, however, is gated on same-document full readback and EOF, and the post-reentry screenshot showed the expected values. The owner-requested synthetic unrelated-key stress tests ran 200/200 preserve-other-key PASS and 100/100 mutate-then-throw rollback PASS against the unmodified PR #178 JS module. Thus J1 is CLOSED within the explicitly agreed synthetic isolated-device acceptance scope, while production claims and forensic complete-device-state claims are excluded. No user backup bytes or personal data uploaded to GitHub.
