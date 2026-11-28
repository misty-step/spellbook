#!/usr/bin/env node
/**
 * Deterministic, zero-LLM anti-slop checker for CSS and HTML-like markup.
 * Zero external dependencies: Node built-ins only.
 *
 * Usage:
 *   node skills/design/scripts/slop-check.mjs [path ...] [--json]
 *
 * Exit codes: 0 clean, 1 findings, 2 usage or read error.
 * Opt a file out of one rule with a justified comment anywhere in it:
 *   /* slop-check-allow: side-stripe -- printed pull-quote rule *\/
 *   <!-- slop-check-allow: nested-card -- reason -->
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.astro', '.next', '.nuxt', '.svelte-kit', '.cache', '.turbo', 'coverage', 'vendor']);
const CSS_EXT = new Set(['.css', '.scss', '.less']);
const MARKUP_EXT = new Set(['.html', '.htm', '.astro', '.vue', '.svelte', '.jsx', '.tsx']);
const MAX_FILES = 5000;
const MAX_BYTES = 1024 * 1024;
const MAX_UI_MS = 300;
const SPACING_LIMIT = 12;

export const RULES = {
  'side-stripe': 'Decorative one-sided accent bar on a box. Use a full hairline border, a tint, or a leading icon or label.',
  'nested-card': 'Card nested inside a card. Flatten: one container, then spacing and type carry the grouping.',
  'ai-gradient': 'Generic violet/purple gradient. Use the brand palette; one accent, placed where the decision lives.',
  'gradient-text': 'Gradient-filled text. Carry emphasis with weight, size or position.',
  'neon-glow': 'Zero-offset coloured glow. Depth comes from offset, soft shadows; emphasis from type and space.',
  'hard-shadow': 'Zero-blur offset block shadow outside a chosen neobrutalist world.',
  'eyebrow': 'Eyebrow or kicker label above a heading. Delete it and let the heading speak.',
  'transition-all': '`transition: all` animates layout and colour by accident. List the exact properties.',
  'ease-in': '`ease-in` on UI motion starts slow and feels dead. Use a strong ease-out, e.g. cubic-bezier(0.23, 1, 0.32, 1).',
  'scale-zero': 'Animating from `scale(0)` pops out of nowhere. Start from scale(0.95) with opacity 0.',
  'slow-motion': `UI motion longer than ${MAX_UI_MS}ms. Keep feedback under ${MAX_UI_MS}ms; allow justified modal or drawer exceptions.`,
  'reduced-motion': 'Motion ships without a `prefers-reduced-motion` alternative.',
  'focus-outline': 'Focus outline removed with no `:focus-visible` replacement anywhere.',
  'button-states': 'Buttons are styled without every interaction state: hover, active (press), disabled, pending and focus-visible.',
  'raw-dump': 'Raw JSON or ISO timestamps shown as prose. Render the few fields a reader needs as labelled, formatted values.',
  'img-size': '`<img>` without width and height shifts layout as it loads.',
  'spacing-scale': `More than ${SPACING_LIMIT} distinct raw px or rem spacing values. Calibrate a spacing scale in tokens (type-relative em offsets are exempt).`,
};

const VIOLET_NAMES = /\b(?:purple|violet|indigo|fuchsia|magenta|orchid|blueviolet|darkviolet|mediumpurple|rebeccapurple|plum)\b/i;
const BUTTON_SELECTOR = /(?:^|[\s,>+~(])(?:button|\.btn\b|\.button\b|\[type=["']?(?:submit|button)|\[role=["']?button)/i;
const MOTION_PROPS = new Set(['transition', 'transition-duration', 'animation', 'animation-duration']);

const lineAt = (text, offset) => text.slice(0, offset).split('\n').length;
const finding = (rule, file, line, detail) => ({ rule, file, line, message: RULES[rule], ...(detail ? { detail } : {}) });

/** Parse CSS (including nested and @-rule blocks) into flat rules with line numbers. */
export function parseCss(text, baseLine = 1) {
  const source = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const rules = [];
  const stack = [{ prelude: '', parts: [] }];
  let seg = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"' || c === "'") {
      const end = source.indexOf(c, i + 1);
      i = end === -1 ? source.length : end;
    } else if (c === '{') {
      const chunk = source.slice(seg, i);
      const semi = chunk.lastIndexOf(';');
      stack.at(-1).parts.push([seg, chunk.slice(0, semi + 1)]);
      stack.push({ prelude: chunk.slice(semi + 1).trim(), parts: [], start: seg + semi + 1 });
      seg = i + 1;
    } else if (c === '}' && stack.length > 1) {
      const block = stack.pop();
      block.parts.push([seg, source.slice(seg, i)]);
      seg = i + 1;
      if (block.prelude.startsWith('@')) continue;
      const ancestors = stack.map((s) => s.prelude).filter(Boolean);
      const selector = [...ancestors.filter((p) => !p.startsWith('@')), block.prelude].join(' ');
      const decls = [];
      for (const [offset, part] of block.parts) {
        let cursor = 0;
        for (const raw of part.split(';')) {
          const colon = raw.indexOf(':');
          if (colon > 0) {
            const prop = raw.slice(0, colon).trim().toLowerCase();
            const value = raw.slice(colon + 1).trim();
            const lead = raw.length - raw.trimStart().length;
            if (/^-?[a-z-]+$/.test(prop)) decls.push({ prop, value, line: baseLine + lineAt(source, offset + cursor + lead) - 1 });
          }
          cursor += raw.length + 1;
        }
      }
      const at = block.start + (source.slice(block.start).length - source.slice(block.start).trimStart().length);
      rules.push({ selector, atRules: ancestors.filter((p) => p.startsWith('@')), decls, line: baseLine + lineAt(source, at) - 1 });
    }
  }
  return rules;
}

