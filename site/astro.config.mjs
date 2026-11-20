import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const retired = (base, names, to) => Object.fromEntries(names.map((name) => [`${base}${name}/`, to]));

const retiredSkills = [
  'agent-design', 'artifact-standard', 'bakeoff', 'bespoke-resume', 'boat-workers',
  'coordinator', 'daily-retro', 'daybook', 'daybook-dream', 'deepen', 'domain-modeling',
  'finance-friday', 'grilling', 'grill-me', 'grill-with-docs', 'herdr', 'merge-risk',
  'monologue-digest', 'recompile', 'research', 'retro', 'setup-mistystack', 'ship-loop',
  'synthesize', 'system-maintenance', 'test-audit', 'to-questionnaire', 'verification',
  'verify-daybook', 'watchdog', 'whiteboard-defense', 'wiki',
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
  '/foundation/': '/library/skills/foundations/',
  '/foundations/': '/library/skills/foundations/',
  '/library/skills/foundation/': '/library/skills/foundations/',
  '/exemplars/': '/philosophy/',
  '/decisions/': '/philosophy/',
  '/evals/': '/philosophy/',
  '/spec/': '/library/skills/define-product/',
  '/library/skills/misty/': '/library/misty/',
  '/library/skills/misty/principles/': '/philosophy/',
  ...retired('/library/skills/', retiredSkills, '/library/'),
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
