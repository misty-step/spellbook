---
name: agent-design
description: "When crafting an agent's prompts, skills, AGENTS.md instructions, tools or context loading; misty owns the briefing contract."
metadata:
  owner: phaedrus
  prevents: "Q10 (Daybook decision 16): persona prose and duplicated guidance instead of exact instructions; inferred 90-day use on 2026-10-28: agent-design 5 and writing-for-agents 3 session families."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-11-27"
---

# Agent design

An instruction is the weakest way to change agent behavior. When a recurring
mistake can be caught by a lint, type, test or script, [encode the lesson](../misty/principles.md)
there and write no instruction. For what must stay prose, this is the instruction
and context contract:

1. **Observe and brief.** Start from corrections, a failing task or usage evidence, not a topic inventory. Reuse a skill whose trigger fits. [Misty's brief](../misty/SKILL.md#the-brief) owns dispatch: give a blank child raw inputs and the outside check, not the parent transcript. Done when the guidance has one behavioral job, an owner and an Oracle that distinguishes it from none, and the child can use the material independently.

2. **Place.** Mistystack owns maintained agent instructions, skills and harness primitives; Daybook holds contextual evidence, journals, documents, artifacts and scratchpads. Keep private host/vault facts in local context and use thin pointers to portable guidance, not behavioral copies in the vault. Repository and host standing instructions live in regular `AGENTS.md` files for every supported harness, including fixtures; Claude Code reads them natively. During consolidation, read both instruction files through existing symlinks, reconcile into `AGENTS.md`, then remove obsolete `CLAUDE.md` files or symlinks. Do not introduce new ones. Keep stable local facts and hard guardrails in standing context, task state in the task. Done when each fact has one home and each required document has a trigger-bearing pointer.

3. **Structure.** Front-load a pointer's leading word and name each distinct trigger branch. Keep common steps in SKILL.md and rare branches in sibling files. Put numbered actions before lookup material, co-locate rules with their definition, and give each step a checkable, exhaustive completion criterion. Read [context.md](context.md) for boundaries, invocation or cache layout. Done when each path reaches what it needs without loading unrelated branches.

4. **Contract.** Follow [the skill frontmatter contract](#skill-frontmatter). Keep routers discoverable and principle leaves reachable on demand. Done when frontmatter parses, names match directories and structural checks pass.

5. **Prune.** Use exact terms and precise leading words, not repeated definitions. State targets positively and pair a hard prohibition with the positive action. Cut model-default no-ops, persona, role-play, stale tool facts and copies of structural facts. Keep permissions in tool scope, configuration and credentials; prose is not a security boundary. Prefer native task state to a second ledger. Done when each instruction changes a decision or carries a needed local fact.

6. **Compare and deliver.** Exercise discovery and affected pointers in an isolated installation. Ship on the evidence you have: the correction that prompted the change, the vendor's guidance for the model in use, and your judgment. Prefer the simpler instruction. Use [Instruction eval](#instruction-eval) when a change is disputed or a wrong call would be expensive, not as a gate on every edit. Deliver through ship-loop and retain notices. At sunset, repair drift, consolidate weak triggers or delete ineffective guidance. Done when structural and consumer checks pass and the unit states its evidence and keep/delete decision under [Misty's reporting rules](../misty/SKILL.md#reporting). Watch the next sessions for the correction recurring.

## Skill frontmatter

Every skill directory exposes a `SKILL.md` whose `name` matches its directory and whose `description` is non-empty and trigger-first. Vendored skills keep their upstream metadata untouched; plugin lint validates their provenance and file hashes from the lock in `vendor/`. `recompile` and `setup-mistystack` remain explicit-only (`disable-model-invocation: true`).

For Misty-authored skills, `metadata.prevents` cites observed failure evidence, and `metadata.owner` and `metadata.sunset` identify who reviews drift and when. Short `metadata.source` values point to [ATTRIBUTION.md](../../ATTRIBUTION.md#skill-provenance), which owns full directory-level provenance including supporting files.

```yaml
---
name: <directory name>
description: "When to use it; trigger first."
metadata:
  owner: phaedrus
  prevents: "The observed failure this skill prevents."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-13"
---
```

Keep `metadata.sunset` a quoted ISO date string (`"YYYY-MM-DD"`) so YAML 1.1 readers such as PyYAML serialize the skill as JSON without turning bare dates into native date objects; plugin lint rejects unquoted dates. Model selectors and reasoning budgets belong in harness-native configuration described in each [harness note](../misty/SKILL.md), never inside shared skill prose or task-agent briefs.

## Instruction eval

Run three arms in native fresh sessions: current, candidate and no injected instructions. Blind them: each arm sees an ordinary user request in a project-shaped directory, with no word such as eval, judge, rubric or candidate in any path or prompt, and no hint that other arms exist. Do not ask an arm which instructions it applied; read which files it opened from its transcript and judge the shape of its work. Hold source, inputs, tools, model and limits fixed; vary only instructions. Select six real tasks from the top observed correction classes, with recoverable bases, verbatim requests and outside Oracles; do not invent a missing class. Trial a skill separately only when it replaces a skill actually used by those tasks.

Precommit tasks, repeats, judge-only rubric and promotion rule before runs. Keep arm identities outside candidate context and use neutral paths/labels. Retain complete transcripts, diffs, token usage and Oracle output outside the checkout. One independent blind judge grades sanitized artifacts and actual transcripts without arm/model identities: Oracle pass, net LOC, special cases, taste (domain fit, interface depth, reader load) and tokens, never response length. Missing checks stay unproven. Reveal arms only after grading; retain the candidate only if it beats both current and none under the precommitted rule. Otherwise retain the supported baseline or remove ineffective guidance. Report evidence, uncertainty and decision under [Misty's reporting rules](../misty/SKILL.md#reporting).

## Writing for current models

Current frontier models follow instructions closely and literally, so wording that was harmless padding for older models now changes behavior or costs tokens. Check a prompt, skill, `AGENTS.md`, memory file or brief against these before it ships, and again whenever the model changes. Each one is a measured effect in the model vendor's own guidance; [recompile](../recompile/SKILL.md) is the review that re-reads them on a capability jump.

- **Say why.** A rule with its reason and scope gets applied with judgment. A bare absolute gets applied everywhere, including where it does harm.
- **Put the exception in the rule.** "Do not deploy without the owner's go-ahead" works. "Never deploy", with the exception in another file or a later line, mostly does not.
- **Name what needs no approval.** A general "act freely" changes nothing. A list of the routine actions that need no approval does.
- **Say who owns the code.** A repository's `AGENTS.md` states whether it is the agent's to shape or someone else's to change minimally. Silence reads as someone else's, and the agent will add to a structure it should have merged.
- **Delete delegation mandates.** A line that tells the agent to use subagents will be obeyed on tasks that do not need them. State the cost and the conditions instead, as [Misty's delegation rules](../misty/SKILL.md#delegation) do.
- **No hard style limits.** Word counts, sentence-length caps and punctuation bans produce choppy prose. Describe the reader and what they need.
- **Do not ask for reasoning in the reply.** Ask for decisions, evidence and what was not covered. A request to reproduce internal reasoning can be refused outright by the model's safety layer.
- **Change effort, not adjectives.** "Think carefully" and "answer directly" are no-ops at most effort levels. Set the effort level in harness-native configuration.
- **Prune what piles up.** Cautions accumulate in notes, memory and messages between agents, some written by agents themselves. Delete the ones whose reason is gone. One stale "never retry" can stop routine recovery.
- **Do not layer.** One page that says the thing beats a base document plus a list of overrides. The reader has to reconcile them on every task and will sometimes pick the wrong one.
