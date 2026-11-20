---
name: resolve-merge-conflicts
description: "Resolve Git merge conflicts by extracting only unresolved paths, conflict hunks, and compact diffs with scripts/extract_conflict_context.py."
---

# Resolve merge conflicts

Run `python3 skills/resolve-merge-conflicts/scripts/extract_conflict_context.py` to list conflicted files and inspect one file at a time with `--file <path>` (or `--all` / `--json`) instead of loading whole conflicted files into context. Resolve each file deliberately — taking one whole side with `git checkout --ours|--theirs -- <path>` when appropriate, or editing individual hunks manually — then run targeted tests or builds and confirm no conflict markers remain via `git diff --check`. Stage the resolved files with `git add` and verify zero unmerged paths remain with `git diff --name-only --diff-filter=U`.
