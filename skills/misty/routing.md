# Routing reference

Which model, harness and effort to give an agent, and what to do when its seat stalls. This page is guidance: context, facts and light preferences with their reasons, written for agents and for decision models choosing a seat. Use judgment where the work in front of you differs from what a line describes. There is one strict rule, marked as such.

Every claim carries a date and a tag:

- **measured**: a number from a run or benchmark, with its source.
- **observed**: something seen on our own runs, not counted.
- **opinion**: a preference, with whose it is.

Owner: Karn. Hopper feeds run data. Reviewed weekly; last review 2026-11-17 (first draft). Source decision: [MIS-1249](https://linear.app/misty-step/issue/MIS-1249), accepted 2026-11-17.

## The strict rule

Recompiles run only on GPT-6 Astra, Fable 5.2 or Gemini 4 Carbon, and their grader comes from a different model family than the author. (Phaedrus, 2026-11-14.)

## Model tiers

- **Frontier:** GPT-6 Astra, Fable 5.2, Gemini 4 Carbon. Use them for coordination, orchestration, strategy, planning, system design, architecture, release review, second opinions and other high-leverage, mission-critical work. (opinion, Phaedrus, 2026-11-17)
- **Workhorse:** GPT-6.1 Sol, Opus 5.5, Gemini 4 Argon, Gemini 4 Hydrogen. Use them for most implementation. Hydrogen is quick on simple tasks. (opinion, Phaedrus, 2026-11-17)
- Sonnet 5.5 and GPT-6.1 Terra are left out of routing. (opinion, Phaedrus, 2026-11-17)
- Frontier capacity is for frontier work, so a workhorse slice that stalls moves to another workhorse before it moves up a tier, unless the slice turned out harder than briefed. (opinion, inferred from the tier split, 2026-11-17)

## Seats by task kind

| Work | Tier | Effort | Why |
| --- | --- | --- | --- |
| Chief of staff, project owner, planning, architecture | Frontier | high when unattended, medium when interactive | Mistakes here multiply through every slice below. |
| Critical-tier build (auth, money, data integrity, migrations, deploys, shared infrastructure) | Frontier, never weaker than the dispatcher | high | The cost of a miss is larger than the tokens. |
| Release review, second opinion, recompile grading | Frontier, other family than the author | high | Same-family review repeats the author's blind spots. |
| Standard implementation with a clear brief | Workhorse | medium | A clear brief carries the judgment. |
| Fully specified small slice, lookup, readback | Workhorse, Hydrogen where it fits | low | Speed matters more than depth. |
| Visual design | Claude Code first, Antigravity second, Codex and Prime Agent tied third | medium | Phaedrus's taste ranking. (opinion, Phaedrus, 2026-11-17) |

Effort defaults (opinion, carried over from the earlier provisioning card, 2026-11-17): interactive work starts at medium, long unattended work at high, fully specified slices at low. Set effort in the harness's native configuration; prompt wording does not change how much a model thinks.

## Harnesses

- Run a vendor's models in that vendor's own harness: Claude models in Claude Code, OpenAI models in Codex, Gemini models in Antigravity. In the November 2026 Conductor rebuild trial, the one seat that ran a vendor model through a neutral harness was the only build that would not start on its target runtime, the only metered bill and the only one to hang. (observed, 2026-11)
- Gemini runs only on Antigravity, so the Antigravity lane has to work whenever Gemini is in the plan. (observed, 2026-11-17) Boat's `boat prompt` command drives Claude Code and Codex but not Antigravity. (observed, Boat CLI 1.0.100, 2026-11-17)
- Prime Agent is a strong harness for any family. Open-weight models have fallen behind the frontier over the past month. (opinion, Phaedrus, 2026-11-17) Hopper is comparing OpenAI models in Prime Agent with the same task in Codex; the result lands under Run data.
- Claude Code on the shared account hit its usage limit during the morning of 2026-11-17, and runs fell over to Codex Astra. (observed, 2026-11-17) Quota is live state: check it at launch, never from this page.

## Benchmarks

**SlopCodeBench, October 2026** ([write-up](https://x.com/dexhorthy/status/2115115507183685850), [benchmark](https://scbench.ai), read 2026-11-17). Each model extends one Python codebase through three to eight checkpoints of changing requirements; strict pass means every new and regression test passes.

- Astra at xhigh had the most strict passes, 16.3%, two checkpoints ahead of Sol 6.1 at medium. Frontier models ranged 12.2% to 16.3% strict and 65.8% to 74.0% core. (measured, external)
- Higher effort cost 2.11 to 4.22 times as much as medium and did not reliably buy strict passes. Opus 5.5 scored 28 strict at medium and 25 at xhigh. Astra and Sol did improve at xhigh. (measured, external)
- Sol 6.1 at medium was the cheapest run, $178.51, with the same strict count as Astra at medium; Fable cost about 8.68 times as much with three fewer strict passes. (measured, external)
- What it predicts: how well a model keeps a codebase working as requirements change, and what extra effort buys on that. What it does not: our task mix, harness differences, design quality, or run-to-run variance (one campaign per setting).
- So: default workhorse coding to medium effort; reach for xhigh only on Astra or Sol, and only where a slice's result justifies the cost. (opinion, Karn, 2026-11-17)

## Stalls and handoffs

A seat is **stalled** when it hits a usage limit, crashes or errors, fails its lane readiness check, or shows no commits or progress events for 30 minutes. Slow but progressing is not stalled. (Phaedrus, 2026-11-17)

- The agent that owns the work decides whether to switch; routers and sandboxes never do.
- A handoff carries a distilled brief (decisions and why, dead ends, what is half done, the next step), full access to the stalled agent's raw session and trace, and the branch. The next seat reads the brief first and digs into the trace when the brief falls short.
- There is no fixed fallback order. Pick the next seat from the task kind above and the cause of the stall: a usage limit points to the same tier on another family or account; a crash or loop points to a fresh session with the distilled brief; repeated no-progress on one model points to another family.
- A usage limit is missing evidence, not a failure: record it, rerun once, and report the gap rather than a score.
- After two switches on the same task without progress, stop and raise it to whoever owns the outcome.
- Never switch seats in a run that judges a single model (a benchmark or a qualification run).
- Launches and evidence name the harness, model and effort that actually ran, and which model wrote which commits.

## Run data

Hopper appends dated, measured results from our own runs here: task kind, seat, outcome, cost and duration. None yet.
