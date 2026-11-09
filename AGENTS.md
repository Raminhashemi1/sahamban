# Sahamban repository operating instructions

## Mandatory session-start / context-reset protocol

These instructions apply to every new ChatGPT conversation, coding-agent session, context-window reset, or continuation after a chat/page reaches its capacity. Do not assume that prior chat history or model memory is available.

**Before answering a new implementation request with code changes, running project-changing commands, opening a PR, or continuing a task:**

1. Read `SAHAMBAN_MASTER_PROGRESS.md` from the current default branch.
2. Read the current `README.md` and inspect the current `main` HEAD SHA.
3. Search GitHub issues and PRs (open, closed, and merged) for the requested feature, bug, module, and related terms.
4. Inspect relevant files on `main`, plus any related open PR branches. Check PR state, base/head SHAs, changed-file lists, commits, review comments, checks/CI, and whether changes have actually been merged or deployed.
5. Reconstruct the latest known project state and identify the last completed step, the exact incomplete step, existing tests, blockers, and dependencies.
6. Classify the request as already implemented, partially implemented, proposed but unmerged, blocked, or not started.
7. If work is partial, continue from the existing code/branch and preserve prior implementation and tests. Never recreate a capability from scratch until confirming that no reusable implementation exists.
8. If the master progress register is stale or incomplete, update it as part of the work. Record exact PR/commit/CI references and clearly separate verified facts from assumptions.
9. Before writing, compare the current branch with the latest `main`; avoid duplicate commits, files, tests, and parallel implementations.
10. Do not merge, deploy, alter production/user data, or enable financial/trading decisions without explicit user approval.

## When project context is missing

If this file or the progress register cannot be read, or GitHub cannot be accessed, stop before making project changes. Explain what could not be verified and ask for access or the missing context. Do not guess project state.

## Evidence discipline

- A passing CI run is not proof of merge, deployment, or real-world data validation.
- A PR being open is not evidence that its code is on `main`.
- A feature being present in a file is not proof that production calls it.
- Record source, tests, callers, CI, and deployment state separately.
- Treat the master progress register as the durable handoff between sessions; update its "Next audit actions" and change log at each meaningful stopping point.

## Required first response in a fresh session

After completing the startup protocol, briefly tell the user:
- which master-progress revision / main SHA was reviewed;
- which related PRs or existing implementations were found;
- what is already complete and what remains incomplete;
- exactly where work will resume.

Do not ask the user to repeat information already recorded in the repository.
