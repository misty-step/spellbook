import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const retired = (base, names, to) => Object.fromEntries(names.map((name) => [`${base}${name}/`, to]));

const retiredSkills = [
  'agent-design', 'artifact-standard', 'bespoke-resume', 'boat-workers',
  'coordinator', 'daily-retro', 'daybook', 'daybook-dream', 'deepen', 'domain-modeling',
  'finance-friday', 'grilling', 'grill-me', 'grill-with-docs', 'herdr', 'merge-risk',
  'monologue-digest', 'recompile', 'research', 'retro', 'setup-mistystack', 'ship-loop',
  'synthesize', 'system-maintenance', 'test-audit', 'to-questionnaire', 'verification',
  'verify-daybook', 'watchdog', 'whiteboard-defense', 'wiki',
];

const legacyPlaybooks = [
  'authoring-a-skill', 'autonomous-run', 'bug-fix', 'eval', 'feature', 'hillclimb', 'investigation',
  'multi-phase-plan', 'orchestrate', 'pause-safely', 'perf-issue', 'prototype', 'refactoring', 'runtime-forensics',
  'session-pickup', 'trace-forensics', 'visual-parity', 'worktree-cleanup',
];

const legacyPrinciples = [
  'attack-the-premise', 'boundary-discipline', 'build-the-lever', 'compose-small-programs', 'deep-modules',
  'deeper-not-bigger', 'encode-lessons-in-structure', 'exhaust-the-design-space', 'experience-first',
  'explain-the-number', 'fix-root-causes', 'foundational-thinking', 'guard-the-context-window', 'laziness-protocol',
  'make-operations-idempotent', 'migrate-callers-then-delete-legacy-apis', 'minimize-reader-load',
  'model-the-domain', 'never-block-on-the-human', 'nothing-fails-silently', 'outcome-oriented-execution',
  'prove-it-works', 'redesign-from-first-principles', 'separate-before-serializing-shared-state',
  'sequence-verifiable-units', 'subtract-before-you-add', 'test-behavior-not-implementation',
  'type-system-discipline',
];

const legacyPstackSkills = [
  'architect', 'architect/references/design-red-flags', 'architect/references/rationale-template',
  'architect/references/runner-prompt', 'arena', 'automate-me', 'benchmark-checklist', 'blast-radius', 'bro',
  'correct', 'create-formal-verification-skill', 'create-verification-skill',
  'create-verification-skill/references/feature-map-example/README',
  'create-verification-skill/references/feature-map-example/create-note',
  'create-verification-skill/references/feature-map-example/search', 'figure-it-out', 'how',
  'how/references/explainer-prompt', 'how/references/explorer-prompt', 'in-your-own-words', 'interrogate',
  'ketchup-video', 'ketchup', 'maintain-formal-verification-skill', 'maintain-verification-skill', 'make-bot-ui',
  'no-comments', 'poteto-help', 'poteto-help/references/prompting', 'poteto-help/references/recipes', 'poteto-mode',
  'poteto-mode/references/bugbot-triage', 'recall', 'reflect', 'reflect/references/divergent-reviewer',
  'reflect/references/judgment-reviewer', 'reflect/references/synthesizer', 'reflect/references/tooling-reviewer',
  'setup-pstack', 'sharpen', 'show-me-your-work', 'statechart', 'statechart/references/render', 'swarm', 'tdd',
  'teach', 'technical-writing', 'typescript-best-practices', 'typescript-best-practices/references/patterns',
  'unslop', 'why', 'why/references/epistemics', 'why/references/investigator-prompt',
  'why/references/source-playbook', 'why/references/sources/code-archaeology', 'why/references/sources/databricks',
  'why/references/sources/datadog', 'why/references/sources/incident-postmortem', 'why/references/sources/linear',
  'why/references/sources/notion', 'why/references/sources/sentry', 'why/references/sources/slack',
  'why/references/synthesizer-prompt',
];

