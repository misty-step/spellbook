import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// Read canonical lean method files in place.
const repository = defineCollection({
  loader: glob({
    base: new URL('../../', import.meta.url),
    pattern: [
      'skills/*/SKILL.md',
      'rules/core.md',
      'docs/philosophy.md',
    ],
    generateId: ({ entry }) => entry,
    deferRender: true,
  }),
});

export const collections = { repository };
