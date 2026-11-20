# Routing reference

Which model, harness and effort to give an agent, and what to do when its seat stalls. This page is guidance: context, facts and light preferences with their reasons, written for agents and for decision models choosing a seat. Use judgment where the work in front of you differs from what a line describes. There is one strict rule, marked as such.

Every claim carries a date and a tag:

- **measured**: a number from a run or benchmark, with its source.
- **observed**: something seen on our own runs, not counted.
- **opinion**: a preference, with whose it is.

Owner: Karn. Hopper feeds run data. Karn reviews it weekly: each review checks for new model releases, benchmarks and heavy-user sentiment, adds or updates dated entries, and folds in Hopper's run data; last review 2026-11-19 (grounded in sources from 2026-10-17 to 2026-11-18, including GPT-6.2 and Gemini 4 Neon). Source decision: [MIS-1249](https://linear.app/misty-step/issue/MIS-1249), accepted 2026-11-17.

## The strict rule

Recompiles run only on GPT-6.2 Astra, Fable 5.2, Gemini 4 Carbon or Gemini 4 Neon, and their grader comes from a different model family than the author. (Phaedrus, 2026-11-14; GPT-6.2 Astra replaced GPT-6 Astra, 2026-11-17; Gemini 4 Neon added, 2026-11-19.)

## Model tiers

- **Frontier:** GPT-6.2 Astra, Fable 5.2, Gemini 4 Neon (preferred Gemini seat across the board), Gemini 4 Carbon. Use them for coordination, orchestration, strategy, planning, system design, architecture, release review, second opinions and other high-leverage, mission-critical work. (opinion, Phaedrus, 2026-11-17; Gemini 4 Neon added as preferred Gemini seat, 2026-11-19)
- **Workhorse:** GPT-6.2 Sol (the primary OpenAI workhorse), Gemini 4 Neon (the preferred Gemini workhorse), Opus 5.5, Gemini 4 Hydrogen (fast Gemini fallback; Argon superseded by Neon). Use them for most implementation. (opinion, Phaedrus, 2026-11-17; GPT-6.2 models replaced GPT-6 Astra and GPT-6.1 Sol the same day; Gemini 4 Neon preferred across Gemini seats, 2026-11-19)
- Sonnet 5.5 and GPT-6.1 Terra are left out of routing. (opinion, Phaedrus, 2026-11-17)
- A stalled workhorse slice moves to another workhorse before it moves up to Frontier, unless the slice turned out harder than briefed. Frontier capacity is for frontier work. (Phaedrus, 2026-11-17)

What the vendors say about each workhorse (all vendor claims, not reproduced):

- **Gemini 4 Neon** (released 2026-11-18) is Google's mid-tier reasoning and agentic coding model ($3/$15 per million tokens, $0.15 cached input, 1M context, `low`/`medium`/`high`/`xhigh` thinking). Google positions it near Carbon intelligence at ~32% lower cost per task at default `high` thinking, with 65.2% on Terminal-Bench 4.1 and higher baseline secure-coding scores than Carbon. (measured, vendor, 2026-11-18) Strongly prefer Neon over Argon and Carbon across Gemini seats unless a specific run justifies Carbon. (opinion, Phaedrus, 2026-11-19)

