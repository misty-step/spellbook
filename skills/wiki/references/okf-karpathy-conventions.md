Historical format research; current behavior is in [the wiki skill](../SKILL.md).

# OKF + Karpathy LLM-wiki — reconciled conventions (spec-level detail)

Provenance tags: **[OKF]** spec-mandated · **[KARP]** Karpathy gist · **[BOTH]**
agreed · **[IMPL]** community convention (adopt/drop freely) · **[DAYBOOK]**
this vault's adaptation. Sources dated at bottom. The `SKILL.md` is the operative
summary; this is the full reference for when spec-level detail matters.

## (a) Frontmatter schema

The single hard rule **[OKF §4.1, §9]:** every non-reserved `.md` file MUST open
with a parseable YAML frontmatter block with a non-empty `type`. Nothing else is
required — that is the entire OKF conformance floor.

```yaml
---
type: <short string>          # REQUIRED. Free-form: Person, Project, Concept, Entity,
                              #   Comparison, Source, Playbook, Reference, Decision…
title: <display name>         # recommended; consumers may derive from filename
description: <one sentence>    # recommended — feeds index.md, snippets, previews
resource: <canonical URI>     # recommended IF the note maps to a real external asset; else omit
tags: [tag, tag]              # optional, cross-cutting
timestamp: <ISO 8601>         # optional, last MEANINGFUL change
# producer-defined keys allowed; consumers MUST preserve, never reject
---
```

- `type` is free-form and self-explanatory — no fixed taxonomy, no central
  registry [OKF §4.1, §1 non-goals]. Consumers tolerate unknown `type`.
- Recommended-field priority: `title` > `description` > `resource` > `tags` >
  `timestamp` [OKF §4.1].
- `resource` only for notes bound to a real asset; abstract notes omit it [OKF §4.4].
- Extra keys explicitly allowed; never reject/strip for unknown keys [OKF §4.1 Extensions].
- `okf_version: "0.1"` may appear in exactly one place — the bundle-root
  `index.md` frontmatter (the only index.md with frontmatter) [OKF §11].
- **[DAYBOOK]** Vault uses `type/status/created/description/tags`. To conform,
  only requirement is `type` always present + non-empty; `created`/`status`
  survive as allowed extension keys. Never modify `created`. `timestamp` (OKF
  last-modified) is distinct from `created` and may coexist.

## (b) Naming + file-path identity

- File path IS identity [BOTH; OKF §2]: ID = path minus `.md` (`tables/users.md`
  → `tables/users`). Moves break inbound links — deliberate refactors only.
- Directory structure is domain-free, producer's choice [OKF §3]. OKF prescribes
  no folders.
- **[KARP/IMPL]** Common role layout: `sources/` (one note per ingested doc —
  audit trail), `entities/` (named things), `concepts/` (abstract ideas), plus a
  synthesis area. Adopt as `type` values/folders only if useful — convention,
  not spec.
- **[BOTH]** Name notes as claims/things, not vague topics. Kebab-case slug.
- **[IMPL]** Slugified-title IDs are the default; content-hash IDs are a
  coded-pipeline-only option — skip for a personal vault.
- **[DAYBOOK]** Keep existing folders; they already satisfy OKF.

## (c) Linking — the one real divergence

- **[OKF §5]** Standard markdown links: `[customers](/tables/customers.md)`.
  Bundle-root-absolute (leading `/`, `.md` suffix) recommended (survives moves);
  relative `./x.md` allowed.
- **[KARP/IMPL]** Karpathy + most builds use Obsidian `[[wikilink]]`.
- **[BOTH]** Semantics in the prose, not the link — untyped directed edge; kind
  conveyed by the sentence [OKF §5.3]. No typed-edge syntax.
- **[BOTH]** Broken links are legal (future knowledge), not errors.
- **[DAYBOOK] Reconciled:** keep `[[full/path]]` wikilinks as native (Karpathy-
  aligned + vault doctrine). For OKF export/interchange, transform
  `[[full/path]]` → `[text](/full/path.md)` at emit time.

## (d) index.md + log.md (reserved at every dir level [OKF §3.1])

