# Exemplars

Favourite sources we learned from. An [Exemplar](../SPEC.md#terms) is a person, codebase or piece of writing whose perspective we deliberately channel in our workflows, skills, processes, applications and designs. Products show those perspectives in use.

Add an entry with a primary-source link, what to channel and any skill where it already appears. These are selected lenses, not blanket endorsements or requirements to copy a stack. Skills cite their sources in `metadata.source`. [ATTRIBUTION.md](../ATTRIBUTION.md) records adapted material and its licences. The locks under `vendor/` own the installed upstream skills. Other packs and tools below are reference material, not dependencies. Entries without an adoption note are references to study.

## People

- **[Jacob Sansbury — Written for Readers That Didn't Exist Yet](https://www.workbyjacob.com/thoughts/written-for-readers-that-didnt-exist-yet):** a record-first company, whole-outcome ownership, one mind builds while another attacks, and mechanical authority rather than inferred permission.
  Channel [recompiling the company from the vision](https://x.com/jsnnsa/status/2115671437575168084), not mandatory monthly rewrites; [recompile](../skills/recompile/SKILL.md) makes this a monthly and capability-triggered review against `SPEC.md`, with reversible live-data migration when stateful. [How We Build 2.0](https://www.workbyjacob.com/thoughts/how-we-build-2-0) offers four materially different variants so people can discover what they want. The other adaptations remain proposed in [#631](https://github.com/misty-step/mistystack/issues/631).
- [Nate Berkopec — There is only the spec](https://x.com/nateberkopec/status/2121374054016028943) ([homeostasis](https://x.com/nateberkopec/status/2121392732258341151), [on tickets](https://x.com/nateberkopec/status/2121394782115430712)): turning a spec into a ticket backlog introduces drift and lacks backpressure; `spec == impl` is homeostasis. [Define-product](../skills/define-product/SKILL.md) and [ADR 0028](decisions/0028-spec-drives-the-application.md) make `SPEC.md` the single upstream target state and reconcile drift directly against the running product without ticket materialization.
- [Linus Torvalds — Git data-design email](https://lwn.net/Articles/193245/): design around data and their relationships; remove special cases through representation. Already in `principle-deep-modules` through his good-taste lens.
- [John Ousterhout — the Ousterhout–Martin written debate](https://github.com/johnousterhout/aposd-vs-clean-code/), alongside [A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/book.php): deep modules and small interfaces. Already in `principle-deep-modules`; compare the disagreement rather than flattening it.
- [John Carmack — On Inlined Code, with his 2014 correction](https://number-none.com/blow/john_carmack_on_inlined_code.html): visible sequential execution, explicit dependencies and less unexpected state mutation.
- [Elon Musk — original Starbase tour interview](https://www.youtube.com/watch?v=t705r8ICkRw): question owned requirements, delete, simplify, accelerate, then automate; the manufacturing examples are not a software-wide instruction to delete tests.
- [Rich Hickey — Simple Made Easy](https://www.youtube.com/watch?v=LKtk3HCgTa8): reduce entanglement, distinguish simple from familiar and represent information as data.
- [Lauren Tan (poteto)'s pstack introduction](https://github.com/cursor/plugins/blob/main/pstack/README.md) and [skills](https://github.com/cursor/plugins/tree/main/pstack/skills) ground domain-shaped types, outside proof and structural lessons. pstack was the vendored baseline until [ADR 0026](decisions/0026-one-page-method.md); its ideas remain in `misty` and its principles.
- [Kent C. Dodds — The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications): confidence from use-shaped tests and the right boundary, not a universal ratio.
- [Robert C. Martin — The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html): keep business policy independent of framework and persistence; exchange simple structures across boundaries.
- [Boris Cherny — Claude Code best practices](https://www.anthropic.com/research/claude-code-best-practices): reusable workflows, independent challenge and real verification feedback. This authored historical essay is no longer maintained; use current documentation for commands.
- [Peter Steinberger — Shipping at Inference-Speed](https://steipete.me/posts/2025/shipping-at-inference-speed): scriptable CLIs that let agents act and verify, with human architectural judgment; his solo workflow is not a universal concurrency policy.
- [Brian Armstrong on lead agents and one review queue](https://x.com/brian_armstrong/status/2119112609223827547): every decision that needs the owner arrives in one prioritized queue, with screenshots and a video per product review, and his corrections are distilled so later drafts need fewer. Standing leads already map to [Misty's delegation rules](../skills/misty/SKILL.md#delegation) and [watchdog](../skills/watchdog/SKILL.md), and corrections to [encode the lesson](../skills/misty/principles.md). The queue is fleet runtime that belongs to workstation. His human review of every change is not adopted; [ship-loop](../skills/ship-loop/SKILL.md) keeps author-run proof.
- [Anthropic — Prompting Claude Fable 5.2](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2): a model that follows instructions closely needs fewer of them. Exceptions written into the rule, named actions that need no approval, stated code ownership, no hard style limits and no standing delegation mandates. [Agent-design](../skills/agent-design/SKILL.md#writing-for-current-models) carries the checklist and [ADR 0026](decisions/0026-one-page-method.md) applies it to this repository.
- [Addy Osmani — Critical thinking when agents do the work](https://x.com/addyosmani/status/2117512471930167377): for every green check, name one property it did not check, and ask the agent for the decisions it made on your behalf. Both are now lines in [Misty's report](../skills/misty/SKILL.md#reporting).
- [Matt Pocock on verifiability](https://x.com/mattpocockuk/status/2117953152376799498) and his prompt ["How do we make this change fully verifiable?"](https://x.com/mattpocockuk/status/2118313863917564136): with agents writing the code, a module that can be exercised alone in the owner's domain language matters more than one that is easy to skim. Step 2 of [Misty's loop](../skills/misty/SKILL.md#the-loop) asks his question before design.
- [Lauren Tan on adversarial review](https://x.com/poteto/status/2117437607940681849): review in the abstract gets lost in nitpicks, so spend those tokens on empirical and formal verification. [Misty's delegation rules](../skills/misty/SKILL.md#delegation) say the same.
- [zack on cheap experiments](https://x.com/zack_overflow/status/2117332503686230098): running the test is now faster than arguing from intuition, so be more empirical than your priors suggest. A fact an agent could observe is the agent's to observe, not the owner's to answer.
- [Gregor Zunic — Browser Use 1.0](https://x.com/gregpr07/status/2119984056171741282): they deleted 90 percent of the harness and it got better, cheaper and faster. The claim is theirs; the direction matches ours.

## Codebases

- [pstack by Lauren Tan (poteto)](https://github.com/cursor/plugins/tree/main/pstack) provided the mode, principles, playbooks and craft skills that [Misty](../skills/misty/SKILL.md) now restates on one page. Install pstack beside mistystack for its statechart and formal-verification tools.
- [Matt Pocock's skills](https://github.com/mattpocock/skills) informed shaping, domain language and instructions agents can follow. Current adaptations remain in `agent-design` and `research`. [Attribution](../ATTRIBUTION.md) preserves the sources of retired planning and prose adaptations.
- [Emil Kowalski's skills](https://github.com/emilkowalski/skills): design engineering and purposeful motion. Already in `design`.
- [Impeccable — Paul Bakaus](https://github.com/pbakaus/impeccable): interface critique, accessibility and polish. Already in `design`.
- [Taste — Leon Lin](https://github.com/Leonxlnx/taste-skill): deliberate visual choices rather than generic output.
- [Hallmark — Nutlope](https://github.com/Nutlope/hallmark): coherent design direction for coding agents.
- [Kody — Kent C. Dodds](https://github.com/kentcdodds/kody): an agent workflow to study; FSL-1.1 reference only, no copied material.
- [Nico Bailon, skill-diet](https://github.com/nicobailon/skill-diet): compare instructions with both their earlier form and no skill. The method lives in `agent-design`.
- [Entire](https://entire.com/blog/the-entire-cli-how-it-works-and-where-its-headed): durable checkpoint provenance that links code, agent sessions and attribution to commits instead of copying transcripts into every downstream artifact.
- [GitHub Spec Kit](https://github.github.com/spec-kit/): portable, agent-independent specifications and acceptance contracts.
- [Release Please](https://github.com/googleapis/release-please/): let one evolving release PR become the tagged release record; package publication remains a separate responsibility.
- [Remotion](https://www.remotion.dev/docs/ai/coding-agents): reproducible video from code and structured evidence, with a documented agent workflow.
- [Epic Stack](https://github.com/epicweb-dev/epic-stack): a coherent opinionated reference that reduces repeated setup decisions and unnecessary services; study the current repository, not an old stack list.
- [git-ai](https://github.com/git-ai-project/git-ai): durable line-level attribution linked to agents, models and prompts; attribution is not a quality verdict.

## Writing

- [Felix Rieseberg, “How to be more ambitious”](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/): deepen the method rather than inflate the scope. Already in `principle-deeper-not-bigger`.
- [Nico Bailon, pi-better](https://github.com/nicobailon/pi-better): runs Rieseberg's depth prompt as a read-only helper that reads the code first, and checks a subagent's brief cold before it starts. [Deepen](../skills/deepen/SKILL.md) is the harness-neutral version; pi users can install pi-better itself.
- [Martin Gratzer on slices](https://x.com/mgratzer/status/2114726996869595265): useful vertical slices and a concrete risk check. [Ship-loop](../skills/ship-loop/SKILL.md#1-settle-and-build-the-slice) owns author-run proof and delivery.
- [Kent C. Dodds, “Write tests. Not too many. Mostly integration.”](https://kentcdodds.com/blog/write-tests): confidence through behavior across real boundaries; Dodds credits Guillermo Rauch for the original slogan.
- [Linus Torvalds, Linux kernel coding style](https://github.com/torvalds/linux/blob/master/Documentation/process/coding-style.rst): simple code, clear ownership and maintainable interfaces.
- [Jakub Krehel, “Less is more, more or less”](https://jakub.kr/writing/less-is-more): subtraction follows understanding.
- [Agent Trace specification](https://agent-trace.dev/): interoperable human/AI contribution provenance with revision identity and conversation links; storage is implementation-defined and attribution does not prove quality.

## Products

- [TypeSafe](https://docs.typesafe.ai/): typed judgments as composable program primitives.
- [Linear](https://linear.app/docs/initiatives), [updates](https://linear.app/docs/initiative-and-project-updates) and [agents](https://linear.app/docs/agents-in-linear): steer operational coordination, external incidents and cross-repo objectives without duplicating `SPEC.md` into feature ticket backlogs.
- [Kiro](https://kiro.dev/docs/specs/) and [requirement analysis](https://kiro.dev/docs/specs/analyze-requirements/): reconsider contradictions, ambiguity and missing cases when specifications change.
- [Granola](https://docs.granola.ai/help-center/sharing/integrations/mcp): directly addressable meeting evidence and quotations under existing access scopes.
- [PostHog](https://posthog.com/docs/product-analytics/funnels) and [AI traces](https://posthog.com/docs/ai-observability): connect real user outcomes to behavior and agent costs; bounded path exploration is not funnel conversion measurement.