- **GPT-6.2 Sol** (released 2026-11-17) is the default workhorse for code, at 6.1 Sol's price of $2/$10 per million tokens against 6.2 Astra's $8/$40. OpenAI says it comes within 0.5 points of 6.2 Astra on FrontierCode 2.0 at about a fifth of the cost (both at max). (measured, vendor, 2026-11-17) Artificial Analysis puts it level with GPT-6 Astra on its Intelligence Index (57) at about 15% of the cost per task, but 3 points below 6.1 Sol on its Coding Agent Index (Codex at max effort), driven by answers that omit key facts. (measured, external, 2026-11-17) Day-one users split: several report Sol slow and prone to overengineering, and one found a third of Sol's C++ tasks needed cleanup by Astra. (opinion, external, 2026-11-17) Watch our own Sol runs; a stalled Sol slice goes to Opus 5.5 before Frontier.
- **GPT-6.2 Astra** costs 20% less per token than GPT-6 Astra and, OpenAI says, under a third as much per task on Agents' Last Exam while scoring higher. (measured, vendor, 2026-11-17) Artificial Analysis ranks it second on its Intelligence Index behind Fable 5.2, but flat with GPT-6 Astra on coding agents. (measured, external, 2026-11-17) Its system card reports it hid a known coding obstacle in 22.28% of trials against 11.09% for GPT-6 Astra; Codex's own instructions reduce that, so run it in Codex and hold it to the evidence rule. (measured, vendor system card via press, 2026-11-17)
- **Gemini 4 Hydrogen** (released 2026-11-12) is the fast Gemini worker. Google rates it above Argon on the Artificial Analysis index (51 against 50 at its default high thinking), at $1.50/$7.50 per million tokens, and pitches it as the worker under a Carbon coordinator. (measured, vendor, 2026-11-12) Prefer Hydrogen over Argon for Gemini implementation slices; Google also says Argon "remains the ideal choice for the majority of software engineering", and Carbon now costs the same as Argon ($2/$10), so a Carbon frontier seat costs no more per token than an Argon workhorse seat. (measured, vendor, 2026-11-10)
- **Opus 5.5** costs $4/$20 per million tokens, half of Fable 5.2's $8/$40. Anthropic says Fable 5.2 at high effort matches Opus 5.5's best FrontierCode 2.0 score at about half the cost per task. (measured, vendor, 2026-11-09) If that holds on our runs, Fable 5.2 at medium or high may be the cheaper Claude seat for hard slices; Hopper's run data decides. (opinion, Karn, 2026-11-17)

## Seats by task kind

| Work | Tier and seat | Effort | Why |
| --- | --- | --- | --- |
| Chief of staff, project owner, planning, architecture, bugs with unknown cause | Frontier | high | Mistakes here multiply through every slice below, and this is where vendors and users still find high pays. |
| Critical-tier build (auth, money, data integrity, migrations, deploys, shared infrastructure) | Frontier, never weaker than the dispatcher | high | The cost of a miss is larger than the tokens. |
| Release review, second opinion, recompile grading | Frontier, other family than the author | high | Same-family review repeats the author's blind spots. |
| Standard implementation with a clear brief | Workhorse, Sol first | medium | A clear brief carries the judgment; Sol is near-Astra at a fifth of the price. |
| Fully specified small slice, lookup, readback | Workhorse, Hydrogen or Sol | low | Speed matters more than depth. |
| Coordinator with parallel workers | Frontier coordinator, workhorse workers (for Gemini, Carbon over Hydrogen) | coordinator high, workers medium | Google measured near-Carbon success with 24% less quota using this split in Antigravity's Orchestrator. (measured, vendor, 2026-11-12) |
| Visual design | Claude Code first, Antigravity second, Codex and Prime Agent tied third | medium | Phaedrus's taste ranking. (opinion, Phaedrus, 2026-11-17) One hands-on review rated Antigravity's UI and UX best, with Claude Code close on visual design. (opinion, external, 2026-11-16) |

## Effort

- **Start at medium; raise it only for a reason.** Across 63 paired comparisons on 40 model and effort settings, lower effort was never significantly worse than higher effort on the same model, and was significantly better in six. (measured, OptiFlume, 2026-11-03) Higher effort also loses tasks that lower effort solved, and spends more on tasks every level solves. (measured, arXiv 2610.34491, 2026-10-25)
- **Long unattended runs default to medium, not high.** The old card said high; the evidence says high rarely pays for itself, and time limits punish it. Use high for the frontier rows above. (opinion, Karn, from the sources below, 2026-11-17)
- **Never use max as a default.** Max was the worst or tied-worst level for 5 of 7 models, mostly from running out of time, and cost 1.6 to 13.9 times the best-value level. (measured, OptiFlume, 2026-11-03) Anthropic warns max "may show diminishing returns and is prone to overthinking." (opinion, vendor, 2026-11)
- **xhigh only after a measured gain on our own tasks.** On SlopCodeBench, Astra and Sol did gain from xhigh while Opus 5.5 did not (28 strict passes at medium against 25 at xhigh), though that gap is within noise (p = 0.25). (measured, external, 2026-10)
- **Per-model starting points from the vendors:** for the GPT-6 and 6.1 generation OpenAI suggested Astra at low and Sol at the client's default; effort levels don't map between model generations, so re-test a familiar task. (opinion, vendor, 2026-11) Fable 5.2's API default is high, but Claude Code starts it at medium; Opus 5.5 defaults to medium. (observed, vendor docs, 2026-11-09)
- **GPT-6.2 at medium is good value.** In Artificial Analysis's numbers, 6.2 Astra gains 4.6 index points from medium to xhigh for 56% more cost per task, and 6.2 Sol at medium costs $0.41 a task against Opus 5.5's $2.45 at a higher score. (measured, external via a user-posted table, 2026-11-17)
- Set effort in the harness's native configuration (Claude Code keeps it per model in `modelSettings`); prompt wording does not change how much a model thinks. (observed, 2026-11)

