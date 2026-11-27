/**
 * Observability & auto-triage audit for misty-check.mjs.
 * Zero external dependencies — Node built-ins only.
 *
 * Hides one decision: how a repository proves it will scream in production
 * (truthful health endpoint, production telemetry, client error + CSP capture).
 * Detection is heuristic and bounded; findings are advisory unless the caller
 * enforces them (`--strict-observability`) and can be opted out per rule via
 * `observability:` lines in `.misty-check.allow`.
 */

import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const OBSERVABILITY_RULES = ['health', 'config', 'client-errors'];

const MAX_DEPTH = 6;
const MAX_FILES = 2000;
const MAX_FILE_BYTES = 256 * 1024;
const EVIDENCE_LIMIT = 3;
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'target', '.astro', '.next', '.nuxt', '.svelte-kit', '.venv', 'venv',
  '__pycache__', 'coverage', '.cache', '.turbo', '.generated', 'vendor', '.wrangler', '.output', 'out',
  '__tests__', 'test', 'tests', 'fixtures', '__fixtures__', 'testdata',
]);
const TEST_FILE_RE = /\.(?:test|spec)\.[^/]+$/i;
const SELF_RE = /(?:^|\/)misty-check[\w-]*\.mjs$/;
// Build, release, and check tooling may start throwaway servers or probe health; it is not the deployed runtime.
const TOOLING_PATH_RE = /(?:^|\/)(?:scripts|tools|tooling|\.github)\//i;

const SERVER_CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx',
  '.py', '.rs', '.go', '.rb', '.java', '.kt', '.cs', '.php', '.astro', '.svelte', '.vue',
]);
const CLIENT_CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.astro', '.svelte', '.vue', '.html', '.htm',
]);
const CONFIG_EXTENSIONS = new Set(['.json', '.jsonc', '.toml', '.yaml', '.yml', '.conf']);
const HASH_COMMENT_EXTENSIONS = new Set(['.py', '.sh', '.rb', '.yaml', '.yml', '.toml', '.conf', '.txt', '']);
const CONFIG_BASENAMES = new Set(['Dockerfile', 'Procfile', 'Caddyfile', '_headers', 'go.mod']);

const WRANGLER_FILE_RE = /^wrangler(?:\.[\w-]+)?\.(toml|jsonc?)$/i;
const HEALTH_ROUTE_RE = /(?:\/healthz|\/api\/healthz?)(?![a-z0-9_-])/i;
const HEALTH_FILE_ROUTE_RE = /(?:^|\/)(?:api\/healthz?|healthz)(?:\/(?:route|index|\+server))?\.[a-z]+$/i;
const HEALTH_WINDOW_BEFORE = 5;
const HEALTH_WINDOW_AFTER = 40;
const IDENTITY_WORDS = new Set(['version', 'revision', 'commit', 'sha', 'release', 'build', 'uptime']);

