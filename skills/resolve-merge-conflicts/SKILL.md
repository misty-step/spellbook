---
name: resolve-merge-conflicts
description: "Resolve Git merge conflicts by extracting only unresolved paths, conflict hunks, and compact diffs with scripts/extract_conflict_context.py."
---

# Resolve merge conflicts

Run `python3 skills/resolve-merge-conflicts/scripts/extract_conflict_context.py` to list conflicted files and inspect one file at a time with `--file <path>` (or `--all` / `--json`) instead of loading whole conflicted files into context. Resolve each file deliberately — taking one whole side with `git checkout --ours|--theirs -- <path>` when appropriate, or editing individual hunks manually — then run targeted tests or builds for the touched area. Stage resolved files with `git add`, then confirm zero conflict markers or unmerged paths remain via `git diff --cached --check`, `git grep -nE '^(<{7}|={7}|>{7})( |$)' -- <resolved-paths>`, and `git diff --name-only --diff-filter=U`.
