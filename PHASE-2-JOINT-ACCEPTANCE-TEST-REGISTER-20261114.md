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
- [x] Observe a visible Android completion message after SAF write: screenshot reports Android completion for the filename `sahamban-local-backup-v7.1.json`; message states one saved section and no recorded audio. Physical native write-completion acknowledgement: PASS. **File presence confirmed:** Downloads screenshot shows a newly named `sahamban-local-b...phase2-01.json` file, size 226 bytes, alongside a separate older `sahamban-local-backup-v1 (4).json` file (also 226 bytes). This resolves the earlier confusion: the `v1` file is a separate older item, not the newly named phase2-01 test file. The content viewer screenshot shows JSON-like text but is insufficient to establish byte-for-byte equality with the native write payload. Exact-byte readback remains UNVERIFIED.
- [x] Select the exact new `sahamban-local-backup-phase2-01.json` in the app; screenshot shows selected filename truncated as `sahamban-l...se2-01.json` and app preview reports: `فایل معتبر است؛ ۱ بخش؛ هیچ چیزی هنوز جایگزین نشده.` Physical selection and valid one-section preview: PASS; no data has been changed.
- [x] Owner explicitly approved restore and confirmed the app action. Result screenshot reports: `۱ بخش در همین مرورگر بازیابی شد. برای نمایش تنظیمات بازیابی‌شده، صفحه را یک بار بارگذاری مجدد کنید.` Marked restore operation acknowledgement PASS for one section in the current browser. Post-reload persistence/visible restored values and absence of unrelated changes are still pending verification.
- **Do not repeat:** export merely to prove a file exists; reselect/re-preview the already accepted `-01.json`/`-02.json` files; never restore a real profile.
- Current status: `PARTIAL — Android save completion PASS; file presence (226 bytes) PASS; valid one-section preview PASS; restore acknowledgement PASS (one section restored in same browser); exact-byte readback UNVERIFIED; post-reload persistence and unrelated-data integrity verification PENDING`.

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

Owner exited/re-entered the app and supplied screenshots of the valuation/portfolio module. These screenshots show the module overview and a notice that no real-asset file is stored in this browser; they do not display the restored synthetic backup value or a before/after comparison. Therefore post-reopen persistence and unrelated-data integrity remain UNVERIFIED. Next: inspect the read-only `دارایی‌ها و قیمت‌ها` tab (no fetch/update/import actions) for the known synthetic fixture value; if not visible, stop and report that this UI cannot evidence the restored setting. Do not repeat restore or export. Exact-byte readback remains independently unverified.

## GitHub evidence pointers

- Android history and acceptance evidence: `ANDROID-TEST-ACCEPTANCE-2026-11-12.md` on branch `feta`.
- Current isolated acceptance design/checkpoint: `ANDROID-ISOLATED-ACCEPTANCE-CHECKPOINT-2026-11-14.md` on the acceptance branch.
- Active-branch autonomous test inventory: `AUTONOMOUS-TEST-AUDIT-20261114.md` on `feat/day2-history-basis-gates-20261109`.
- Android implementation/acceptance candidates: PR #166 and Issue #167; newer isolated PWA acceptance candidate PR #178. These remain separate open refs; this register does not authorize merge or deployment.

## Change log

- 2026-11-14: Initial non-duplicate six-work-package register created from existing Android acceptance log, Issue #167 evidence, PR #166/#178 context, and active-branch autonomous test audit.
- 2026-11-14: J1 physical step — owner tapped the synthetic-only local backup export. Android save picker opened; owner accepted the save and the app displayed a completion message naming `sahamban-local-backup-v7.1.json`, one saved section, and no recorded audio. Native completion acknowledgement is PASS. Owner supplied Downloads screenshots: a newly named `sahamban-local-b...phase2-01.json` file is listed at 226 bytes, and a separate older `sahamban-local-backup-v1 (4).json` file is also listed at 226 bytes. The new test file is therefore present; the earlier `v1` reference was to a separate existing file. The opened content screenshot is not sufficient to prove exact-byte readback. No file was renamed/deleted and no restore performed. Next: select only `phase2-01.json` in the app for preview; stop before restore.

- 2026-11-14: J1 file-presence follow-up — Downloads screenshot confirms `sahamban-local-b...phase2-01.json` at 226 bytes; separate older `sahamban-local-backup-v1 (4).json` also exists at 226 bytes. The new test artifact is present. Exact-byte comparison and restore remain unverified. Next action is in-app selection/preview of only the exact `phase2-01.json` file; no restore until a separate explicit approval.

- 2026-11-14: J1 in-app preview — owner selected `sahamban-local-backup-phase2-01.json`. Screenshot shows selected filename truncated as `sahamban-l...se2-01.json`; app reports `فایل معتبر است؛ ۱ بخش؛ هیچ چیزی هنوز جایگزین نشده.` Marked physical file selection and valid one-section preview PASS. No restore was executed and no data was replaced. Exact-byte readback remains UNVERIFIED. Owner then explicitly approved restore. The app confirmation screenshot reports one section restored in the same browser and requests one page reload to display restored settings. Next: reload once and verify the restored synthetic value and unrelated-data integrity; do not restore again.

- 2026-11-14: J1 restore step — after explicit owner approval, app displayed `۱ بخش در همین مرورگر بازیابی شد. برای نمایش تنظیمات بازیابی‌شده، صفحه را یک بار بارگذاری مجدد کنید.` Restore acknowledgement for one section: PASS. Post-reload persistence/visible values and no-unrelated-change verification remain pending. Exact-byte readback remains UNVERIFIED. Next: reload the same page once and capture the resulting settings view; do not repeat restore.

- 2026-11-14: J1 post-reopen evidence — owner exited and re-entered the app, then supplied screenshots of the valuation/portfolio module. The screenshots show module overview and a notice that no real-asset file is stored in this browser; no synthetic backup value is visible and no before/after comparison is available. This is not sufficient to claim restore persistence. Post-reopen persistence and unrelated-data integrity remain UNVERIFIED. Next: inspect read-only `دارایی‌ها و قیمت‌ها` tab only, without triggering any data fetch/update/import. Exact-byte readback remains UNVERIFIED.

- 2026-11-14: J1 read-only post-reopen inspection — owner opened `دارایی‌ها و قیمت‌ها`. Screenshot shows `جدول هنوز آماده نمایش نیست` and instructs user to fetch prices from Overview or run offline file valuation before displaying assets; it also states optional network test does not read the portfolio. No synthetic restored value or restored settings are visible in this screen. This confirms only that the assets/prices table is not populated/rendered in the reopened browser; it does not prove restore failure or success. To avoid mutating/fetching data, no further button was pressed. Post-reopen persistence and unrelated-data integrity remain UNVERIFIED; exact-byte readback remains UNVERIFIED. J1 stays PARTIAL. Next action: stop here and determine from the backup's saved-section manifest which exact setting/value should be checked, rather than triggering market-price retrieval or offline valuation speculatively.
