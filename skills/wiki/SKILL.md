---
name: wiki
description: "When writing or organizing notes in a selected OKF vault, ingesting its sources, maintaining its maps or checking OKF conformance."
metadata:
  owner: phaedrus
  prevents: "2026-11-14: active agent guidance lived in a context vault, coupling instruction discovery to private data."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-14"
---

# Wiki notes

Use [Supercortex context routing](../misty/context-sources.md) to select the collection. For an agent wiki,
follow the wiki conventions in its Supercortex repository. The procedure below
applies to OKF vaults such as the legacy personal Daybook. Its paths are vault-relative.

The vault is a **Karpathy-style LLM wiki** and a **Google Open Knowledge Format
(OKF v0.2) bundle**. Knowledge is *compiled once and kept current*, not
re-derived per query: sources get distilled into durable, linked notes that
compound. You maintain it; the human rarely edits it directly.

**Bitter-lesson stance — read before applying.** Only three things are HARD
RULES (deterministic code branches on them): the frontmatter `type` floor, the
reserved-file formats, and the conformance/lint pass. *Everything else is
judgment* — which `type` values exist, how to organize folders, what deserves
its own note, when a source contradicts another, how deeply to integrate. Use
prose and taste for those; do **not** invent taxonomies or typed-edge schemas.
Full spec-level detail with provenance: `references/okf-karpathy-conventions.md`.

## Hard rules (the OKF conformance floor)

1. **Every note opens with a parseable YAML frontmatter block containing a
   non-empty `type`.** That is the whole floor. `type` is free-form
   (`Person`, `Project`, `Concept`, `Source`, `Decision`, …) — self-explanatory,
   never a central registry. Tolerate any `type` value; never strip unknown keys.
2. **`index.md` and `log.md` are reserved at every directory level** — never
   name a concept note `index` or `log`. Formats below.
3. **Never modify `created`** (vault rule). OKF's optional `generated: {by, at}` (who
   produced the current content, and when it last meaningfully changed) is separate and may coexist.

```yaml
---
type: Concept            # REQUIRED, free-form
status: active           # vault extension key (allowed)
created: 2026-06-30T...  # vault key — never modify
description: One sentence — feeds index.md + search snippets   # strongly recommended
tags: []                 # optional
# resource: <uri>        # only if the note describes a real asset (media notes: the R2 bytes)
# sources: [{resource: <path or url>, title: ...}]   # OKF provenance: what this derives from
---
```

## Naming & identity

- **The file path IS the note's identity.** Moving/renaming changes identity and
  breaks inbound links — treat moves as deliberate refactors, not free ops.
- Name notes as **claims or things, not vague topics** (`distribution-is-the-moat`,
  not `thoughts-on-distribution`). Kebab-case slug from the title.
- Reorganize folders when that improves retrieval; repair inbound links and maps.
  `journal/` is human-only and cannot be moved or edited by agents.

## Linking

- **Dense `[[full/path]]` wikilinks woven into sentences** (`because
  [[distribution-is-the-moat]] we prioritize [[projects/volume]]`), full paths
  always. This is the native form — Karpathy-aligned and existing vault doctrine.
- **Semantics live in the prose, not the link.** A link is an untyped directed
  edge; the *kind* (depends-on, references, parent) is in the sentence. Don't
  invent typed-link syntax.
- **Broken links are legal** — a link to a not-yet-written note is valid future
  knowledge, a lint hint, not an error.
- **OKF export only:** transform `[[full/path]]` → `[text](/full/path.md)` at
  bundle-emit time. Internally, stay wikilinks.

## index.md / log.md

**index.md** — per-directory catalog for progressive disclosure (read it before
opening files). No frontmatter (except the bundle-root index.md, which may carry
`okf_version: "0.2"`). Body = `# Section` headings, each a bullet list of
`* [Title](relative-url) - description` (description pulled from the note's
frontmatter). MOCs already serve this role here.

**log.md** — append-only history, **newest first**, ISO `YYYY-MM-DD` date
headings, entries led by a bold action verb. This vault's
`meta/conversations/YYYY-MM-DD.md` traces already function as a distributed
log — keep using them; don't duplicate into a second log file.

```markdown
## 2026-06-30
* **Ingest** | "Article Title" — wrote [summary](/sources/article-title.md), updated 3 entity notes.
* **Lint** — fixed 2 broken links, flagged 1 orphan.
```

## The loop: ingest → compile → lint

**INGEST** (a source enters — article, transcript, clipping, repo context the
human describes):
1. Read the source. Preserve its words and identity when organizing it; refresh raw
   mirrors from their source. Never write in `journal/`.
2. Separate source claims from agent interpretation.
3. Write/update a **source note** (title, author, date, extracted entities + concepts).
4. **Integrate, don't just append** — update the relevant concept/person/project
   notes across the vault; one source may touch many notes.
5. Flag where new data **contradicts** an existing claim.
6. Update the relevant index/MOC; log a dated entry.

**QUERY** (answer from the vault, not from model memory):
- Read the index/MOC first → drill into the notes that can answer → synthesize.
- Answer **only from stored content, with `[[wikilink]]` citations**. Found
  nothing? Say so — don't fall back to training data.
- When the task includes recording the answer, file it as a sourced synthesis note.

**LINT** ("eslint for knowledge") — two phases:
- *Deterministic:* broken links, orphan notes, missing/invalid frontmatter,
  **missing `type`**, and reserved-file formats. For a selected scope, run
  `ruby scripts/check-okf.rb <file-or-directory> [...]` from the bundle root;
  it checks YAML, types and basic reserved-file structure, not every rule.
- *Semantic (LLM):* contradictions, stale claims, concepts mentioned but lacking
  a note, missing cross-links, data gaps a search could fill.
- Apply supported organization and link repairs under ADR 0002. Preserve ambiguous
  claims and report unresolved conflicts; do not invent a target for a broken link.

## Conformance checklist (the deterministic lint)

A note/bundle is OKF v0.2 conformant iff: every non-reserved `.md` has parseable
frontmatter · with non-empty `type` · every `index.md` follows the format · every
`log.md` uses ISO dates newest-first. Consumers MUST NOT hard-fail on missing
optional fields, unknown `type`, extra keys, broken links, or a missing index —
those are warnings, not errors.

## Sources

OKF v0.2 SPEC (`github.com/GoogleCloudPlatform/open-knowledge-format`, SPEC.md) ·
Karpathy LLM-wiki gist (`442a6bf…`, Apr 2026). Reconciled, attributed detail:
`references/okf-karpathy-conventions.md`.
