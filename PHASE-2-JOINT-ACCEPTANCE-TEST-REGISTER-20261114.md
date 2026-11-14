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
- [x] Observe a visible Android completion message after SAF write: screenshot shows the app reporting that Android reported completion of writing `sahamban-local-backup-v7.1.json`; message states the JSON is unencrypted and contains one saved section, with no recorded audio. Physical native write-completion acknowledgement: PASS (screenshot evidence in conversation, 2026-11-14). Exact-byte readback comparison is NOT yet evidenced and remains UNVERIFIED.
- [ ] Restore a correctly shaped synthetic local-backup fixture **only inside the isolated acceptance app**, after its explicit consent flow; verify the expected synthetic value is restored and no unrelated data changes.
- **Do not repeat:** export merely to prove a file exists; reselect/re-preview the already accepted `-01.json`/`-02.json` files; never restore a real profile.
- Current status: `PARTIAL — physical Android write-completion acknowledgement PASS; exact-byte readback UNVERIFIED; isolated synthetic restore NOT YET OBSERVED`.

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

Next J1 action: verify the saved file's presence and size in Android Files/Downloads, without opening or importing it yet. This will add file-presence evidence but does not by itself prove exact-byte readback. Then inspect whether the isolated acceptance app exposes a safe synthetic-only restore consent flow. Do not repeat export or preview. Stop if the file cannot be identified unambiguously or if any real data is requested.

## GitHub evidence pointers

- Android history and acceptance evidence: `ANDROID-TEST-ACCEPTANCE-2026-11-12.md` on branch `feta`.
- Current isolated acceptance design/checkpoint: `ANDROID-ISOLATED-ACCEPTANCE-CHECKPOINT-2026-11-14.md` on the acceptance branch.
- Active-branch autonomous test inventory: `AUTONOMOUS-TEST-AUDIT-20261114.md` on `feat/day2-history-basis-gates-20261109`.
- Android implementation/acceptance candidates: PR #166 and Issue #167; newer isolated PWA acceptance candidate PR #178. These remain separate open refs; this register does not authorize merge or deployment.

## Change log

- 2026-11-14: Initial non-duplicate six-work-package register created from existing Android acceptance log, Issue #167 evidence, PR #166/#178 context, and active-branch autonomous test audit.
- 2026-11-14: J1 physical step — owner tapped the synthetic-only local backup export. Android save picker opened; owner accepted the save and the app displayed: `Android پایان نوشتن فایل sahamban-local-backup-v7.1.json را گزارش کرد`; UI reports one saved section and no recorded audio. Marked visible native write-completion acknowledgement PASS. Exact-byte readback and restore remain UNVERIFIED. Next: verify file presence/size in Downloads, without opening/importing. No existing data changed; no restore, merge, deployment, release, payment, trade or portfolio mutation performed.
