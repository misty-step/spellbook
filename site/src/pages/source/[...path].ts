import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getGraph } from '../../lib/content.mjs';
import { TOOL_SCRIPTS } from '../../lib/graph.mjs';
import { repoRoot } from '../../lib/release.mjs';

export async function getStaticPaths() {
  const graph = await getGraph();
  const docs = graph.documents.map((document) => ({
    params: { path: document.id },
    props: { raw: document.raw, contentType: 'text/markdown; charset=utf-8' },
  }));
  const scripts = TOOL_SCRIPTS.flatMap((tool) => [tool.path, ...(tool.modules ?? [])]).map((file) => ({
    params: { path: file },
    props: {
      raw: readFileSync(path.join(repoRoot, file), 'utf8'),
      contentType: file.endsWith('.mjs') ? 'text/javascript; charset=utf-8' : 'text/plain; charset=utf-8',
    },
  }));
  return [...docs, ...scripts];
}

export function GET({ props }) {
  return new Response(props.raw, { headers: { 'Content-Type': props.contentType } });
}