**index.md** — catalog / progressive disclosure [BOTH; OKF §6; KARP]:
- No frontmatter except the bundle-root's optional `okf_version`.
- Body = `# Section` headings, bullet lists of `* [Title](relative-url) - description`
  (description from the linked note's frontmatter).
- **[KARP]** LLM updates it on every ingest; a consumer may synthesize one if absent.

**log.md** — chronological history [BOTH; OKF §7; KARP]:
- Append-only: ingests, queries, lint passes, creations/updates/deprecations.
- ISO `YYYY-MM-DD` headings, **newest first**.
- Entries led by a bold verb (`**Creation**`, `**Update**`, `**Ingest**`,
  `**Query**`, `**Lint**`, `**Deprecation**`).
- **[KARP]** Keep grep-parseable.

```markdown
# Update Log
## 2026-06-30
* **Ingest** | "Article Title" — wrote [summary](/sources/article-title.md), updated 3 entity pages.
* **Lint** — fixed 2 broken links, flagged 1 orphan.
```
- **[DAYBOOK]** `meta/conversations/YYYY-MM-DD.md` traces already function as a
  distributed log. Keep them; don't add a second log file.

## (e) The ingest → compile → lint loop

Compiled once, kept current — never re-derived per query [KARP].

**INGEST:** read immutable raw source → discuss takeaways (supervised default) →
write/update a source note → **integrate related notes**, don't just
append → flag contradictions → update index + log.

**QUERY:** read index first → the notes that can answer → synthesize → answer **only from stored
content with citations**, say "found nothing" rather than use training data →
**file good answers back** as synthesis notes so work compounds → log.

**LINT** ("eslint for knowledge"):
- *Deterministic:* broken links, orphans, missing/invalid frontmatter, missing
  `type`. (= the OKF conformance check.)
- *Semantic (LLM):* contradictions, stale claims, missing concept notes, missing
  cross-refs, data gaps a search could fill.
- Output fixes; **human-gate** before applying (community: `*_pending/` →
  `*_approved/`). Broken-link auto-repair only on high-confidence match, else `TODO`.

## (f) OKF v0.1 conformance checklist [OKF §9]

- [ ] Every non-reserved `.md` has a parseable YAML frontmatter block.
- [ ] Every frontmatter has a non-empty `type`.
- [ ] Every `index.md` follows §6 (no frontmatter except root `okf_version`;
      sectioned `[Title](url) - description` bullets).
- [ ] Every `log.md` follows §7 (ISO dates, newest first).
- Consumers MUST NOT hard-fail on: missing optional fields · unknown `type` ·
  unknown extra keys · broken cross-links · missing `index.md`. (warning, not error.)

## What to encode as skill vs. leave to natural language

Encode as hard rules only the three OKF pins: (1) frontmatter floor (parseable
block + non-empty `type`); (2) reserved-filename + index/log structural formats
(ISO dates, no-frontmatter-in-index, link/citation forms); (3) the conformance
checklist as the deterministic lint. Everything else — `type` values, folder
organization, concept-vs-entity, contradiction judgment, what deserves a note,
integration depth — is judgment for natural-language prose. OKF is "minimally
opinionated" (requires exactly one thing); the gist is "intentionally abstract."
The model needs the *information* (rich prose conventions), not a rigid schema;
add structure only at the seams where deterministic code reads the value.

## Sources (accessed 2026-06-30)

- OKF SPEC.md + README.md (v0.1) — github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf (read verbatim)
- OKF announcement — Google Cloud Blog, 2026-06-12
- Karpathy LLM-wiki gist `442a6bf555914893e9891c11519de94f` (Apr 2026, read verbatim)
- [IMPL] Bernardo, "I built Karpathy's LLM Wiki twice…," Towards AI, 2026-05-17
- [IMPL] rosidotidev, "Karpathy's LLM Wiki? No Code…," DEV, 2026-05-23

**Flagged:** OKF sample bundles (ga4, stackoverflow, crypto_bitcoin) exist in-repo
but weren't opened — they're the canonical worked examples for exact `type`
samples. The `[[wikilink]]` + `*_pending/` patterns are [IMPL], not spec.
