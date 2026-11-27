---
name: foundations
description: "Baseline project-health standards and deterministic repo audit (misty-check.mjs) for every repository, with production observability, error and CSP capture, and auto-triage readiness as a default on anything deployed."
---

# Foundations

Run `node skills/foundations/scripts/misty-check.mjs [path]` for a fast baseline audit (to run it standalone in another repository, copy `misty-check.mjs` together with its sibling `misty-check-observability.mjs`; the script will not start without it); every maintained project should satisfy these foundations:

- **Active Folio — `PRODUCT.md`:** Present-tense observable user outcomes, domain terms, and non-goals with zero implementation lock-in — bootstrapped effortlessly from user intent and observed behavior where available when landing in a repo without one; record only product-specific intent or opt-outs (never restating universal or surface-class baselines), drive code via Folio reconciliation, and pair with `DESIGN.md` for UI projects so git owns history instead of stale ADR sprawl or ticket backlogs.
- **Active Folio — `DESIGN.md`:** For UI projects, product-specific visual craft, hierarchy, typography, and design tokens kept in parity with shipped stylesheets so a clean-room recompile preserves visual trust without repeating universal baselines.
- **Concise agent guide:** One short `AGENTS.md` (or `CLAUDE.md`) stating repository layout, ownership, and exact verify commands.
- **Agent ergonomics:** Every operation the user can take in the program is one an agent can take too — expose full CLI, API, or structured affordance parity, never GUI-only traps.
- **One-command local run:** Boot the app and local dependencies with a single documented command.
- **Deterministic fast gate:** Reproducible lint, typecheck, and test checks that fail closed without external flakiness.
- **Secret and env hygiene:** `.gitignore` excludes `.env*` and credentials; pre-commit/pre-push secret scanning gates commits; `.env.example` documents required variables.
- **Truthful health endpoint (`/healthz`):** Live runtime exposes `/healthz` (or `/api/health`; the audit accepts either) checking real service readiness and returning deployed commit or version identity — never a hardcoded stub.
- **Observability and auto-triage by default:** Non-negotiable on every deployed web app, worker, or service, from the first deploy and without anyone asking per project. Fail loudly with structured diagnostics; send server errors to a real error sink (Sentry, or platform observability such as Cloudflare Workers `observability.enabled`) tagged with release and environment; forward browser `error`, `unhandledrejection`, and `securitypolicyviolation` events so silent UI or CSP regressions scream immediately in production; and route production anomalies into automated incident triage for the human operator. Under a strict `connect-src 'self'` CSP, prefer a zero-SDK same-origin error beacon that the server forwards to Sentry or the error sink over loosening the policy for a vendor SDK.
- **Explicit state machines & formal verification:** Surface implicit lifecycle, protocol, billing, queue, retry, lock, and multiplayer states as explicit, small, total transition tables/machines with clear invariants — backed by formal specs (e.g., Quint or TLA+) where state-space bugs are costly — instead of scattering boolean flags across handlers.
- **Information-hiding modules & acyclic `uses` structure:** Hide each difficult or likely-to-change design decision behind one minimal-interface boundary rather than splitting by sequential flowchart steps sharing raw data structures; keep `uses` dependencies acyclic so lower levels never depend upward.
- **Deterministic Simulation Testing (DST) over unit-test sprawl:** For stateful, concurrent, multiplayer, billing, or queue-driven domains, prefer seeded deterministic simulators driving thousands of randomized valid and adversarial action sequences against explicit invariants over brittle piles of mocked unit tests.
- **Real-path verification:** Prove user-facing changes against the real running artifact on live or preview routes in a real headed browser (`0` `securitypolicyviolation`, `0` `console.error`/`pageerror`, `0` unexpected `4xx`/`5xx`, visible third-party embed mounting) — never relying on `/healthz` or stubbed/fake-billing dev modes alone; prefer recorded video walkthroughs or screenshots of live browser flows for UI changes.
- **Cross-family cold critic & calm editorial evidence:** Review meaningful slices with an independent model family reading only the diff, Active Folio, and real run proof (on Pass 3+, require a concrete failing fixture or reproduction proving a real defect or Active Folio violation before blocking so reviews don't thrash on edge-case golf), and present proof as visually-forward, human-legible evidence over dense dark HUD tables.
- **Zero mocks-as-proof:** Use test doubles only at true external boundaries; never present mocked passes as proof of shipped behavior.
- **Minimal dependencies and dead-code deletion:** Prefer standard library and deterministic scripts over sprawling wrappers; delete obsolete paths in the same slice.
- **Clean teardown:** Stop temporary servers, sandboxes, and scratch directories after collecting verification evidence.

## Surface-class baselines (3-Layer Intent Stack)

These conditional baselines apply by product kind without repeating them in repo Active Folios; opt out explicitly in `PRODUCT.md` Non-Goals when a baseline does not fit. `misty-check.mjs` runs lightweight, advisory-only surface-class detection (never failing `--strict` or penalizing custom/non-web layouts):

- **Web App:** Brand mark + multi-size favicon and Apple touch icon, mobile/desktop ergonomics (`390px` + `1440px`), light/dark parity, installable PWA basics (`manifest.webmanifest` + standalone viewport), and clean OG/meta tags.
- **Native / Desktop App:** OS-native conventions, system theme parity, clean permissions/clipboard hygiene, and a packaged/runnable artifact.
- **CLI / Service:** Crisp `--help`, non-interactive `--json`, and deterministic exit codes.
- **Evidence / Artifact / Retro:** A self-contained interactive HTML briefing (never a narrated slideshow video; see the `present` skill) with calm editorial layout, one focal idea per screen or beat, scannable tables (`<= 4` columns), and zero dark-HUD pill soup.

## Observability and auto-triage guard

`misty-check.mjs` audits every detected web app, worker, or service, because a deployed product that cannot report its own failures leaves the human operator to learn of them from users. Each gap carries an actionable fix in text and `--json` output (`observability`):

- **Health endpoint:** a real `/healthz` or `/api/health` route returning release or runtime identity, not a hardcoded stub.
- **Production telemetry:** Cloudflare Workers `observability.enabled` (or log forwarding) in `wrangler.*`, or server-side error reporting such as Sentry DSN wiring or OpenTelemetry.
- **Client error and CSP capture (web apps):** forwarded `securitypolicyviolation` plus `unhandledrejection` or `error` listeners (the zero-SDK same-origin beacon), or a Sentry client SDK.

Advisory by default (never changes the baseline score or `--strict`); pass `--strict-observability` to fail with exit code `1` on unallowed gaps, or on an incomplete scan (more than `2,000` scannable files, or an unreadable directory or file) that cannot rule a gap out. Opt out of a rule that does not fit, such as a CLI-only tool with a local preview server or a static library page, with an `observability:health`, `observability:config`, `observability:client-errors`, or `observability:*` line in `.misty-check.allow`, each carrying its justification as a comment.

## Structural layout guard (deep modules)

`misty-check.mjs` runs a language-agnostic layout audit flagging source directories with `> 15` source files and individual source files exceeding `2,000` lines (excluding generated, vendor, build, lock, docs, and fixture directories) so shallow file sprawl and mega-files surface before compounding:

- Advisory by default (never silently breaks `--strict` baseline scores); pass `--strict-layout` to fail with exit code `1` on unallowed findings.
- Grandfather intentional legacy files or directories in a repo-root `.misty-check.allow` file (one relative path or `*`/`**` glob per line, `#` comments and inline justifications supported, optional `wide-directory:` or `long-file:` rule prefix). A directory path or trailing `/` allows directory sprawl without hiding nested mega-files unless `dir/**` is specified.
- For Rust repositories needing semantic dependency-graph checks (cycles, tangles, field leaks), pair with [`deslop-please`](https://github.com/deterministic-machines/deslop-please).
