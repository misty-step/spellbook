import { home } from '../copy/home.mjs';
import { release, repoRoot, repositoryUrl } from './release.mjs';
import { auditRepo, formatScorecard } from '../../../skills/foundations/scripts/misty-check.mjs';

const CORE = 'rules/core.md';
const CARDINALS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

function fail(message) {
  throw new Error(`Home page: ${message}`);
}

function cardinal(n, what) {
  if (!Number.isSafeInteger(n) || n < 0) fail(`invalid count for ${what}: ${n}`);
  return CARDINALS[n] ?? String(n);
}

const Cardinal = (n, what) => cardinal(n, what).replace(/^./, (c) => c.toUpperCase());

function coreLines(core) {
  const list = core.ast.children.find((node) => node.type === 'list') ?? fail(`${CORE} has no list`);
  return list.children.map((item) => core.body.slice(item.position.start.offset, item.position.end.offset).trim());
}

let page;
export function getHome(graph) {
  return page ??= build(graph);
}

function inventory(graph) {
  const core = graph.byId.get(CORE) ?? fail(`missing ${CORE}`);
  const skillDocs = graph.documents.filter((doc) => doc.kind === 'Skills');
  if (skillDocs.length === 0) fail('no skills found');
  return { core, lines: coreLines(core), skillDocs };
}

function factsOf({ lines, skillDocs }) {
  return {
    coreCount: lines.length,
    coreRules: cardinal(lines.length, 'core rules'),
    CoreRules: Cardinal(lines.length, 'core rules'),
    skillCount: skillDocs.length,
    skills: cardinal(skillDocs.length, 'skills'),
    Skills: Cardinal(skillDocs.length, 'skills'),
  };
}

// Counts shown anywhere on the site come from the content graph, never hand-typed copy.
export const countFacts = (graph) => factsOf(inventory(graph));

function build(graph) {
  const { core, lines, skillDocs } = inventory(graph);
  const facts = factsOf({ lines, skillDocs });

  // Run misty-check against this repository at build time for a real, honest preview.
  const audit = auditRepo(repoRoot);
  const sampleReport = {
    ...audit,
    target: './spellbook',
  };
  const checkSample = [
    '$ node skills/foundations/scripts/misty-check.mjs .',
    formatScorecard(sampleReport),
  ].join('\n');

  return {
    title: home.title,
    nav: home.nav,
    navCta: home.navCta,
    hero: home.hero(facts),
    sections: {
      skills: {
        ...home.skills(facts),
        items: skillDocs.map((doc, idx) => ({
          index: String(idx + 1).padStart(2, '0'),
          name: doc.skill.name,
          title: doc.title,
          description: doc.skill.description,
          url: doc.url,
          id: doc.id,
          words: doc.skill.words,
          script: doc.skill.script,
        })),
      },
      core: {
        ...home.core(facts),
        lines,
        source: { label: CORE, href: core.url },
        commit: release.commit.slice(0, 7),
        commitUrl: core.source.blobUrl,
      },
      check: {
        ...home.check,
        sample: checkSample,
      },
      install: home.install(facts),
      philosophy: home.philosophy,
    },
    footer: home.footer,
    repositoryUrl,
  };
}