const legacySecurityRefs = [
  'AI-AND-LLM', 'ATTACK-CLASSES', 'CLIENT-SIDE', 'CLOUD-AND-DEPLOYMENT',
  'DATA-ISOLATION-AND-LIFECYCLE', 'DESKTOP-MOBILE-AND-LOCAL-IPC', 'HUNTING',
  'MEMORY-SAFETY-AND-BINARY', 'PROTOCOLS-RPC-AND-MESSAGING', 'RECONNAISSANCE',
  'RESOURCE-EXHAUSTION-AND-AVAILABILITY', 'SUPPLY-CHAIN-AND-RELEASE',
  'VALIDATION-AND-REPORTING', 'WEB-PROTOCOL-AND-AUTH', 'workflow',
];

export const siteRedirects = {
  '/guide/': '/library/',
  '/guide/install-and-setup/': '/#install',
  '/guide/misty/': '/library/misty/',
  '/guide/shape/': '/library/skills/define-product/',
  '/guide/build/': '/library/misty/',
  '/guide/verify-and-ship/': '/library/skills/release-watch/',
  '/guide/principles/': '/philosophy/',
  '/guide/make-it-yours/': '/library/',
  '/install/': '/#install',
  '/install/hermes/': '/#install',
  '/install/grok-bot/': '/#install',
  '/install/pstack-names/': '/#install',
  '/install/omp/': '/#install',
  '/foundation/': '/library/skills/foundations/',
  '/foundations/': '/library/skills/foundations/',
  '/library/skills/foundation/': '/library/skills/foundations/',
  '/exemplars/': '/philosophy/',
  '/decisions/': '/philosophy/',
  '/evals/': '/philosophy/',
  '/spec/': '/library/skills/define-product/',
  '/domain/': '/library/skills/define-product/',
  '/stories/': '/library/skills/define-product/',
  '/library/skills/misty/': '/library/misty/',
  '/library/skills/misty/principles/': '/philosophy/',
  '/library/skills/judge/': '/library/misty/',
  '/library/skills/ship-loop/merging/': '/library/misty/',
  '/library/skills/grill/': '/library/',
  '/library/skills/grill/records/': '/library/misty/',
  '/library/skills/writing/': '/library/',
  '/library/skills/writing/prose/': '/library/',
  '/library/skills/writing/publications/': '/library/misty/',
  '/library/skills/verification/accounts/': '/library/misty/',
  '/library/skills/verification/generate/': '/library/misty/',
  '/library/skills/verification/maintenance/': '/library/misty/',
  '/library/skills/setup-mistystack/agents/': '/library/',
  '/library/skills/to-spec/': '/library/skills/define-product/',
  '/library/skills/to-tickets/': '/library/skills/define-product/',
  '/library/skills/spec/': '/library/skills/define-product/',
  '/library/principles/one-home-per-fact/': '/library/core/',
  '/library/principles/finish-the-work/': '/library/core/',
  '/library/principles/prove-it-on-the-real-path/': '/library/misty/',
  '/library/principles/vertical-slices/': '/philosophy/',
  '/library/principles/skill-diet/': '/philosophy/',
  '/library/playbooks/incident/': '/library/skills/release-watch/',
  '/library/playbooks/refactor/': '/library/misty/',
  '/library/skills/bakeoff/': '/library/skills/design-exploration/',
  ...retired('/library/skills/security-audit/references/', legacySecurityRefs, '/library/skills/security-audit/'),
  ...retired('/library/playbooks/', legacyPlaybooks, '/library/misty/'),
  ...retired('/library/principles/', legacyPrinciples, '/philosophy/'),
  ...retired('/library/skills/', [...retiredSkills, ...legacyPstackSkills], '/library/'),
};

export default defineConfig({
  site: 'https://stack.mistystep.io',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: {
    define: { 'process.env.STACK_REPO_ROOT': JSON.stringify(fileURLToPath(new URL('../', import.meta.url))) },
    build: { assetsInlineLimit: 0 },
  },
  redirects: siteRedirects,
});