/** Split a comma-separated CSS value at top level (ignoring commas inside parentheses). */
function splitTop(value, sep = ',') {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const c of value) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === sep && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const px = (token) => {
  const m = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(token);
  if (!m) return null;
  return Number(m[1]) * (m[2] === 'rem' || m[2] === 'em' ? 16 : 1);
};

function hsl(color) {
  let rgb;
  const hex = /^#([0-9a-f]{3,8})$/i.exec(color);
  if (hex) {
    const h = hex[1].length <= 4 ? [...hex[1]].map((x) => x + x).join('') : hex[1];
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  } else {
    const fn = /^(rgba?|hsla?)\(([^)]*)\)/i.exec(color);
    if (!fn) return null;
    const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
    const nums = parts.map((n) => parseFloat(n));
    if (/^hsl/i.test(fn[1])) return { h: ((nums[0] % 360) + 360) % 360, s: nums[1] / 100, l: nums[2] / 100 };
    rgb = parts.slice(0, 3).map((n, i) => nums[i] / (n.endsWith('%') ? 100 : 255));
  }
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: d / (1 - Math.abs(2 * l - 1)), l };
}

const COLOR_RE = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)/gi;
const isViolet = (c) => { const v = hsl(c); return Boolean(v && v.h >= 250 && v.h <= 310 && v.s >= 0.35 && v.l >= 0.2 && v.l <= 0.85); };
const saturated = (c) => { const v = hsl(c); return Boolean(v && v.s >= 0.5 && v.l > 0.15 && v.l < 0.9); };

const SATURATED_NAMES = /\b(?:cyan|aqua|lime|magenta|fuchsia|purple|violet|blue|deeppink|hotpink|springgreen)\b/i;

function shadowLayers(value) {
  return splitTop(value).map((layer) => {
    const colors = layer.match(COLOR_RE) ?? [];
    const lengths = layer.replace(COLOR_RE, ' ').replace(/\b[a-z]+\b/gi, ' ').split(/\s+/).filter(Boolean).map(px).filter((n) => n !== null);
    return { inset: /\binset\b/i.test(layer), lengths, glowing: colors.some(saturated) || SATURATED_NAMES.test(layer.replace(COLOR_RE, ' ')) };
  });
}

function durationsMs(value) {
  return [...value.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)].map((m) => Number(m[1]) * (m[2] === 's' ? 1000 : 1));
}

const borderWidth = (value) => value.toLowerCase().split(/\s+/).map((t) => (t === 'medium' ? 3 : t === 'thick' ? 5 : px(t))).find((n) => n !== null && n !== undefined) ?? 0;
const heavySide = (d, sides) => new RegExp(`^border-(?:${sides})(?:-width)?$`).test(d.prop) && !/\b(?:none|hidden)\b/i.test(d.value) && borderWidth(d.value) >= 2;
/** A heavy border on one vertical side; an L or corner shape (a checkmark, a bracket) also sets a horizontal side. */
const sideStripe = (d) => heavySide(d, 'left|right|inline-start|inline-end');
const crossSide = (d) => heavySide(d, 'top|bottom|block-start|block-end');

