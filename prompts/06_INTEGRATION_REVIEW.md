# Sol Integration Review Prompt

Review the current DreamCraft branch as the integration owner.

1. Read `AGENTS.md`, `.ai-bridge/current-plan.md`, `.ai-bridge/contracts.md`, `.ai-bridge/decisions.md`, and `.ai-bridge/status.md`.
2. Inspect all worker diffs and the actual dependency graph.
3. Identify contract duplication, circular imports, ownership violations, dead code, feature-flag drift, unsafe boundary assumptions, and missing disposal/error paths.
4. Run the smallest tests that prove each subsystem, then run the integrated app in a browser.
5. Fix integration defects, but do not broaden scope.
6. Ask read-only `security_reviewer` and a QA/reviewer agent to independently inspect the result.
7. Reconcile findings, rerun checks, and update `.ai-bridge/status.md` with evidence.

The review is complete only when the current milestone gate is demonstrated end to end. Return concrete findings before summary praise.
