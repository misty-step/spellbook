---
name: artifact-standard
description: "Before creating or reviewing an issue, pull request, work comment or durable report, explain the result for a reader without the conversation."
metadata:
  owner: phaedrus
  prevents: "2026-11-14: active agent guidance lived in a context vault, coupling instruction discovery to private data."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-14"
---

# Explain the work

Lead with the outcome, proposal or blocker and its important limit. Explain the
reader's problem, what changed, why the choice fits, and what it gives up. Keep
delivered behavior separate from plans and observed proof separate from inference.

Choose a natural shape and length; headings are not a required checklist. Use
plain words. Where a flow helps, show it. Put reproducible commands, identities
and logs in a collapsed evidence block while keeping risks and unmet criteria
visible. Never include secrets. Label retrospective comparisons honestly.

An evidence page puts real verification evidence above the fold, usually several pieces: a terminal recording, a diagram of the flow that now works, a video walkthrough or a production read. Back-end work is no exception. Above the fold, in order: what was done (one sentence), why it matters (one sentence), a little metadata, then the evidence. Everything else sits behind progressive disclosure. Make the page visual rather than prose, left-aligned, following the system theme and working at 390 px. Never use placeholders: state a missing proof as an unmet criterion. Gate: a critic agent with no context reads only the rendered page; if it can't explain the work or isn't confident it was done at high quality, the page fails.

Read the visible result cold: can a reader explain why it exists and what
changed? Check clarity and correctness separately. Link the approved rendered
artifact when one exists. The destination's context owns its URL, accepted
formats and access restrictions; read it before publishing private material.
This skill does not authorize sending, publication, merging, deployment,
spending or disclosure.
