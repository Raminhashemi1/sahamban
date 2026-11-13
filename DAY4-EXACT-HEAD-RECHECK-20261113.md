# Exact-head continuation checkpoint — 2026-11-13

This is a live recheck of the existing handoff, not a new implementation task. It intentionally records the blocker without duplicating tests or changing scope.

## Live repository state

- Main work PR: [#164](https://github.com/Raminhashemi1/sahamban/pull/164), OPEN, non-Draft, unmerged; head branch `feat/day2-history-basis-gates-20261109`, exact HEAD `f5477a09eb5b862afded9537287d2855834be8b2`.
- Android PR: [#166](https://github.com/Raminhashemi1/sahamban/pull/166), OPEN, Draft, unmerged; separate head branch `feta`, exact HEAD `42a0ae602a158d4c04ab67f9a1801fe8637c1ec7`.
- [Issue #167](https://github.com/Raminhashemi1/sahamban/issues/167) remains OPEN.
- Public `main` remains `a5c10548904ee0e1cd80169729071d0bb390f606`; no branch transfer, cherry-pick, merge or deployment.

## Exact-SHA CI recheck

### PR #164 — `f5477a09eb5b862afded9537287d2855834be8b2`

- `fetch_commit_workflow_runs` returned **0 matching PR-triggered workflow runs** for this exact SHA.
- Combined commit status returned **0 status records**.
- Therefore exact-head GitHub CI is **UNVERIFIED**, not PASS and not FAIL. Earlier green runs on older SHAs are not transferable.
- The previous commit's recorded bounded checks remain: all 57 HTML-loaded public JS files fetched and inspected (57/57, zero direct server-module import matches); six forbidden and three permitted import fixtures passed 9/9 in a narrow Node assertion run. That is not execution of the complete newly wired test file or its GitHub Actions job.
- The current source test is `tests/day4-public-subscription-boundary.test.cjs`; `.github/workflows/smoke-tests.yml` includes `node --test tests/day4-public-subscription-boundary.test.cjs` exactly once.
- A fresh local checkout/test could not be obtained in this execution environment: read-only `git ls-remote` failed because `github.com` DNS could not be resolved. No local full-test PASS is claimed.

### PR #166 — `42a0ae602a158d4c04ab67f9a1801fe8637c1ec7`

- Exact-SHA PR-triggered workflow query returned **11/11 completed SUCCESS**, zero failures.
- Combined status endpoint returned no status records. The latest Issue #167 review note records 12/12 check runs SUCCESS, but that separate check-run count was not independently returned by the current status endpoint.
- This is CI/build evidence only. It does not prove physical native `saved` callback, exact-byte readback on the owner's device, physical Restore, or full real-PWA backup integration.
- Existing synthetic Save flow and import-preview evidence must not be repeated. No further APK build or phone action is warranted without separate owner approval.

## Scope and safety invariants

- Original five-day plan unchanged; Day 4 full acceptance remains false.
- `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`.
- `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`.
- No source-code changes, test reruns, APK build, device restore, personal data access/upload, merge, deploy, publication, payment, trade, order, holdings mutation or signal activation occurred in this recheck.

## Single next action

Obtain an exact-head **Smoke workflow_dispatch run** for PR #164 at `f5477a09eb5b862afded9537287d2855834be8b2`, then inspect its Smoke job and confirm the new boundary test executed. The available GitHub connector exposes workflow-run reads and reruns, but no workflow-dispatch action; no substitute write or unrelated CI run was attempted. If dispatch is not available to the owner, the next session must obtain that exact-head run through GitHub Actions before claiming the regression PASS.

After CI evidence is available, continue with the next non-duplicate Day 4 review only; do not repeat the 57-file inventory, 9 fixture assertions, Android synthetic Save/preview, or alter the five-day roadmap.
