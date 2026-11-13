# Sahamban — start here

This repository has a mandatory session-start protocol so work can continue safely across separate ChatGPT conversations and context-window resets.

1. Read [AGENTS.md](AGENTS.md) before making changes.
2. Read [SAHAMBAN_MASTER_PROGRESS.md](SAHAMBAN_MASTER_PROGRESS.md) to recover the latest project state, open work, blockers, and next steps.
3. Verify the current `main` SHA and search existing PRs/issues before implementing anything.
4. Continue incomplete work from its existing implementation; do not restart or duplicate it.

**Until PR #163 is merged**, these files exist only on its `docs/master-progress-audit-20261109` branch. In a new conversation, locate PR #163, confirm its state and latest head SHA, and read the proposed files from that branch if absent from `main`; do not assume they are already deployed or automatically loaded. After merge, use `main`.

The durable progress register must be updated at every meaningful handoff. Do not rely on chat history as the sole project record.
