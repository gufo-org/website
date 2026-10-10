import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Posts are plain Markdown, or MDX when they embed components such as <CacheFigure>.
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

export const collections = { blog };
