import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Posts are plain Markdown, or MDX when they embed components such as the interactive figures.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    kind: z.enum(['Engineering', 'Measured', 'Notes']),
    tags: z.array(z.string()).default([]),
    // Status chip for posts that follow work in progress, like the cache page's eyebrow.
    status: z.enum(['being built', 'shipped', 'measured']).optional(),
    related: z.array(z.object({ label: z.string(), title: z.string(), href: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

// Gufo's public documentation, one directory per synced release (scripts/sync-docs.mjs).
// versions.json beside it lists the versions, newest first, with their navigation.
const docs = defineCollection({
  // Keep the file path as the id: the default slugger drops the dot in qwen3.8-27b.
  loader: glob({ pattern: '**/*.md', base: './src/content/docs', generateId: ({ entry }) => entry.replace(/\.md$/, '') }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    // Path of the page in the Gufo repository, for the source link.
    source: z.string(),
  }),
});

export const collections = { blog, docs };
