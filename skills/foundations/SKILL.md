---
name: foundations
description: "Baseline project-health standards and deterministic repo audit (misty-check.mjs) for every repository."
---

# Foundations

Run `node skills/foundations/scripts/misty-check.mjs [path]` for a fast baseline audit; every maintained project should satisfy these foundations:

- **Active Folio — `PRODUCT.md`:** Present-tense user stories, domain terms, and non-goals with zero implementation details; paired with `DESIGN.md`, this Active Folio replaces stale ADR sprawl while git owns history.
- **Active Folio — `DESIGN.md`:** For UI projects, living visual tokens, typography, and layout invariants kept in parity with shipped stylesheets.
- **Concise agent guide:** One short `AGENTS.md` (or `CLAUDE.md`) stating repository layout, ownership, and exact verify commands.
- **Agent ergonomics:** Every operation the user can take in the program is one an agent can take too — expose full CLI, API, or structured affordance parity, never GUI-only traps.
- **One-command local run:** Boot the app and local dependencies with a single documented command.
- **Deterministic fast gate:** Reproducible lint, typecheck, and test checks that fail closed without external flakiness.
- **Secret and env hygiene:** `.gitignore` excludes `.env*` and credentials; pre-commit/pre-push secret scanning gates commits; `.env.example` documents required variables.
- **Truthful health endpoint (`/healthz`):** Live runtime exposes `/healthz` checking real service readiness and returning deployed commit or version identity — never a hardcoded stub.
- **Loud errors, production monitoring, and automated incident triage:** Fail loudly with structured diagnostics, wire real production monitoring from day one, forward client-side `securitypolicyviolation` events and unhandled browser errors/rejections to Sentry so silent UI or CSP regressions scream immediately in production, and route production anomalies into automated incident triage with release and environment context for the human operator.
- **Periodic implicit-state-machine formal verification:** Periodically surface and formally verify implicit state machines (lifecycle transitions, retries, locks, and idempotency invariants) so hidden races and impossible states are caught before production.
- **Real-path verification:** Prove user-facing changes against the real running artifact on live or preview routes in a real browser (`0` `securitypolicyviolation`, `0` `console.error`/`pageerror`, `0` unexpected `4xx`/`5xx`, visible third-party embed mounting) — never relying on `/healthz` or stubbed/fake-billing dev modes alone; prefer recorded video walkthroughs or screenshots of live browser flows for UI changes.
- **Zero mocks-as-proof:** Use test doubles only at true external boundaries; never present mocked passes as proof of shipped behavior.
- **Minimal dependencies and dead-code deletion:** Prefer standard library and deterministic scripts over sprawling wrappers; delete obsolete paths in the same slice.
- **Clean teardown:** Stop temporary servers, sandboxes, and scratch directories after collecting verification evidence.