const SERVER_LISTEN_RE = /\b(?:createServer|Deno\.serve|Bun\.serve|http\.ListenAndServe(?:TLS)?)\s*\(/;
const JS_SERVER_DEPS = new Set([
  'express', 'fastify', 'koa', 'hono', '@hapi/hapi', '@nestjs/core', 'restify', 'polka', 'h3', 'elysia', 'itty-router',
]);
const MANIFEST_SERVER_RE = {
  'pyproject.toml': /^\s*["']?(?:fastapi|flask|django|starlette|aiohttp|sanic|tornado|uvicorn|gunicorn|litestar|quart)\b/im,
  'requirements.txt': /^\s*(?:fastapi|flask|django|starlette|aiohttp|sanic|tornado|uvicorn|gunicorn|litestar|quart)\b/im,
  'cargo.toml': /^\s*(?:axum|actix-web|warp|rocket|tide|poem|tonic|hyper)\s*=/im,
  'go.mod': /\b(?:gin-gonic\/gin|labstack\/echo|gofiber\/fiber|go-chi\/chi|gorilla\/mux)\b/i,
};
const MANIFEST_REPORTING_RE = {
  'pyproject.toml': /^\s*["']?(?:sentry-sdk|opentelemetry-[\w-]+|ddtrace|rollbar|bugsnag|honeybadger)\b/im,
  'requirements.txt': /^\s*(?:sentry-sdk|opentelemetry-[\w-]+|ddtrace|rollbar|bugsnag|honeybadger)\b/im,
  'cargo.toml': /^\s*(?:sentry|opentelemetry|tracing-opentelemetry)\s*=/im,
  'go.mod': /\b(?:getsentry\/sentry-go|go\.opentelemetry\.io\/otel)\b/i,
};

const SENTRY_CLIENT_DEP_RE = /^@sentry\/(?:browser|react|vue|svelte|angular|solid|ember|gatsby|nextjs|nuxt|sveltekit|astro|remix|react-router|solidstart|tanstackstart(?:-react)?)$/;
const SERVER_REPORTING_DEP_RE = /^(?:@sentry\/(?:node|cloudflare|bun|deno|serverless|aws-serverless|google-cloud-serverless|nestjs|nextjs|nuxt|sveltekit|astro|remix|react-router|solidstart|tanstackstart(?:-react)?)|toucan-js|@opentelemetry\/.+|dd-trace|@honeybadger-io\/js|@bugsnag\/(?:js|node)|rollbar|newrelic|@axiomhq\/.+|@logtail\/.+)$/;
const SERVER_REPORTING_CODE_RE = /\bSENTRY_DSN\b|\bSentry\.init\s*\(|\bsentry_sdk\.init\s*\(|\bsentry\.Init\s*\(|\bsentry::init\s*\(|\/api\/[^\s"'`]*\/envelope\/|ingest\.[\w.-]*sentry\.io/;
const SENTRY_CLIENT_CODE_RE = /["'`]@sentry\/(?:browser|react|vue|svelte|angular|solid|nextjs|nuxt|sveltekit|astro|remix)["'`]|(?:browser|js)\.sentry-cdn\.com/;

const CSP_LISTENER_RE = /addEventListener\s*\(\s*["'`]securitypolicyviolation["'`]|\bonsecuritypolicyviolation\s*=/;
const REJECTION_LISTENER_RE = /addEventListener\s*\(\s*["'`]unhandledrejection["'`]|\bonunhandledrejection\s*=/;
const ERROR_LISTENER_RE = /addEventListener\s*\(\s*["'`]error["'`]|\b(?:window|self|globalThis)\.onerror\s*=/;
const FORWARD_RE = /\bsendBeacon\s*\(|\bfetch\s*\(|\bXMLHttpRequest\b|\bcapture(?:Exception|Message|Event)\s*\(|\breport[A-Za-z]*\s*\(/;
const CSP_REPORT_DIRECTIVE_RE = /\breport-(?:uri|to)\s+[^;\s"'`]/i;

function stripHashComments(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      let quote = null;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '\\' && quote !== "'") i += 1;
        else if (quote) quote = ch === quote ? null : quote;
        else if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '#') return line.slice(0, i);
      }
      return line;
    })
    .join('\n');
}

function stripComments(text, ext) {
  if (HASH_COMMENT_EXTENSIONS.has(ext)) return stripHashComments(text);
  const withoutMarkup = ext === '.html' || ext === '.htm' ? text.replace(/<!--[\s\S]*?-->/g, '') : text;
  return withoutMarkup
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/[^\r\n]*/g, '$1');
}

/** Parse JSON with comments and trailing commas (wrangler.jsonc); null when malformed. */
function parseJsonc(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === '\\') out += text[++i] ?? '';
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      out += '\n';
    } else if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
    } else {
      out += ch;
    }
  }
  try {
    return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
  } catch {
    return null;
  }
}

function observabilityEnabled(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.head_sampling_rate === 0) return false;
  return value.enabled === true || value.logs?.enabled === true || value.traces?.enabled === true;
}

function wranglerJsonTelemetry(text) {
  const config = parseJsonc(text);
  if (!config || typeof config !== 'object') return false;
  const scopes = [config, ...Object.values(config.env && typeof config.env === 'object' ? config.env : {})];
  return scopes.some((scope) => scope && typeof scope === 'object' && (
    observabilityEnabled(scope.observability) ||
    scope.logpush === true ||
    (Array.isArray(scope.tail_consumers) && scope.tail_consumers.length > 0)
  ));
}

function wranglerTomlTelemetry(text) {
  let table = '';
  for (const raw of stripHashComments(text).split(/\r?\n/)) {
    const line = raw.trim();
    const header = /^\[\[?\s*([^\]]+?)\s*\]\]?$/.exec(line);
    if (header) {
      table = header[1].replace(/\s+/g, '');
      if (/(?:^|\.)tail_consumers$/.test(table)) return true;
      continue;
    }
    if (/^(?:env\.[^.]+\.)?observability(?:\.(?:logs|traces))?$/.test(table) && /^enabled\s*=\s*true\b/.test(line)) return true;
    if (/^(?:env\.[^.]+)?$/.test(table) && (/^logpush\s*=\s*true\b/.test(line) || /^observability\s*=\s*\{[^}]*\benabled\s*=\s*true\b/.test(line))) return true;
  }
  return false;
}

/** True when identifiers near a health route name a release or runtime identity (version, commit, uptime…). */
function hasIdentitySignal(text) {
  for (const match of text.matchAll(/[A-Za-z][a-z]+|[A-Z]{2,}(?![a-z])/g)) {
    if (IDENTITY_WORDS.has(match[0].toLowerCase())) return true;
  }
  return false;
}

function healthRouteVerdict(rel, code) {
  if (HEALTH_FILE_ROUTE_RE.test(rel)) return hasIdentitySignal(code) ? 'real' : 'stub';
  const lines = code.split(/\r?\n/);
  let seen = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (!HEALTH_ROUTE_RE.test(lines[i])) continue;
    seen = true;
    const window = lines.slice(Math.max(0, i - HEALTH_WINDOW_BEFORE), i + HEALTH_WINDOW_AFTER + 1).join('\n');
    if (hasIdentitySignal(window.replace(new RegExp(HEALTH_ROUTE_RE.source, 'gi'), ''))) return 'real';
  }
  return seen ? 'stub' : null;
}

function collectSignals(rootReal) {
  const signals = {
    worker: [], service: [], healthReal: [], healthStub: [], telemetryOn: [], telemetryOff: [],
    serverReporting: [], sentryClient: [], cspCapture: [], errorCapture: [], listenOnly: [],
  };
  let scanned = 0;
  let truncated = false;
  const record = (list, rel) => {
    if (list.length < EVIDENCE_LIMIT && !list.includes(rel)) list.push(rel);
  };

  function inspectManifest(rel, lowerBase, text) {
    if (lowerBase === 'package.json') {
      let pkg;
      try {
        pkg = JSON.parse(text);
      } catch {
        return;
      }
      const deps = Object.keys({ ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}), ...(pkg?.peerDependencies ?? {}) });
      if (deps.some((dep) => JS_SERVER_DEPS.has(dep))) record(signals.service, rel);
      if (deps.some((dep) => SERVER_REPORTING_DEP_RE.test(dep))) record(signals.serverReporting, rel);
      if (deps.some((dep) => SENTRY_CLIENT_DEP_RE.test(dep))) record(signals.sentryClient, rel);
      return;
    }
    const key = /^requirements[\w.-]*\.txt$/.test(lowerBase) ? 'requirements.txt' : lowerBase;
    const active = stripHashComments(text);
    if (MANIFEST_SERVER_RE[key]?.test(active)) record(signals.service, rel);
    if (MANIFEST_REPORTING_RE[key]?.test(active)) record(signals.serverReporting, rel);
  }

  function inspectFile(rel, base, text) {
    const lowerBase = base.toLowerCase();
    const ext = path.extname(lowerBase);
    const wrangler = WRANGLER_FILE_RE.exec(base);
    if (wrangler) {
      record(signals.worker, rel);
      const on = wrangler[1].toLowerCase() === 'toml' ? wranglerTomlTelemetry(text) : wranglerJsonTelemetry(text);
      record(on ? signals.telemetryOn : signals.telemetryOff, rel);
    }
    if (lowerBase === 'package.json' || lowerBase === 'pyproject.toml' || lowerBase === 'cargo.toml' || lowerBase === 'go.mod' || /^requirements[\w.-]*\.txt$/.test(lowerBase)) {
      inspectManifest(rel, lowerBase, text);
      if (lowerBase === 'package.json') return;
    }
    const code = stripComments(text, ext);
    if ((base === 'Dockerfile' && /^\s*EXPOSE\s+\d/im.test(code)) || (base === 'Procfile' && /^web\s*:/im.test(code)) || lowerBase === 'fly.toml') {
      record(signals.service, rel);
    }
    if (CSP_REPORT_DIRECTIVE_RE.test(code)) record(signals.cspCapture, rel);
    if (SERVER_REPORTING_CODE_RE.test(code)) record(signals.serverReporting, rel);

    if (SERVER_CODE_EXTENSIONS.has(ext) && !TOOLING_PATH_RE.test(rel)) {
      if (SERVER_LISTEN_RE.test(code)) record(signals.service, rel);
      const verdict = healthRouteVerdict(rel, code);
      if (verdict === 'real') record(signals.healthReal, rel);
      else if (verdict === 'stub') record(signals.healthStub, rel);
    }
    if (CLIENT_CODE_EXTENSIONS.has(ext)) {
      if (SENTRY_CLIENT_CODE_RE.test(code)) record(signals.sentryClient, rel);
      const csp = CSP_LISTENER_RE.test(code);
      const errors = REJECTION_LISTENER_RE.test(code) || ERROR_LISTENER_RE.test(code);
      if (csp || errors) {
        if (!FORWARD_RE.test(code)) record(signals.listenOnly, rel);
        else {
          if (csp) record(signals.cspCapture, rel);
          if (errors) record(signals.errorCapture, rel);
        }
      }
    }
  }

  function walk(dir, depth) {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !SKIP_DIRS.has(entry.name.toLowerCase())) walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = path.relative(rootReal, full).replaceAll(path.sep, '/');
      if (TEST_FILE_RE.test(rel) || SELF_RE.test(rel)) continue;
      const ext = path.extname(entry.name).toLowerCase();
      const wanted = SERVER_CODE_EXTENSIONS.has(ext) || CLIENT_CODE_EXTENSIONS.has(ext) || CONFIG_EXTENSIONS.has(ext) ||
        CONFIG_BASENAMES.has(entry.name) || /^requirements[\w.-]*\.txt$/i.test(entry.name);
      if (!wanted) continue;
      if (scanned >= MAX_FILES) {
        truncated = true;
        return;
      }
      scanned += 1;
      try {
        const stat = lstatSync(full);
        if (stat.size === 0 || stat.size > MAX_FILE_BYTES) continue;
        const text = readFileSync(full, 'utf8');
        if (!text.includes('\0')) inspectFile(rel, entry.name, text);
      } catch {
        // Ignore unreadable files.
      }
    }
  }

  walk(rootReal, 0);
  return { signals, truncated };
}

function evaluateRules(signals, surfaces) {
  const checks = [];
  if (signals.healthReal.length > 0) {
    checks.push({ rule: 'health', label: 'Health endpoint', ok: true, evidence: signals.healthReal, detail: `Health route reports release/runtime identity in ${signals.healthReal.join(', ')}` });
  } else if (signals.healthStub.length > 0) {
    checks.push({
      rule: 'health', label: 'Health endpoint', ok: false, evidence: signals.healthStub,
      detail: `Health route in ${signals.healthStub.join(', ')} returns no release or runtime identity (looks like a hardcoded stub)`,
      fix: 'Return the deployed commit/version and real dependency readiness from /healthz or /api/health.',
    });
  } else {
    checks.push({
      rule: 'health', label: 'Health endpoint', ok: false, evidence: [],
      detail: 'No /healthz or /api/health route found in source',
      fix: 'Serve /healthz (or /api/health) from the live runtime, returning the deployed commit/version and real readiness.',
    });
  }

  const telemetry = [...signals.telemetryOn, ...signals.serverReporting, ...signals.sentryClient];
  if (signals.telemetryOn.length > 0 || signals.serverReporting.length > 0 || signals.sentryClient.length > 0) {
    const kinds = [
      signals.telemetryOn.length > 0 ? `Workers observability enabled in ${signals.telemetryOn.join(', ')}` : null,
      signals.serverReporting.length > 0 ? `error reporting wired in ${signals.serverReporting.join(', ')}` : null,
      signals.serverReporting.length === 0 && signals.sentryClient.length > 0 ? `Sentry client SDK in ${signals.sentryClient.join(', ')}` : null,
    ].filter(Boolean);
    checks.push({ rule: 'config', label: 'Production telemetry', ok: true, evidence: [...new Set(telemetry)].slice(0, EVIDENCE_LIMIT), detail: kinds.join('; ') });
  } else if (signals.telemetryOff.length > 0) {
    checks.push({
      rule: 'config', label: 'Production telemetry', ok: false, evidence: signals.telemetryOff,
      detail: `${signals.telemetryOff.join(', ')} does not enable Workers observability and no server-side error reporting is wired`,
      fix: 'Set "observability": { "enabled": true } in wrangler config, or forward server errors to Sentry (SENTRY_DSN) or another error sink.',
    });
  } else {
    checks.push({
      rule: 'config', label: 'Production telemetry', ok: false, evidence: [],
      detail: 'No production observability config or server-side error reporting found',
      fix: 'Wire structured error reporting with release and environment context (Sentry DSN, OpenTelemetry, or platform observability config).',
    });
  }

  if (surfaces.includes('web-app')) {
    const missing = [
      signals.cspCapture.length === 0 ? 'securitypolicyviolation (CSP) capture' : null,
      signals.errorCapture.length === 0 ? 'unhandledrejection/error capture' : null,
    ].filter(Boolean);
    if (signals.sentryClient.length > 0) {
      checks.push({ rule: 'client-errors', label: 'Client error + CSP capture', ok: true, evidence: signals.sentryClient, detail: `Sentry client SDK in ${signals.sentryClient.join(', ')}` });
    } else if (missing.length === 0) {
      const evidence = [...new Set([...signals.cspCapture, ...signals.errorCapture])].slice(0, EVIDENCE_LIMIT);
      checks.push({ rule: 'client-errors', label: 'Client error + CSP capture', ok: true, evidence, detail: `Browser errors and CSP violations are forwarded from ${evidence.join(', ')}` });
    } else {
      const listenOnly = signals.listenOnly.length > 0 ? `; ${signals.listenOnly.join(', ')} listens but never forwards (no sendBeacon/fetch/reporter call)` : '';
      checks.push({
        rule: 'client-errors', label: 'Client error + CSP capture', ok: false, evidence: signals.listenOnly,
        detail: `Missing forwarded ${missing.join(' and ')}${listenOnly}`,
        fix: 'Forward securitypolicyviolation, unhandledrejection, and error events to a same-origin beacon that relays to the error sink (zero-SDK under connect-src \'self\'), or install a Sentry client SDK.',
      });
    }
  }
  return checks;
}

/**
 * Audit a repository's production observability readiness.
 * @param {string} rootReal Resolved repository root.
 * @param {{ webApp?: boolean, allowFile?: string | null, allowRules?: Array<{ token: string, rawPattern: string }> }} options
 */
export function inspectObservability(rootReal, { webApp = false, allowFile = null, allowRules = [] } = {}) {
  const { signals, truncated } = collectSignals(rootReal);
  const surfaces = [
    webApp ? 'web-app' : null,
    signals.worker.length > 0 ? 'worker' : null,
    signals.service.length > 0 ? 'service' : null,
  ].filter(Boolean);
  const known = allowRules.filter(({ token }) => token === '*' || token === 'all' || OBSERVABILITY_RULES.includes(token));
  const unknownAllowRules = allowRules.filter((entry) => !known.includes(entry)).map(({ rawPattern }) => rawPattern);
  const surfaceEvidence = { worker: signals.worker, service: signals.service };
  const base = { advisoryOnly: true, applicable: surfaces.length > 0, surfaces, surfaceEvidence, truncated, allowFile, unknownAllowRules };
  if (surfaces.length === 0) {
    return { ...base, status: 'not-applicable', findings: [], suppressed: [], checks: [] };
  }

  const findings = [];
  const suppressed = [];
  const checks = evaluateRules(signals, surfaces).map(({ rule, label, ok, evidence, detail, fix }) => {
    const id = `observability-${rule}`;
    if (ok) return { id, rule, label, status: 'pass', detail, evidence };
    const scanNote = truncated ? ` (scan capped at ${MAX_FILES} files)` : '';
    const allow = known.find(({ token }) => token === rule || token === '*' || token === 'all');
    if (allow) {
      suppressed.push({ id, rule, label, detail: `${detail}${scanNote}`, matchedPattern: allow.rawPattern });
      return { id, rule, label, status: 'allowed', detail: `Opted out via ${allowFile} (${allow.rawPattern})`, evidence };
    }
    findings.push({ id, rule, label, detail: `${detail}${scanNote}`, fix });
    return { id, rule, label, status: 'advisory', detail: `${detail}${scanNote}`, fix, evidence };
  });
  return { ...base, status: findings.length === 0 ? 'pass' : 'advisory', findings, suppressed, checks };
}

export function formatObservability(observability) {
  if (!observability) return [];
  const warnings = observability.unknownAllowRules.map((raw) => `[WARN] Unknown observability allow rule "${raw}" (use observability:health, observability:config, observability:client-errors, or observability:*)`);
  if (!observability.applicable) {
    return ['', 'Observability & auto-triage: not applicable (no web app, worker, or service surface detected)', ...warnings];
  }
  const lines = ['', `Observability & auto-triage (${observability.surfaces.join(', ')}; advisory, enforce with --strict-observability):`];
  const width = Math.max(...observability.checks.map((c) => c.label.length));
  for (const check of observability.checks) {
    const tag = check.status === 'pass' ? '[OK  ]' : check.status === 'allowed' ? '[SKIP]' : '[ADV ]';
    lines.push(`${tag} ${check.label.padEnd(width)}  ${check.detail}`);
    if (check.status === 'advisory' && check.fix) lines.push(`  fix: ${check.fix}`);
  }
  return [...lines, ...warnings];
}