function cssFindings(file, rules, out, project) {
  for (const rule of rules) {
    const sel = rule.selector;
    const props = new Map(rule.decls.map((d) => [d.prop, d]));
    let textClipped = false;
    if (BUTTON_SELECTOR.test(` ${sel}`)) project.buttons.push({ file, line: rule.line, selector: sel });
    if (/:focus-visible/.test(sel) && rule.decls.some((d) => /^(outline|box-shadow|border)/.test(d.prop) && !/^(none|0)$/.test(d.value))) project.focusVisible = true;
    for (const d of rule.decls) {
      const v = d.value.toLowerCase();
      if (sideStripe(d) && !/blockquote/i.test(sel) && !rule.decls.some((o) => crossSide(o))) out.push(finding('side-stripe', file, d.line, `${d.prop}: ${d.value}`));
      if (d.prop === 'box-shadow' || d.prop === 'text-shadow') {
        for (const layer of shadowLayers(v)) {
          const [x = 0, y = 0, blur = 0, spread = 0] = layer.lengths;
          if (layer.inset && d.prop === 'box-shadow' && Math.abs(x) >= 2 && y === 0 && blur === 0 && spread === 0) out.push(finding('side-stripe', file, d.line, `${d.prop}: ${d.value}`));
          else if (!layer.inset && x === 0 && y === 0 && blur >= 8 && layer.glowing) out.push(finding('neon-glow', file, d.line, `${d.prop}: ${d.value}`));
          else if (!layer.inset && d.prop === 'box-shadow' && (x !== 0 || y !== 0) && blur === 0 && layer.lengths.length >= 2) out.push(finding('hard-shadow', file, d.line, `${d.prop}: ${d.value}`));
        }
      }
      if (/gradient\(/.test(v) && /^(background|background-image|border-image|mask|color)$/.test(d.prop)) {
        const colors = v.match(COLOR_RE) ?? [];
        if (VIOLET_NAMES.test(v) || colors.some(isViolet)) out.push(finding('ai-gradient', file, d.line, `${d.prop}: ${d.value}`));
      }
      if (/^(-webkit-)?background-clip$/.test(d.prop) && v === 'text' && !textClipped && rule.decls.some((p) => /gradient\(/.test(p.value))) {
        textClipped = true;
        out.push(finding('gradient-text', file, d.line));
      }
      if ((d.prop === 'transition' && splitTop(v).some((t) => /^all\b/.test(t))) || (d.prop === 'transition-property' && /\ball\b/.test(v))) out.push(finding('transition-all', file, d.line, `${d.prop}: ${d.value}`));
      if (/^(transition|animation)(-timing-function)?$/.test(d.prop) && /\bease-in\b(?!-)/.test(v)) out.push(finding('ease-in', file, d.line, `${d.prop}: ${d.value}`));
      if ((d.prop === 'transform' && /\bscale(?:3d)?\(\s*0(?:\.0+)?\s*[,)]/.test(v)) || (d.prop === 'scale' && /^0(?:\.0+)?(\s|$)/.test(v))) out.push(finding('scale-zero', file, d.line, `${d.prop}: ${d.value}`));
      if (MOTION_PROPS.has(d.prop)) {
        const ms = durationsMs(v);
        if (ms.some((n) => n > 0)) project.motion ??= { file, line: d.line };
        const looping = d.prop.startsWith('animation') && (/\binfinite\b/.test(v) || /infinite/.test(props.get('animation-iteration-count')?.value ?? ''));
        const reduced = rule.atRules.some((a) => /prefers-reduced-motion/.test(a));
        const longest = d.prop.endsWith('duration') ? Math.max(...ms) : Math.max(0, ...splitTop(v).map((t) => durationsMs(t)[0] ?? 0));
        if (!looping && !reduced && longest > MAX_UI_MS) out.push(finding('slow-motion', file, d.line, `${d.prop}: ${d.value}`));
      }
      if ((d.prop === 'outline' && /^(none|0)(\s|$)/.test(v)) || (d.prop === 'outline-style' && v === 'none')) project.outlineRemoved.push({ file, line: d.line });
      if (/^(margin|padding|gap|row-gap|column-gap)(-|$)/.test(d.prop) && !/var\(/.test(v)) {
        for (const t of v.split(/\s+/)) {
          if (!/^\d*\.?\d+(px|rem)$/.test(t) || /^(0|1px)$/.test(t)) continue;
          project.spacing.add(t);
          project.spacingAt ??= { file, line: d.line };
        }
      }
    }
    if (/::?(before|after)\b/.test(sel)) {
      const w = px(props.get('width')?.value ?? '');
      const tall = (props.get('top')?.value === '0' && props.get('bottom')?.value === '0') || /^100%$/.test(props.get('height')?.value ?? '') || /^0\b/.test(props.get('inset')?.value ?? '');
      const hasFill = [...props.keys()].some((p) => p.startsWith('background'));
      if (w !== null && w >= 2 && w <= 8 && tall && hasFill) out.push(finding('side-stripe', file, props.get('width').line, `${sel} { width: ${props.get('width').value} }`));
    }
  }
}

const CODE_TAGS = new Set(['pre', 'code', 'kbd', 'samp', 'script', 'style', 'textarea', 'template']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const CARD_TOKEN = /^(?:card|[a-z0-9]+[-_]card|[a-z0-9]*Card)$/;

const blank = (m) => m.replace(/[^\n]/g, ' ');

function markupFindings(file, source, out) {
  const text = source
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, blank)
    .replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (m, open, _tag, body, close) => open + blank(body) + close);
  const stack = [];
  let textStart = 0;
  const checkText = (end) => {
    const segment = text.slice(textStart, end);
    if (stack.some((e) => CODE_TAGS.has(e.name))) return;
    const dump = /\{\s*"[\w-]+"\s*:|\b\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:?\d\d)\b/.exec(segment);
    if (dump) out.push(finding('raw-dump', file, lineAt(text, textStart + dump.index), segment.trim().slice(0, 80)));
  };
  const tagRe = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w.-]*)((?:\s+(?:"[^"]*"|'[^']*'|\{[^}]*\}|[^\s>"'{}])*)*)\s*(\/?)>/g;
  for (const m of text.matchAll(tagRe)) {
    checkText(m.index);
    textStart = m.index + m[0].length;
    if (!m[2]) continue;
    const [, closing, tag, attrs, selfClose] = m;
    const name = tag.toLowerCase();
    if (closing) {
      const idx = stack.findLastIndex((e) => e.name === name);
      if (idx !== -1) stack.length = idx;
      continue;
    }
    const line = lineAt(text, m.index);
    const classes = (/(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*["'`]([^"'`]*)["'`]\s*\})/.exec(attrs) ?? []).slice(1).find((x) => x !== undefined)?.split(/\s+/).filter(Boolean) ?? [];
    const isCard = classes.some((c) => CARD_TOKEN.test(c));
    if (isCard && stack.some((e) => e.card)) out.push(finding('nested-card', file, line, `<${tag} class="${classes.join(' ')}">`));
    if (classes.some((c) => /^(?:eyebrow|kicker|overline)$|[-_](?:eyebrow|kicker)$/i.test(c))) out.push(finding('eyebrow', file, line, `<${tag} class="${classes.join(' ')}">`));
    if (tag === 'img' && !(/\swidth\s*=/.test(attrs) && /\sheight\s*=/.test(attrs))) out.push(finding('img-size', file, line, m[0].slice(0, 80)));
    if (!selfClose && !VOID.has(name)) stack.push({ name, card: isCard });
  }
  checkText(text.length);
}

function blocks(text) {
  const css = [];
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) css.push({ css: m[1], line: lineAt(text, m.index + m[0].indexOf('>') + 1) });
  for (const m of text.matchAll(/\sstyle\s*=\s*"([^"{}]*)"/gi)) css.push({ css: `[style] { ${m[1]} }`, line: lineAt(text, m.index) });
  return css;
}

const scannable = (name) => CSS_EXT.has(path.extname(name).toLowerCase()) || MARKUP_EXT.has(path.extname(name).toLowerCase());

function walk(target, files) {
  const st = statSync(target);
  if (st.isFile()) { if (scannable(target)) files.push(target); return; }
  for (const entry of readdirSync(target, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (files.length >= MAX_FILES) throw new Error(`scan exceeded ${MAX_FILES} files; narrow the path`);
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) walk(full, files); } else if (entry.isFile() && scannable(entry.name)) files.push(full);
  }
}

/** Scan files or directories and return { filesScanned, findings, allowed }. */
export function scan(targets, { cwd = process.cwd() } = {}) {
  const files = [];
  for (const t of targets) walk(path.resolve(cwd, t), files);
  const project = { buttons: [], focusVisible: false, motion: null, outlineRemoved: [], spacing: new Set(), spacingAt: null, reducedMotion: false };
  const raw = [];
  const allow = new Map();
  for (const full of files) {
    const st = statSync(full);
    if (st.size > MAX_BYTES) throw new Error(`${full}: larger than ${MAX_BYTES} bytes`);
    const text = readFileSync(full, 'utf8');
    const file = path.relative(cwd, full) || path.basename(full);
    const allowed = new Set([...text.matchAll(/slop-check-allow:\s*([a-z-]+)\s+--\s*\S/g)].map((m) => m[1]));
    allow.set(file, allowed);
    if (/prefers-reduced-motion/.test(text)) project.reducedMotion = true;
    const ext = path.extname(full).toLowerCase();
    if (CSS_EXT.has(ext)) cssFindings(file, parseCss(text), raw, project);
    else {
      markupFindings(file, text, raw);
      for (const b of blocks(text)) cssFindings(file, parseCss(b.css, b.line), raw, project);
    }
  }
  if (project.motion && !project.reducedMotion) raw.push(finding('reduced-motion', project.motion.file, project.motion.line));
  if (!project.focusVisible) for (const o of project.outlineRemoved) raw.push(finding('focus-outline', o.file, o.line));
  if (project.buttons.length) {
    const sels = project.buttons.map((b) => b.selector).join('\n');
    const missing = [
      [':hover', /:hover/],
      [':active', /:active/],
      ['disabled', /:disabled|\[disabled|\[aria-disabled/],
      ['pending', /\[aria-busy|\[data-(?:pending|loading)|\[data-state=["']?(?:pending|loading)|\.is-(?:pending|loading)|:has\([^)]*(?:spinner|loading)/],
    ].filter(([, re]) => !re.test(sels)).map(([n]) => n);
    if (!project.focusVisible) missing.push(':focus-visible');
    if (missing.length) raw.push(finding('button-states', project.buttons[0].file, project.buttons[0].line, `missing ${missing.join(', ')}`));
  }
  if (project.spacing.size > SPACING_LIMIT) raw.push(finding('spacing-scale', project.spacingAt.file, project.spacingAt.line, `${project.spacing.size} values: ${[...project.spacing].sort().join(' ')}`));
  const findings = [];
  const allowedFindings = [];
  for (const f of raw) ((allow.get(f.file)?.has(f.rule)) ? allowedFindings : findings).push(f);
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  return { filesScanned: files.length, findings, allowed: allowedFindings };
}

export function format(report) {
  const lines = [];
  const fileCount = new Set(report.findings.map((f) => f.file)).size;
  lines.push(report.findings.length
    ? `slop-check: ${report.findings.length} finding${report.findings.length === 1 ? '' : 's'} in ${fileCount} file${fileCount === 1 ? '' : 's'} (${report.filesScanned} scanned)`
    : `slop-check: clean (${report.filesScanned} file${report.filesScanned === 1 ? '' : 's'} scanned)`);
  for (const f of report.findings) {
    lines.push(`  ${f.rule.padEnd(15)} ${f.file}:${f.line}`);
    lines.push(`    ${f.message}${f.detail ? `\n    > ${f.detail}` : ''}`);
  }
  if (report.allowed.length) lines.push(`  ${report.allowed.length} allowed by slop-check-allow comments`);
  return lines.join('\n');
}

function main(argv) {
  const json = argv.includes('--json');
  const targets = argv.filter((a) => a !== '--json');
  if (targets.some((a) => a.startsWith('-'))) {
    process.stderr.write('Usage: slop-check.mjs [path ...] [--json]\n');
    return 2;
  }
  let report;
  try { report = scan(targets.length ? targets : ['.']); } catch (error) {
    process.stderr.write(`slop-check: ${error.message}\n`);
    return 2;
  }
  process.stdout.write(`${json ? JSON.stringify(report, null, 2) : format(report)}\n`);
  return report.findings.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main(process.argv.slice(2));
