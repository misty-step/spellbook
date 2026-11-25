// Single copy home for the stack.mistystep.io home page.
// Dynamic counts, verbatim core rules, and skill listings are read from the repository by src/lib/home.mjs.

export const home = {
  title: 'mistystack',
  nav: [
    { label: 'Skills', href: '#skills' },
    { label: 'Core', href: '#core' },
    { label: 'misty-check', href: '#check' },
    { label: 'Philosophy', href: '/philosophy/' },
    { label: 'Search', href: '/search/' },
  ],
  navCta: { label: 'Install', href: '#install' },
  hero: (facts) => ({
    headline: 'A lean method for coding agents.',
    sub: `mistystack codifies the Active Folio-to-reconciler loop — bootstrap or update present-tense PRODUCT.md (plus DESIGN.md for UI) first in any greenfield or legacy repo, then reconcile code against it — in ${facts.coreRules} always-on rules, ${facts.skills} crisp skills, and zero-dependency scripts. Portable across harnesses, free of template bureaucracy.`,
    primary: { label: `Browse all ${facts.skillCount} skills`, href: '#skills' },
    secondary: { label: 'Install', href: '#install' },
    proof: `Active Folio · ${facts.skillCount} skills · ${facts.coreCount} standing rules · 0 external companion packs · MIT licensed`,
  }),
  skills: (facts) => ({
    title: `${facts.Skills} skills. What and why only.`,
    intro: 'Every skill stays brief enough to read in seconds. Click any card to inspect its verbatim Markdown and deterministic companion script.',
  }),
  core: (facts) => ({
    title: `${facts.CoreRules} rules. Every session.`,
    intro: 'Loaded on session start and kept under twenty lines. Active Folio-to-reconciler default (greenfield or legacy), real evidence, information-hiding strategic design with explicit state machines, real-path verification, clear autonomy boundaries, and one cold-reader recap.',
    caption: 'Verbatim always-on standing rules from',
  }),
  check: {
    title: 'Code beats prose.',
    intro: 'Spend inference once, then run a deterministic script. misty-check.mjs audits any repository in under a second using Node built-ins only — checking PRODUCT.md / DESIGN.md presence with an advisory Active Folio summary, lightweight surface-class detection, structural layout thresholds (.misty-check.allow), baseline hygiene, and crisp text or --json output.',
    primary: { label: 'Read misty-check.mjs', href: '/tools/misty-check/' },
    secondary: { label: 'Foundations skill', href: '/library/skills/foundations/' },
  },
  install: {
    title: 'Works on any harness.',
    intro: 'Standard Agent Skills format with zero auto-mounted companion packs. Drop into Cursor, Codex, Antigravity, pi, OpenCode, or Claude Code.',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Select the command to copy',
    tabs: [
      {
        id: 'any',
        name: 'Any harness',
        lines: ['npx skills add misty-step/mistystack -g'],
        note: 'Installs all 7 skills globally for Cursor, Codex, Antigravity, pi, and OpenCode. Copy rules/core.md into your always-on instruction file or AGENTS.md.',
      },
      {
        id: 'claude',
        name: 'Claude Code',
        lines: [
          'claude plugin marketplace add misty-step/mistystack',
          'claude plugin install mistystack@mistystack',
        ],
        note: 'Mounts the 7 lean skills and registers the SessionStart core hook with zero external companion packs.',
      },
      {
        id: 'local',
        name: 'Run misty-check',
        lines: [
          'git clone --depth 1 https://github.com/misty-step/mistystack.git /tmp/mistystack',
          'node /tmp/mistystack/skills/foundations/scripts/misty-check.mjs .',
        ],
        note: 'Run the deterministic baseline auditor against any local repository with Node 20+ and zero dependencies.',
      },
    ],
  },
  philosophy: {
    title: 'Active Folio, Philosophy & Lineage.',
    body: 'Why effortless Active Folio bootstrapping and reconciliation (greenfield or legacy), the 3-Layer Intent Stack, clean-room recompile, information-hiding decomposition, explicit state machines with Deterministic Simulation Testing (DST), seven small skills, cross-family cold critics, and calm editorial evidence beat forty rigid playbooks. Kept in docs/philosophy.md for human readers and never auto-loaded into agent prompts.',
    primary: { label: 'Read Philosophy & Lineage', href: '/philosophy/' },
    secondary: { label: 'Browse on GitHub', href: 'https://github.com/misty-step/mistystack' },
  },
  footer: {
    line: 'mistystack is a lean, portable engineering method for coding agents, MIT licensed.',
  },
};
