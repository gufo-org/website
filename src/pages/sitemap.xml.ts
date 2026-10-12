import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Hand-rolled rather than @astrojs/sitemap: the site has a handful of pages.
const pages = ['/', '/docs', '/benchmarks', '/blog'];

export const GET: APIRoute = async ({ site }) => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const entries: { path: string; lastmod?: Date }[] = [
    ...pages.map((path) => ({ path })),
    ...posts.map((post) => ({ path: `/blog/${post.id}`, lastmod: post.data.date })),
  ];
  const urls = entries
    .map(({ path, lastmod }) => {
      const loc = new URL(path, site).href;
      return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;
    })
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
