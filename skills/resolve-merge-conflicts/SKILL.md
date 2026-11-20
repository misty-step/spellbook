---
name: resolve-merge-conflicts
description: "Resolve Git merge conflicts by extracting only unresolved paths, conflict hunks, and compact diffs with scripts/extract_conflict_context.py."
---

# Resolve merge conflicts

Run `python3 skills/resolve-merge-conflicts/scripts/extract_conflict_context.py` to list conflicted files and inspect one file at a time with `--file <path>` (or `--all` / `--json`) instead of loading whole conflicted files into context. Resolve each hunk deliberately — choosing `--ours`, `--theirs`, or a clean manual merge — and verify zero conflict markers or unmerged paths remain via `git diff --name-only --diff-filter=U`. Run targeted tests or builds for the touched area before staging the resolved files.
