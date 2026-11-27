// Same-origin browser error beacon. No SDK and no third-party origin, so the strict
// connect-src 'self' policy holds. Reports land in production logs (Workers
// observability) as one structured line carrying the release identity, ready for
// automated triage. They never carry query strings, fragments or unbounded text.

const MAX_BYTES = 4096;
const KINDS = new Set(['error', 'unhandledrejection', 'securitypolicyviolation']);
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

const reply = (status, extra = {}) => new Response(null, { status, headers: { ...headers, ...extra } });
const text = (value, max) => (typeof value === 'string' && value ? value.slice(0, max) : null);
const count = (value) => (Number.isInteger(value) && value >= 0 ? value : null);
/** Query strings and fragments can hold private text; keep the location only. */
const place = (value) => text(typeof value === 'string' ? value.split(/[?#]/, 1)[0] : null, 300);

async function readReport(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return body && typeof body === 'object' && KINDS.has(body.kind) ? body : null;
  } catch { return null; }
}

export async function handleClientError(request, env, { service, release, log = console.error }) {
  if (request.method !== 'POST') return reply(405, { Allow: 'POST' });
  if (request.headers.has('origin') && request.headers.get('origin') !== new URL(request.url).origin) return reply(403);
  try {
    // Admission is best effort: a missing limiter must not silence real failures.
    const client = request.headers.get('CF-Connecting-IP') ?? 'local-development';
    const admission = await env.CLIENT_ERROR_LIMITER?.limit({ key: `mistystack:client-error:${client}` });
    if (admission && !admission.success) return reply(429, { 'Retry-After': '60' });
  } catch { /* Accept the bounded report. */ }
  const report = await readReport(request);
  if (!report) return reply(400);
  log(JSON.stringify({
    event: 'client_error',
    service,
    release,
    kind: report.kind,
    path: place(report.path),
    message: text(report.message, 300),
    source: place(report.source),
    line: count(report.line),
    column: count(report.column),
    directive: text(report.directive, 80),
    blocked: place(report.blocked),
    disposition: text(report.disposition, 20),
    userAgent: text(request.headers.get('user-agent'), 200),
  }));
  return reply(204);
}
