# 0030: Five-stage flow is the default; pstack returns as a pinned companion

Status: accepted, 2026-11-17 (Phaedrus, chat:phaedrus/t3545u via Kaylee; [MIS-1277](https://linear.app/misty-step/issue/MIS-1277)).
Refines [0026](0026-one-page-method.md): the method stays one page and pstack stays unvendored, but pstack is now a pinned companion pack.

## Context

Lauren Tan, pstack's author, ships every feature through five stages, [as summarized here](https://x.com/0xMorlex/status/2117247463119532278): understand (`how`, then `why`, with no code changes yet), design (`architect`, `arena`, `interrogate`; prototypes before plans), build (`poteto-mode`: repro, pin behavior, profile first), verify (`verify-<app>`, with a video as proof) and ship (watch the pull request; merge-ready, with a decision log). Her game postmortem ([post](https://x.com/poteto/status/2117043478140276847)) adds harness lessons: every bug found became a lint rule, TLA+ found bugs in each major state machine, and file paths carry context (`.hot.ts` files, where a lint bans allocation). David Khourshid argues explicit state machines are the better default because agents are not deterred by upfront modeling ([post](https://x.com/DavidKPiano/status/2115452859713982540)).

Mistystack's loop already held most of this in seven numbered steps. It lacked the read-before-write stage, the prototype rule, video proof and the decision log as defaults, and it treated state machines as a remedy rather than a starting point.

## Decision

- [Misty's loop](../../skills/misty/SKILL.md#the-loop) is the five stages. Each stage names its pstack skill and keeps Misty Step's own rules for approvals, models and delivery; a harness without pstack does the stage's job directly.
- pstack is pinned by full SHA in `.claude-plugin/marketplace.json` (`cursor/plugins` `536a3352a050e47cb75f86be497ea304ef342301`, path `pstack`). This reverses 0026's "pstack is not added" line only; nothing is vendored.
- [Principles](../../skills/misty/principles.md#structure-over-vigilance) gain: explicit state machines by default, formal verification for machines whose order or concurrency matters, every bug becomes a lint rule, and context in the path.
- Rules live here; repository tooling (lint packs, the `.hot.ts` rule, model-checker wiring, Boat snapshots that install pstack at this pin) is Hopper's, tracked separately.

## Consequences

- Boat agents that load mistystack follow the five stages by default. Installing pstack on their snapshots is the remaining step for the named skills to resolve; until then the fallback sentence applies.
- pstack updates arrive only by moving the pin.
- Revisit if a stage shows up as a repeated correction or as cost without benefit in friction notes.
