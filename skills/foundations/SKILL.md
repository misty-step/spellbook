---
name: foundations
description: "Baseline project-health standards and deterministic repo audit (misty-check.mjs) for every repository."
---

# Foundations

Run `node skills/foundations/scripts/misty-check.mjs [path]` for a fast baseline audit; every maintained project should satisfy these foundations:

- **Active Folio — `PRODUCT.md`:** Present-tense observable user outcomes, domain terms, and non-goals with zero implementation lock-in — bootstrapped effortlessly from user intent and observed behavior where available when landing in a repo without one; record only product-specific intent or opt-outs (never restating universal or surface-class baselines), drive code via Folio reconciliation, and pair with `DESIGN.md` for UI projects so git owns history instead of stale ADR sprawl or ticket backlogs.
- **Active Folio — `DESIGN.md`:** For UI projects, product-specific visual craft, hierarchy, typography, and design tokens kept in parity with shipped stylesheets so a clean-room recompile preserves visual trust without repeating universal baselines.
- **Concise agent guide:** One short `AGENTS.md` (or `CLAUDE.md`) stating repository layout, ownership, and exact verify commands.
- **Agent ergonomics:** Every operation the user can take in the program is one an agent can take too — expose full CLI, API, or structured affordance parity, never GUI-only traps.
- **One-command local run:** Boot the app and local dependencies with a single documented command.
- **Deterministic fast gate:** Reproducible lint, typecheck, and test checks that fail closed without external flakiness.
- **Secret and env hygiene:** `.gitignore` excludes `.env*` and credentials; pre-commit/pre-push secret scanning gates commits; `.env.example` documents required variables.
- **Truthful health endpoint (`/healthz`):** Live runtime exposes `/healthz` checking real service readiness and returning deployed commit or version identity — never a hardcoded stub.
- **Loud errors, production monitoring, and automated incident triage:** Fail loudly with structured diagnostics, wire real production monitoring from day one, forward client-side `securitypolicyviolation` events and unhandled browser errors/rejections to Sentry so silent UI or CSP regressions scream immediately in production, and route production anomalies into automated incident triage with release and environment context for the human operator.
- **Explicit state machines & formal verification:** Surface implicit lifecycle, protocol, billing, queue, retry, lock, and multiplayer states as explicit, small, total transition tables/machines with clear invariants — backed by formal specs (e.g., Quint or TLA+) where state-space bugs are costly — instead of scattering boolean flags across handlers.
- **Deterministic Simulation Testing (DST) over unit-test sprawl:** For stateful, concurrent, multiplayer, billing, or queue-driven domains, prefer seeded deterministic simulators driving thousands of randomized valid and adversarial action sequences against explicit invariants over brittle piles of mocked unit tests.
- **Real-path verification:** Prove user-facing changes against the real running artifact on live or preview routes in a real browser (`0` `securitypolicyviolation`, `0` `console.error`/`pageerror`, `0` unexpected `4xx`/`5xx`, visible third-party embed mounting) — never relying on `/healthz` or stubbed/fake-billing dev modes alone; prefer recorded video walkthroughs or screenshots of live browser flows for UI changes.
- **Cross-family cold critic & calm editorial evidence:** Review meaningful slices with an independent model family reading only the diff, Active Folio, and real run proof (on Pass 3+, require a concrete failing fixture or reproduction proving a real defect or Active Folio violation before blocking so reviews don't thrash on edge-case golf), and present proof as visually-forward, human-legible evidence over dense dark HUD tables.
- **Zero mocks-as-proof:** Use test doubles only at true external boundaries; never present mocked passes as proof of shipped behavior.
- **Minimal dependencies and dead-code deletion:** Prefer standard library and deterministic scripts over sprawling wrappers; delete obsolete paths in the same slice.
- **Clean teardown:** Stop temporary servers, sandboxes, and scratch directories after collecting verification evidence.

## Surface-class baselines (3-Layer Intent Stack)

These conditional baselines apply by product kind without repeating them in repo Active Folios; opt out explicitly in `PRODUCT.md` Non-Goals when a baseline does not fit. `misty-check.mjs` runs lightweight, advisory-only surface-class detection (never failing `--strict` or penalizing custom/non-web layouts):

- **Web App:** Brand mark + multi-size favicon and Apple touch icon, mobile/desktop ergonomics (`390px` + `1440px`), light/dark parity, installable PWA basics (`manifest.webmanifest` + standalone viewport), and clean OG/meta tags.
- **Native / Desktop App:** OS-native conventions, system theme parity, clean permissions/clipboard hygiene, and a packaged/runnable artifact.
- **CLI / Service:** Crisp `--help`, non-interactive `--json`, and deterministic exit codes.
- **Evidence / Artifact / Retro:** Calm editorial layout, one focal idea per screen or beat, scannable tables (`<= 4` columns), and zero dark-HUD pill soup.
