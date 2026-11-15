---
name: daybook-dream
description: "When the authorized Daybook maintenance runner requests its nightly organization pass or weekly digest in its owned clone."
metadata:
  owner: phaedrus
  prevents: "2026-11-14: active agent guidance lived in a context vault, coupling instruction discovery to private data."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-14"
---

# Daybook maintenance

Locate the vault through [daybook](../daybook/SKILL.md) and read its local context,
`meta/NOW.md` and the runner's prompt. This skill applies inside the runner-owned
clone; it does not authorize starting a maintenance job in another workspace.
The runner regenerates navigation, rejects journal changes, scans secrets and
owns Git publication. **Edit files only; do not commit, push, rebase or switch
branches.** Never edit `journal/` or credentials.

## Nightly

1. Inspect the changes selected by the prompt, excluding human-journal bodies,
   secrets and raw transcript stores. Organize only where new evidence warrants it.
2. Repair unambiguous moved/renamed targets in `meta/link-report.md`. Leave
   ambiguous claims and intentional future links intact.
3. Improve weak note descriptions from their content, up to 20 per pass. Mark
   historical/superseded material only when its source establishes that status.
4. Consolidate genuine duplicates while preserving every unique fact, human
   wording, attribution, `created`, and unresolved contradiction. Repair inbound
   links. Do not merge merely similar people, projects or claims.
5. Refresh handwritten NOW priorities/status from dated evidence. Generated
   activity blocks and `context/INDEX.md` are outputs of `scripts/navigation.py`;
   edit their sources instead. Old plans do not become new assignments.
6. Inspect the diff, run the synthesis check described by
   [verify-daybook](../verify-daybook/SKILL.md) for new syntheses, and verify links
   affected by moves. End with a brief summary of changes, unknowns and failures;
   the runner includes it in its commit.

## Weekly digest

When requested, inspect the last seven days of maintenance commits and diffs.
Group changes by purpose, identify unresolved conflicts and missing/failed days,
without copying private note bodies into the digest. A day with no justified
edits may still have successful regenerated navigation.

The vault's data specification owns schedule and installation facts. Proof is
an actual maintenance commit on the remote, an unchanged human-journal tree
against its parent, and the runner's successful completion state. A loaded job
or process exit alone is not proof of publication.
