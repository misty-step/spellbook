---
name: daily-retro
description: "When the user requests a daily retro: synthesize a six-lens strategic pulse from recent private context."
disable-model-invocation: true
metadata:
  owner: Misty Step
  prevents: "2026-11-14 ownership correction: daily reflection machinery lived in the vault and prescribed exhaustive reads and unsupported emotional conclusions."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-14"
---

# Daily retro

Produce a compact, evidence-based daily reflection when the user asks. Use
[Daybook](../daybook/SKILL.md) to find current priorities and relevant recent
conversation traces, briefs, reviews, open loops and project changes. Start
with the requested day, using the preceding week only when it explains a
pattern. Name missing coverage; absence of a record is not inactivity.

Read the selected sources, then synthesize these six lenses once across them:

| Lens | Output |
| --- | --- |
| Orientation | What actually happened, with source paths and dates. |
| Alignment | How that work relates to stated direction; name a mismatch only when supported. |
| Weakness → defense | A recurring drag and one small, checkable defense for tomorrow. |
| Strength → leverage | An observed success and one concrete way to build on it. |
| Creative pull | An idea the user expressed interest in and a low-cost experiment. |
| Energy | A grounded closing perspective; distinguish the user's reported feelings from your inference. |

Return one `RETRO — <date>` block with these six labels. Use source citations
for observations and mark interpretations as inference. When evidence for a
lens is thin, say so instead of manufacturing a weakness, enthusiasm or a
strategic gap. Suggest an emotional direction without claiming to know how
the user now feels.

Deliver in the conversation. Save only when requested, using the agent context
destination defined by Daybook; never write to the human journal. Completion
means all six lenses are addressed, citations support the observations, and
suggested actions stay small enough for the next day.
