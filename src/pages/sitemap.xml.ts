import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';

// Hand-rolled rather than @astrojs/sitemap: the site has a handful of pages.
const pages = ['/', '/docs', '/benchmarks'];

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const entries: { path: string; lastmod?: Date }[] = [
    ...pages.map((path) => ({ path })),
    // The blog index is listed once it has something to show.
    ...(posts.length > 0 ? [{ path: '/blog' }] : []),
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
