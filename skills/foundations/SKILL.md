---
name: foundations
description: "Baseline project-health standards and deterministic repo audit (misty-check.mjs) for every repository."
---

# Foundations

Run `node skills/foundations/scripts/misty-check.mjs [path]` for a fast baseline audit; every maintained project should satisfy these foundations:

- **Present-tense `PRODUCT.md`:** User stories, domain terms, and non-goals with zero implementation details.
- **Living `DESIGN.md`:** For UI projects, visual tokens, typography, and layout invariants kept in parity with shipped stylesheets.
- **Concise agent guide:** One short `AGENTS.md` (or `CLAUDE.md`) stating repository layout, ownership, and exact verify commands.
- **One-command local run:** Boot the app and local dependencies with a single documented command.
- **Deterministic fast gate:** Reproducible lint, typecheck, and test checks that fail closed without external flakiness.
- **Secret and env hygiene:** `.gitignore` excludes `.env*` and credentials; pre-commit/pre-push secret scanning gates commits; `.env.example` documents required variables.
- **Health endpoint (`/healthz`):** Live runtime exposes `/healthz` returning service health and deployed commit or version identity.
- **Actionable error reporting:** Unhandled exceptions and broken journeys surface to the human operator with release and environment context.
- **Real-path verification:** Prove user-facing changes against the real running artifact; prefer recorded video walkthroughs or screenshots of live browser flows for UI changes.
- **Zero mocks-as-proof:** Use test doubles only at true external boundaries; never present mocked passes as proof of shipped behavior.
- **Minimal dependencies and dead-code deletion:** Prefer standard library and deterministic scripts over sprawling wrappers; delete obsolete paths in the same slice.
- **Clean teardown:** Stop temporary servers, sandboxes, and scratch directories after collecting verification evidence.
