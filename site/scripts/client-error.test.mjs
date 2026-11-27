import assert from 'node:assert/strict';
import test from 'node:test';
import { handleClientError } from '../src/lib/client-error.mjs';

const context = (lines) => ({ service: 'mistystack-site', release: 'abc1234', log: (line) => lines.push(JSON.parse(line)) });
const post = (body, headers = {}) => new Request('https://stack.example/api/client-error', {
  method: 'POST',
  headers: { 'user-agent': 'test-agent', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('beacon logs one structured line with release identity and strips query strings and fragments', async () => {
  const lines = [];
  const response = await handleClientError(post({
    kind: 'securitypolicyviolation',
    path: '/find/?q=private+words#frag',
    directive: 'connect-src',
    blocked: 'https://third.example/collect?token=secret',
    source: 'https://stack.example/_astro/site.js?v=1',
    line: 12,
    column: 3,
    disposition: 'enforce',
    extra: 'dropped',
  }), {}, context(lines));
  assert.equal(response.status, 204);
  assert.deepEqual(lines, [{
    event: 'client_error',
    service: 'mistystack-site',
    release: 'abc1234',
    kind: 'securitypolicyviolation',
    path: '/find/',
    message: null,
    source: 'https://stack.example/_astro/site.js',
    line: 12,
    column: 3,
    directive: 'connect-src',
    blocked: 'https://third.example/collect',
    disposition: 'enforce',
    userAgent: 'test-agent',
  }]);

  await handleClientError(post({ kind: 'error', path: '/', message: 'x'.repeat(5000).slice(0, 900), line: -1, column: 'NaN' }), {}, context(lines));
  assert.equal(lines[1].message.length, 300);
  assert.equal(lines[1].line, null);
  assert.equal(lines[1].column, null);
});

test('beacon rejects wrong methods, cross-origin posts, malformed, unknown and oversize reports without logging', async () => {
  const lines = [];
  const get = await handleClientError(new Request('https://stack.example/api/client-error'), {}, context(lines));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  assert.equal((await handleClientError(post({ kind: 'error' }, { origin: 'https://evil.example' }), {}, context(lines))).status, 403);
  assert.equal((await handleClientError(post('not json'), {}, context(lines))).status, 400);
  assert.equal((await handleClientError(post({ kind: 'pageview' }), {}, context(lines))).status, 400);
  assert.equal((await handleClientError(post({ kind: 'error', message: 'x'.repeat(5000) }), {}, context(lines))).status, 400);
  assert.equal((await handleClientError(post({ kind: 'error' }, { origin: 'https://stack.example' }), {}, context(lines))).status, 204);
  assert.equal(lines.length, 1);
});

test('beacon honors the rate limiter and stays open when the limiter is absent or failing', async () => {
  const lines = [];
  const keys = [];
  const limited = await handleClientError(post({ kind: 'error' }, { 'CF-Connecting-IP': '203.0.113.9' }), {
    CLIENT_ERROR_LIMITER: { limit: async ({ key }) => { keys.push(key); return { success: false }; } },
  }, context(lines));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.deepEqual(keys, ['mistystack:client-error:203.0.113.9']);
  assert.equal(lines.length, 0);

  const failing = { CLIENT_ERROR_LIMITER: { limit: async () => { throw new Error('limiter down'); } } };
  assert.equal((await handleClientError(post({ kind: 'unhandledrejection', message: 'boom' }), failing, context(lines))).status, 204);
  const admitted = { CLIENT_ERROR_LIMITER: { limit: async () => ({ success: true }) } };
  assert.equal((await handleClientError(post({ kind: 'unhandledrejection', message: 'boom' }), admitted, context(lines))).status, 204);
  assert.equal(lines.length, 2);
});
