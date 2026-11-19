---
name: foundation
description: "For a whole-project audit, new project setup or stack decision: run all twelve Foundation articles and make the project adhere."
metadata:
  owner: phaedrus
  prevents: "Unexamined project foundations and SDK-only proof; the owner requires every article checked (2026-10-27 ruling)."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-11-27"
---

# Foundation

The 2026-11-03 owner directive governs delivery through
[article 6](checklist.md#article-6). It supersedes `FND-REV-001`'s every-PR
review requirement; upstream Foundation references do not restore that merge
gate.

1. Read [the complete checklist](checklist.md), the one home of all twelve articles and their linked primitives, then audit every article and record deviations or missing evidence.
2. Establish the intended users, promised outcome, [SPEC.md](../define-product/SKILL.md) target state, repo decision records and actual-use evidence. Separate product obligations from inherited architecture assumptions. Ask what deserves to exist if starting today; preserving sound foundations is a valid result.
3. Check each article against the repository and running product: release identity, PostHog journeys, Sentry alerts, recovery and data evidence. Exercise a meaningful journey's success and failure; confirm privacy-safe events arrive and support useful analysis. Trigger an actionable error or uptime alert through the owned response path, attributed to environment and release. Exercise telemetry failure without stalling the product; check bounds on volume, retention, retries and cost. Installed SDKs are not acceptance. Use the `verification` skill for real-path proof and state-model checks.
4. Inspect committed verification output and oversized captured fixtures too. Move useful proof to external artifacts, update its links, then remove repository copies in focused cleanup PRs. Keep small deterministic fixtures that checks consume.
5. Record every article as pass, violation, recorded deviation or unverified, with its stable checklist anchor and evidence under [Misty's reporting rules](../misty/SKILL.md#reporting). Rank observed violations by user impact: exact location, failure and smallest repair. Check purpose, architecture, dependencies, delivery and operation together; a simpler module that burdens its callers is not a simpler system. Compare keeping the system with materially different alternatives; migration, compatibility and data safety are real costs.
6. Repair authorized violations directly through the [delivery procedure](../ship-loop/SKILL.md) so the running product converges on `SPEC.md` and all twelve articles (including `./scripts/check doctor`, `120s`/`300s` budgets, fail-closed surface closures and removal of per-push and `on: pull_request` CI or PR bots, leaving one light scheduled battery). The builder proves `./scripts/check fast`, affected `./scripts/check verify --changed` and the running path before merge; clean-runner Boat Merkle receipts plus one critical-correctness/security assessment gate the pinned release candidate. Record justified deviations beside the code in `docs/decisions/`, linked from `SPEC.md`. Keep owner-blocked or external gaps explicitly unverified (filing operational tracker items only for external prerequisites rather than creating a backlog from `SPEC.md`), and report adherence only when all twelve articles have evidence or a recorded decision.

## Stack defaults

Misty Step defaults to full-stack Rust on Cloudflare: Workers via workers-rs, UI compiled to WebAssembly, and Cloudflare D1, R2, KV, Durable Objects and Queues. Hosting is Cloudflare only: new work starts there; remaining hosting moves there. Model calls use OpenRouter, typed decisions use Jev, product analytics use PostHog, errors and uptime use Sentry.

These are defaults, not quality evidence. An exception records the story's needs, alternatives and tradeoff in a repo decision record linked from `SPEC.md`. The SPEC owns observable behavior; every checklist outcome still applies on any stack.
