import index from '../.generated/skill-index.json';
import { handleFind } from '../src/lib/find-api.mjs';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/healthz') {
      return new Response(
        JSON.stringify({ ok: true, service: 'mistystack-site', revision: index.revision, skills: index.skills.length }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
      );
    }
    if (pathname === '/api/find') return handleFind(request, env, index.skills);
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ degraded: true, reason: 'not_found', results: [] }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
