// Single copy home for the stack.mistystep.io home page.
// Dynamic counts, verbatim core rules, and skill listings are read from the repository by src/lib/home.mjs.

export const home = {
  title: 'spellbook',
  nav: [
    { label: 'Skills', href: '#skills' },
    { label: 'Core', href: '#core' },
    { label: 'misty-check', href: '#check' },
    { label: 'Philosophy', href: '/philosophy/' },
    { label: 'Search', href: '/search/' },
  ],
  navCta: { label: 'Install', href: '#install' },
  hero: (facts) => ({
    headline: 'Craft and philosophy for coding agents.',
    sub: `Models keep getting better; procedures rot. Spellbook keeps only what compounds: present-tense intent in an Active Folio (PRODUCT.md, plus DESIGN.md for UI), ${facts.coreRules} always-on rules, ${facts.skills} short skills that say what and why, and scripts for anything a machine can check. Portable across harnesses. Formerly mistystack.`,
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
        lines: ['npx skills add misty-step/spellbook -g'],
        note: 'Installs all 7 skills globally for Cursor, Codex, Antigravity, pi, and OpenCode. Copy rules/core.md into your always-on instruction file or AGENTS.md.',
      },
      {
        id: 'claude',
        name: 'Claude Code',
        lines: [
          'claude plugin marketplace add misty-step/spellbook',
          'claude plugin install mistystack@mistystack',
        ],
        note: 'Mounts the 7 lean skills and registers the SessionStart core hook with zero external companion packs. The plugin keeps its original mistystack@mistystack identifier so existing installs keep updating.',
      },
      {
        id: 'local',
        name: 'Run misty-check',
        lines: [
          'git clone --depth 1 https://github.com/misty-step/spellbook.git /tmp/spellbook',
          'node /tmp/spellbook/skills/foundations/scripts/misty-check.mjs .',
        ],
        note: 'Run the deterministic baseline auditor against any local repository with Node 20+ and zero dependencies.',
      },
    ],
  },
  philosophy: {
    title: 'Why, before how.',
    body: 'Why durable intent beats ticket backlogs, why seven small skills beat forty playbooks, and why scripts beat prose: the bitter lesson applied to agent method. Kept in docs/philosophy.md for human readers and never auto-loaded into agent prompts.',
    primary: { label: 'Read the philosophy', href: '/philosophy/' },
    secondary: { label: 'Browse on GitHub', href: 'https://github.com/misty-step/spellbook' },
  },
  footer: {
    line: 'Spellbook (formerly mistystack) is portable agent craft and philosophy for coding agents, MIT licensed.',
  },
};
