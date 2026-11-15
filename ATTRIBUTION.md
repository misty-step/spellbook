# Attribution

Mistystack vendors and adapts the material listed below. Misty Step owns the method, and upstream authors do not endorse this plugin. Reference-only reading is listed in [docs/exemplars.md](docs/exemplars.md).

Misty-authored skills keep a short source identity and pointer in `metadata.source`; [Skill provenance](#skill-provenance) owns their complete directory-level source records. Supporting files carry no frontmatter. Retain contributing upstreams, required copyright and licence notices and identify modifications; moving a file does not remove attribution.

pstack is no longer vendored ([ADR 0026](docs/decisions/0026-one-page-method.md)). From 2026-11-02 to 2026-11-10 mistystack installed the pstack tree at `cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack`; Git history holds those bytes and their lock. The current method page, its principles and several task skills were shaped by pstack's structure and ideas and restate some of them in our own words, so the MIT notice below is retained.

## Source map

| Upstream revision | Material adapted here | Licence |
| --- | --- | --- |
| [pstack at `c742dd6`](https://github.com/cursor/plugins/tree/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack) | Not installed. Its mode, principles and playbooks informed `misty`, `skills/misty/principles.md`, agent-design, setup, verification, design, ship-loop, research and test-audit. | MIT, Lauren Tan |
| [mattpocock/skills@59db609eb1e18aaf59b63284d0e52255aff0c63c](https://github.com/mattpocock/skills/tree/59db609eb1e18aaf59b63284d0e52255aff0c63c) | Shaping, research, domain-language and agent-writing methods from `grill-me`, `grilling`, `grill-with-docs`, `to-spec`, `to-tickets`, `domain-modeling`, `writing-for-agents`, `research` and `pr`. | MIT, Matt Pocock |
| [mattpocock/skills, revision and files in the Pocock lock](vendor/pocock.lock.json) | `grilling`, `grill-me`, `grill-with-docs`, `domain-modeling`, `to-questionnaire` and `retro`, vendored unchanged and routed by `misty` ([ADR 0024](docs/decisions/0024-pocock-shaping-skills.md), narrowed by [ADR 0028](docs/decisions/0028-spec-drives-the-application.md)). | MIT, Matt Pocock |
| [warpdotdev/common-skills, revision and files in the Warp lock](vendor/warp.lock.json) | `merge-risk` and `resolve-merge-conflicts`, including its conflict extractor, vendored unchanged; Misty and ship-loop route their use, and the names adapter resolves installed script paths ([ADR 0024 extension](docs/decisions/0024-pocock-shaping-skills.md#extension-multiple-unchanged-upstreams)). | MIT, Denver Technologies, Inc. |
| [humanlayer/skills@653b6411c1f70c275a18e37673b042ff99f67ceb](https://github.com/humanlayer/skills/tree/653b6411c1f70c275a18e37673b042ff99f67ceb/plugins/show-me/skills/show-me) | Historical smallest-useful-visual guidance in the retired Misty publications procedure. Its notice remains for prior adaptations. | MIT, HumanLayer |
| [emilkowalski/skills@2d228630ba1446365f614a108cb8252f1feda202](https://github.com/emilkowalski/skills/tree/2d228630ba1446365f614a108cb8252f1feda202) | `emil-design-eng`, animation vocabulary, animation performance, animate and motion-review methods rewritten in `skills/design/`. | MIT, Emil Kowalski |
| [pbakaus/impeccable@5adaee704634e9031ec8943721c4ffa1a3c22221](https://github.com/pbakaus/impeccable/tree/5adaee704634e9031ec8943721c4ffa1a3c22221) | Critique, polish and audit references rewritten in `skills/design/`; modified by Misty Step for its review contract and reduced scope. No upstream executable is bundled. | Apache-2.0, Paul Bakaus |
| [cloudflare/security-audit-skill@c1c8a8c1471069fb0e188eeaff69b8e8db6564a8](https://github.com/cloudflare/security-audit-skill/tree/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8) | Focused finding review and `skills/security-audit/references/safety.md`, adapted by Misty Step; local licence retained. The full-audit workflow, companions, schema and validators are read from upstream at this pin only when a full audit is explicitly commissioned; they are not bundled. | MIT, Cloudflare, Inc. |
| [openclaw/openclaw@80930af448ebabc84174146b56bc106d37fab3b4](https://github.com/openclaw/openclaw/tree/80930af448ebabc84174146b56bc106d37fab3b4/.agents/skills/test-audit) | `skills/test-audit`, previously adapted by Misty Step; local licence retained. | MIT, OpenClaw Foundation |
| [misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7](https://github.com/misty-step/foundations/tree/d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7) | Constitution and way of working in core, principles, method skills and Foundation. The canonical checklist was copied from the live production `index.md`, with stable anchors and the approved vocabulary sentence added. | MIT, Misty Step |
| [misty-step/omp-config@1c6c749e70dfe11975a8622b2d5fd45104ba74e1](https://github.com/misty-step/omp-config/tree/1c6c749e70dfe11975a8622b2d5fd45104ba74e1) and [misty-step/mistystack@0ccc1a308cdeefa29e991d3b7c1dbab016cfea03](https://github.com/misty-step/mistystack/tree/0ccc1a308cdeefa29e991d3b7c1dbab016cfea03) | Misty Step's existing foundation reasoning, method skills, evidence and shipping procedures, moved or rewritten into this plugin. | Misty Step material; this repository's licence governs its contributions. |
| Private `misty-step/workstation@e82812ec29cbef7814db697b6a7b190d8ecf6b8d`, `skills/remote-execution` | Source of Boat placement, credential and cleanup safety, rewritten for one snapshot-backed worker per slice under the 2026-11-03 owner directive. | Misty Step material; this repository's licence governs its contributions. |
| Installed Misty Step `evidence-packet/SKILL.md`, SHA-256 `08fb52a436fbc663c59648b9b07b87a9c3d3f782c5fd7f55a5568be886f78923` | Evidence method folded into `skills/verification`; this local source is not attributed to a repository revision that does not contain it. | Misty Step material; no third-party notice. |

Kody is FSL-1.1 reference material only: no Kody text or implementation is copied. Taste, Hallmark, TypeSafe, and the linked essays are references, not bundled upstream material.

## Skill provenance

These source records cover each Misty-authored skill directory, including supporting files. Rows marked retired preserve historical attribution only. They are not installed skills or live routes. The source map above owns upstream revisions and licence notices. pstack references use the lock, not another pin here.

| Skill | Source record |
| --- | --- |
| `misty` | misty-step/mistystack#533 Q10-Q12; pstack poteto-mode structure (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack); Daybook artifacts/2026-10/pstack-vs-mistystack.md (Scholar); Phaedrus t2228u; misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7/way-of-working.md |
| `agent-design` | Daybook projects/mistystack.md decisions 6, 16-18; misty-step/mistystack#533 Q6, Q8 and frontmatter ruling; misty-step/mistystack@0ccc1a3/agent-config/skills/agent-design; mattpocock/skills@59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/productivity/writing-for-agents; pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/{poteto-mode,principle-encode-lessons-in-structure,correct}; misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7/way-of-working.md (Agent instructions, Keep it living); Nico Bailon skill-diet ruling (reference). |
| `boat-workers` | Phaedrus, 2026-11-03 delivery directive and ADR 0023; prior 2026-10-28/29 placement rulings; misty-step/workstation@e82812ec29cbef7814db697b6a7b190d8ecf6b8d/skills/remote-execution/SKILL.md; Boat 1.0.89 installed help; https://docs.boat.dev/snapshots/templates.md; https://docs.boat.dev/long-running-tasks/auto-stop.md; https://docs.boat.dev/long-running-tasks/background-commands.md; https://docs.boat.dev/environments/access.md; https://docs.boat.dev/hosting/firewall.md; https://docs.boat.dev/data-retention/delete.md |
| `artifact-standard` | Owner-directed separation of context and executable guidance, 2026-11-14; portable adaptation of the existing Daybook workflow. Private source facts remain in the vault. |
| `daybook` (including `lenses/`) | Owner-directed separation of context and executable guidance, 2026-11-14; portable adaptation of the existing Daybook workflow. Private source facts remain in the vault. |
| `daybook-dream` | Owner-directed separation of context and executable guidance, 2026-11-14; portable adaptation of the existing Daybook workflow. Private source facts remain in the vault. |
| `coordinator` | Owner-directed Chief of Staff hierarchy, 2026-11-15, after the research assessment of Superpowers, GSD Core, oh-my-openagent, wshobson agent-teams, Gas Town, OpenAI Agents SDK, LangGraph and Claude agent teams; ideas only, no upstream text. Retired Chief manual misty-step/mistystack@0ccc1a3/agent-config/chief/AGENTS.md; hc 0.1.21 and herdr-app 0.1.15 installed manuals. |
| `herdr` | Owner-directed separation of context and executable guidance, 2026-11-14; portable adaptation of the existing Daybook workflow. Private source facts remain in the vault. |
| `verify-daybook` | Owner-directed separation of context and executable guidance, 2026-11-14; portable adaptation of the existing Daybook workflow. Private source facts remain in the vault. |
| `wiki` | Owner-directed separation of context and executable guidance, 2026-11-14; portable adaptation of the existing Daybook workflow. Private source facts remain in the vault. |
| `bespoke-resume` | Owner-directed 2026-11-14 portable adaptation of the existing Daybook workflow; private inputs remain in the vault. |
| `daily-retro` | Owner-directed 2026-11-14 portable adaptation of the existing Daybook workflow; private inputs remain in the vault. |
| `finance-friday` | Owner-directed 2026-11-14 portable adaptation of the existing Daybook workflow; private inputs remain in the vault. |
| `monologue-digest` | Owner-directed 2026-11-14 portable adaptation of the existing Daybook workflow; private inputs remain in the vault. |
| `synthesize` | Owner-directed 2026-11-14 portable adaptation of the existing Daybook workflow; private inputs remain in the vault. |
| `system-maintenance` | Owner-directed 2026-11-14 portable adaptation of the existing Daybook workflow; private inputs remain in the vault. |
| `deepen` | Phaedrus, 2026-11-13; Felix Rieseberg, How to be more ambitious, "Depth" (https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/#depth), the four questions; nicobailon/pi-better@509967c7dda0f8c68a927917b19adf4bd83853b8 (MIT), helper.md and brief.md, the read-source-first opening and the brief cold-read check, restated in our words. |
| `whiteboard-defense` | Mitchell Hashimoto's whiteboard-defense idea, supplied by the user on 2026-11-15; explanation and defense of customer-facing systems, with experimental work exempt from that burden. Misty-authored procedure for human understanding, evidence boundaries and optional teachback; no verbatim social post or independently verified source URL claimed. |
| `design` | Foundations article 10 and way-of-working#design; misty-step/mistystack@0ccc1a3/agent-config/skills/{design-studio,visual-state-review}; emilkowalski/skills@2d228630ba1446365f614a108cb8252f1feda202; pbakaus/impeccable@5adaee704634e9031ec8943721c4ffa1a3c22221; see sources.md; pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/principle-experience-first |
| `foundation` | misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7/{index.md,way-of-working.md}; misty-step/omp-config@1c6c749e70dfe11975a8622b2d5fd45104ba74e1/skills/foundation/SKILL.md; #533 Q6 |
| `grill` (retired) | Daybook projects/mistystack.md decisions 16-18; mattpocock/skills@59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/{productivity/{grill-me,grilling},engineering/{grill-with-docs,to-spec,to-tickets,domain-modeling}}; misty-step/mistystack@0ccc1a3/agent-config/{chief/AGENTS.md,skills/user-stories}; local Misty shape, groom, brief; Foundations way-of-working Scope; pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/{in-your-own-words,sharpen} |
| `principle-compose-small-programs` (retired; now an entry in `skills/misty/principles.md`) | MIS-840, owner-approved extension brief; design behavior moved from Foundation article 1; misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7/index.md; Unix philosophy of small, focused, composable programs. |
| `principle-deep-modules` (retired; now an entry in `skills/misty/principles.md`) | misty-step/mistystack#533; John Ousterhout, A Philosophy of Software Design; Linus Torvalds, good taste |
| `principle-deeper-not-bigger` (retired; now an entry in `skills/misty/principles.md`) | misty-step/mistystack#533 Q4; Felix Rieseberg, How to be more ambitious (2026-10-13); misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7/way-of-working.md; Phaedrus t2228u (Grug lens); misty-step/hone#42 (2026-11-10 first-principles complexity rewrite) |
| `principle-nothing-fails-silently` (retired; now an entry in `skills/misty/principles.md`) | misty-step/mistystack#533; misty-step/mistystack@5828267b657e2c9814728066a5f185b4a0f57fd5/skills/principle-nothing-fails-silently; misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7/way-of-working.md#fail-loudly |
| `recompile` | Phaedrus, 2026-10-30: make the monthly rebuild review a Mistystack practice; https://github.com/misty-step/mistystack/issues/631; Jacob Sansbury, https://x.com/jsnnsa/status/2115671437575168084; Spawn 6 engine pinning and migration, https://www.spawn.co/about/release-6-0-0 (references, not copied procedure). |
| `release-watch` | misty-step/mistystack@0ccc1a308cdeefa29e991d3b7c1dbab016cfea03/agent-config/skills/{release-watch,pokayoke}; misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7/way-of-working.md#operate |
| `research` | Local Misty ~/.omp/agent/skills/research; mattpocock/skills@59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/research; installed agents/research resolves to the same Pocock research skill; Daybook projects/mistystack.md decision 16; pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/why |
| `security-audit` | cloudflare/security-audit-skill@c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit/SKILL.md; misty-step/mistystack@0ccc1a308cdeefa29e991d3b7c1dbab016cfea03/agent-config/skills/security-audit |
| `setup-mistystack` | pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/setup-pstack/SKILL.md; OMP 18.13.3 config-usage.md, models.md, task-agent-discovery.md; misty-step/mistystack#533 and #591; native adapter notes in skills/misty/harnesses. |
| `ship-loop` | Phaedrus, 2026-11-03 delivery directive and ADR 0023; historical misty-step/mistystack@0ccc1a308cdeefa29e991d3b7c1dbab016cfea03/agent-config/skills/ship-loop; pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/{create-verification-skill,create-formal-verification-skill,blast-radius}. The historical approval helper and judge were removed, not retained as current procedure. |
| `spec` | Phaedrus, 2026-11-13 specification-first and homeostasis directive ([ADR 0028](docs/decisions/0028-spec-drives-the-application.md)); Richard Sutton, The Bitter Lesson (http://www.incompleteideas.net/IncIdeas/BitterLesson.html); Nate Berkopec, 2026-11-13 spec homeostasis thread (https://x.com/nateberkopec/status/2121374054016028943); misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7/index.md (articles 2-3); GitHub Spec Kit and Kiro (references, not copied text). |
| `test-audit` | misty-step/mistystack@0ccc1a308cdeefa29e991d3b7c1dbab016cfea03/agent-config/skills/test-audit; openclaw/openclaw@80930af448ebabc84174146b56bc106d37fab3b4/.agents/skills/test-audit; pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/principle-test-behavior-not-implementation |
| `verification` | misty-step/mistystack#533; misty-step/mistystack@0ccc1a308cdeefa29e991d3b7c1dbab016cfea03/agent-config/{skills/story-qa,guidance/engineering.md}; pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/{create-verification-skill,maintain-verification-skill,principle-prove-it-works}; installed Misty ~/.omp/agent/skills/evidence-packet (SKILL.md sha256:08fb52a436fbc663c59648b9b07b87a9c3d3f782c5fd7f55a5568be886f78923); misty-step/foundations@d96c99ce1152ab1d6ae4a0eed0b22cbac93897b7/way-of-working.md#prove |
| `verify-mistystack` (repository-local) | misty-step/mistystack #533, docs/decisions/0015-omp-method-plugin.md; scripts/verify-plugin.ts owns the native proof. |
| `watchdog` | Phaedrus, 2026-11-03 open-ended-run directive and ADR 0023; native OMP proc/history/message/completion controls; Boat 1.0.89 installed help; https://docs.boat.dev/integrated-agents/conversations.md; https://docs.boat.dev/integrated-agents/steering.md; https://docs.boat.dev/long-running-tasks/background-commands.md |
| `writing` (retired) | Daybook projects/mistystack.md decision 16; pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/{unslop,technical-writing}; mattpocock/skills@59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/pr; humanlayer/skills@653b6411c1f70c275a18e37673b042ff99f67ceb/plugins/show-me/skills/show-me; Foundations way-of-working Claim precisely and Review; pstack (cursor/plugins@c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack), skills/{no-comments,bro} |

## MIT notices

### pstack — Lauren Tan

```text
MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### pi-better — Nico Bailon

Source: https://github.com/nicobailon/pi-better at `509967c7dda0f8c68a927917b19adf4bd83853b8`. Adapted in `skills/deepen/`.

```text
MIT License

Copyright (c) 2026 Nico Bailon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Matt Pocock

```text
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Warp — Denver Technologies, Inc.

```text
MIT License

Copyright (c) 2026 Denver Technologies, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### HumanLayer

```text
MIT License

Copyright (c) 2026 HumanLayer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Emil Kowalski

```text
MIT License

Copyright (c) 2026 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Cloudflare security-audit-skill

```text
MIT License

Copyright (c) 2025-2026 Cloudflare, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### OpenClaw

```text
MIT License

Copyright (c) 2026 OpenClaw Foundation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Third-party notices for incorporated or adapted code are recorded in
THIRD_PARTY_NOTICES.md.
```

### Misty Step Foundations

```text
MIT License

Copyright (c) 2026 Misty Step

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Apache-2.0 — Impeccable

Copyright 2025 Paul Bakaus. Adapted by Misty Step as described above. The pinned upstream [NOTICE.md](https://github.com/pbakaus/impeccable/blob/5adaee704634e9031ec8943721c4ffa1a3c22221/NOTICE.md) credits ehmo's MIT-licensed platform-design-skills for its iOS and Android platform references. Those references are not incorporated here; the adapted critique, polish and audit material is listed in `skills/design/sources.md`. The complete upstream licence follows.

```text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to the Licensor for inclusion in the Work by the copyright
      owner or by an individual or Legal Entity authorized to submit on
      behalf of the copyright owner. For the purposes of this definition,
      "submitted" means any form of electronic, verbal, or written
      communication sent to the Licensor or its representatives, including
      but not limited to communication on electronic mailing lists, source
      code control systems, and issue tracking systems that are managed by,
      or on behalf of, the Licensor for the purpose of discussing and
      improving the Work, but excluding communication that is conspicuously
      marked or otherwise designated in writing by the copyright owner as
      "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   Copyright 2025 Paul Bakaus

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```