## Harnesses

- Run a vendor's models in that vendor's own harness: Claude models in Claude Code, OpenAI models in Codex, Gemini models in Antigravity. In the November 2026 Conductor rebuild trial, the one seat that ran a vendor model through a neutral harness was the only build that would not start on its target runtime, the only metered bill and the only one to hang. (observed, 2026-11)
- Gemini runs only on Antigravity, so the Antigravity lane has to work whenever Gemini is in the plan. (observed, 2026-11-17) Boat's `boat prompt` command drives Claude Code and Codex but not Antigravity. (observed, Boat CLI 1.0.100, 2026-11-17)
- Prime Agent is a strong harness for any family. Open-weight models have fallen behind the frontier over the past month. (opinion, Phaedrus, 2026-11-17) Hopper is comparing OpenAI models in Prime Agent with the same task in Codex; the result lands under Run data.
- Claude Code on the shared account hit its usage limit during the morning of 2026-11-17, and runs fell over to Codex on GPT-6 Astra. (observed, 2026-11-17) Quota is live state: check it at launch, never from this page.

### How to launch each model

These are the requested native routes, not a claim that a model is currently
launchable. Boat's catalog is not evidence. The daily Daybook
[`model-launch-check`](https://github.com/moomooskycow/daybook/blob/master/scripts/box/model-launch-check.md)
records each actual launch, version, output, duration and failure in the box's
`~/.local/state/model-launch-check/latest-proof.md` (the latest proof below).
MIS-1284's initial live proof is **blocked by Boat authentication**; all rows
remain unverified until that check succeeds. No fallback is allowed in this check.

| Tier | Model | Harness | Model ID | Effort | Latest proof |
| --- | --- | --- | --- | --- | --- |
| Frontier | GPT-6.2 Astra | `codex` | `gpt-6.2-astra` | high | [box proof](#launch-proof) |
| Frontier | Fable 5.2 | `claude` | `claude-fable-5-2` | high | [box proof](#launch-proof) |
| Frontier | Gemini 4 Carbon | `agy` | `gemini-4-carbon-high` | high | [box proof](#launch-proof) |
| Workhorse | GPT-6.2 Sol | `codex` | `gpt-6.2-sol` | medium | [box proof](#launch-proof) |
| Workhorse | Opus 5.5 | `claude` | `opus-5-5` | medium | [box proof](#launch-proof) |
| Workhorse | Gemini 4 Argon | `agy` | `gemini-4-argon-high` | high | [box proof](#launch-proof) |
| Workhorse | Gemini 4 Hydrogen | `agy` | `gemini-4-hydrogen` | medium | [box proof](#launch-proof) |

<a id="launch-proof"></a>
The latest proof is the dated box file above, not this routing table. Read its
per-model result: `launched`, `quota` (missing evidence), or `broken`. A missing
or stale file proves nothing. Publish no weekly routing review until running
`model-launch-check --on-change --routing /path/to/skills/misty/routing.md` and
inspecting the proof. Karn reviews changes to this table.

Native command forms (the checker passes each row's exact ID):

- Codex: `codex exec --skip-git-repo-check --model MODEL -c 'model_reasoning_effort="EFFORT"' 'Reply with exactly MODEL_LAUNCH_OK. Do not use tools or access files.'`
- Claude Code: `claude -p --model MODEL --effort EFFORT --tools '' 'Reply with exactly MODEL_LAUNCH_OK. Do not use tools or access files.'`
- Antigravity: `agy --model MODEL --prompt 'Reply with exactly MODEL_LAUNCH_OK. Do not use tools or access files.'`; the Carbon/Argon effort is encoded in the model ID. Hydrogen uses its native default (the medium routing preference is not an extra CLI flag).

## Benchmarks

Treat every benchmark below as a vendor or third-party claim about its own task mix. None was reproduced here.

- **SlopCodeBench, October 2026.** Each model extends one Python codebase through three to eight checkpoints of changing requirements; strict pass means every new and regression test passes. Astra at xhigh led at 16.3% strict; frontier models ranged 12.2% to 16.3% strict and 65.8% to 74.0% core. One campaign per setting, so run-to-run variance is unknown. It predicts how well a model keeps a codebase working as requirements change; it does not predict our task mix, harness differences or design quality. (measured, external, 2026-10-27)
- **Anthropic's Fable 5.2 table.** Fable 5.2 leads 10 of 11 rows, including FrontierCode 2.0 (49.1% at xhigh against Opus 5.5 45.5%, Astra 42.8%, Carbon 41.1% at medium) and FrontierSWE v2 (69.9% against Astra 65.5%); Carbon leads AutomationBench (53.9%). Gaps are single digits and effort settings differ by column. (measured, vendor, 2026-11-09)
- **OpenAI's GPT-6.1 Sol post.** Sol matches Astra on DeepSWE 1.1 at about a fifth of the cost and comes within 2.1 points of Astra on OSWorld 2.0. (measured, vendor, 2026-11)
- **Artificial Analysis on GPT-6.2.** 6.2 Astra is second on the Intelligence Index behind Fable 5.2 and leads AA-3D; neither 6.2 model improved on the Coding Agent Index. One harness (Codex), max effort for the coding index. (measured, external, 2026-11-17)
- **OptiFlume effort study.** 820 Terminal-Bench 2.0 runs, 20 tasks, mostly through Claude Code; Codex was not measured. It predicts the shape of the effort curve; it does not rank models finely (intervals of about ±20 points). (measured, external, 2026-11-03)

## Stalls and handoffs

A seat is **stalled** when it hits a usage limit, crashes or errors, fails its lane readiness check, or shows no commits or progress events for 30 minutes and an inspection of the running command confirms it is not progressing. Slow but progressing, including a long compile, is not stalled; see [watchdog](../watchdog/SKILL.md). (Phaedrus, 2026-11-17)

- The agent that owns the work decides whether to switch; routers and sandboxes never do.
- A handoff carries a distilled brief (decisions and why, dead ends, what is half done, the next step), full access to the stalled agent's raw session and trace, and the branch. The next seat reads the brief first and digs into the trace when the brief falls short.
- There is no fixed fallback order. Pick the next seat from the task kind above and the cause of the stall: a usage limit points to the same tier on another family or account; a crash or loop points to a fresh session with the distilled brief; repeated no-progress on one model points to another family.
- A usage limit is missing evidence, not a failure: record it, rerun once, and report the gap rather than a score.
- After two switches on the same task without progress, stop and raise it to whoever owns the outcome.
- Never switch seats in a run that judges a single model (a benchmark or a qualification run).
- Launches and evidence name the harness, model and effort that actually ran, and which model wrote which commits.

## Bake-off results

Blind picks from [bakeoff](../bakeoff/SKILL.md) runs. Each one is a single data point about one kind of work. The owner's verdicts and his own words are recorded in Supercortex at [`taste/bakeoffs.md`](https://github.com/misty-step/supercortex/blob/main/taste/bakeoffs.md).

- **Evidence pages, MIS-1283, 2026-11-18.** Three lanes each wrote five pages from one brief: GPT-6.2 Astra (high effort) in Codex, Fable 5.2 in Claude Code, and Gemini 4 Carbon in Antigravity. Phaedrus judged the 15 shuffled pages blind. He liked 5 pages: GPT-6.2 Astra made 4 of them (1, 10, 13 and 15) and Fable 5.2 made 1 (11). He disliked 7: Astra made 1 (2), Fable 3 (3, 5 and 14) and Carbon 3 (4, 7 and 12). Carbon had no likes. (observed, [MIS-1283](https://linear.app/misty-step/issue/MIS-1283), 2026-11-18) This is one bake-off on one kind of design work. It points to GPT-6.2 Astra in Codex for report and evidence-page design, but it doesn't yet override the visual design row above, which comes from Phaedrus's harness ranking. (opinion, Karn, 2026-11-18)

## Run data

Hopper appends dated, measured results from our own runs here: task kind, seat, outcome, cost and duration. None yet.

## Sources

All read 2026-11-17.

- [SlopCodeBench October 2026 write-up](https://x.com/dexhorthy/status/2115115507183685850) and [the benchmark](https://scbench.ai), 2026-10.
- [Medium beat xhigh for Opus 5.5 on SlopCodeBench: the noise floor](https://yongboyu.hashnode.dev/medium-beat-xhigh-for-opus-5-5-on-slopcodebench-cost-per-pass-the-noise-floor-and-an-effort-a-b-for-your-repo), undated, after 2026-10-27.
- [Is xhigh reasoning effort worth it for a coding agent?](https://stackness.dev/blog/is-xhigh-reasoning-effort-worth-it-coding-agent-slopcodebench-numbers), 2026-10-27.
- [What Effort Level Should I Choose? On the Economics of Reasoning Effort in LLM Agents](https://arxiv.org/pdf/2610.34491), 2026-10-25.
- [Coding agent benchmark: 820 runs on models and effort](https://optiflume.ai/learn/model-benchmark-study), OptiFlume Research, 2026-11-03.
- [Introducing Claude Fable 5.2 and Claude Mythos 5.2](https://www.anthropic.com/claude-fable-and-mythos-5-2), Anthropic, 2026-11-09, and [Fable 5.2 model overview](https://platform.claude.com/docs/en/models/fable-5-2/overview).
- [Claude Fable 5.2 vs Opus 5.5, GPT-6 Astra, Gemini 4 Carbon](https://ahmetbalaman.com/en/blog/claude-fable-5-2-vs-opus-5-5-vs-gpt-6-astra-vs-gemini-4-carbon-en/), 2026-11-12 (compiles Anthropic's table).
- [Introducing GPT-6.1 Sol](https://openai.com/index/introducing-gpt-6-1-sol/), OpenAI, 2026-11.
- [Introducing Gemini 4 Hydrogen](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/), Google DeepMind, 2026-11-12.
- [I made Claude Code, Codex, and Antigravity work together on one project](https://www.xda-developers.com/made-claude-code-codex-antigravity-work-together-on-one-project-instead-of-competing/), XDA, 2026-11-02.
- [I challenged VS Code, Claude Code, and Google Antigravity to build an app in an hour](https://www.xda-developers.com/challenged-vs-code-claude-code-google-antigravity-build-app-hour/), XDA, 2026-11-16.
- [Introducing GPT-6.2 Astra and Sol](https://openai.com/index/introducing-gpt-6-2-astra-sol/), OpenAI, 2026-11-17.
- [OpenAI has the #2 model in the Intelligence Index with GPT-6.2](https://artificialanalysis.ai/articles/openai-has-the-2-model-in-the-intelligence-index-with-the-release-of-gpt-6-2-astra-and-gpt-6-2-sol), Artificial Analysis, 2026-11-17.
- [GPT-6.2 Astra and Sol discussion](https://news.ycombinator.com/item?id=50535230), Hacker News, 2026-11-17.
- [OpenAI releases GPT-6.2 Astra with first High self-improvement rating](https://www.unite.ai/openai-releases-gpt-6-2-astra-with-first-high-self-improvement-rating/), Unite.AI, 2026-11-17.
- [Gemini 4 Carbon is now available](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/), Google, 2026-11-10.
