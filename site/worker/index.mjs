import index from '../.generated/skill-index.json';
import { handleClientError } from '../src/lib/client-error.mjs';
import { handleFind } from '../src/lib/find-api.mjs';

const service = 'mistystack-site';

function route(request, env) {
  const { pathname } = new URL(request.url);
  if (pathname === '/healthz') {
    return new Response(
      JSON.stringify({ ok: true, service, revision: index.revision, skills: index.skills.length }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
    );
  }
  if (pathname === '/api/find') return handleFind(request, env, index.skills);
  if (pathname === '/api/client-error') return handleClientError(request, env, { service, release: index.revision });
  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ degraded: true, reason: 'not_found', results: [] }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      // One structured line with release identity, then fail loudly: the platform records the exception.
      console.error(JSON.stringify({
        event: 'worker_error',
        service,
        release: index.revision,
        path: new URL(request.url).pathname,
        message: String(error?.message ?? error).slice(0, 300),
      }));
      throw error;
    }
  },
};
