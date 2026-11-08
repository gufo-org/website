import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import rehypeFigures from './src/lib/rehype-figures.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://gufo.blog',
  // Emit docs.html rather than docs/index.html, so GitHub Pages serves /docs
  // directly instead of redirecting to /docs/.
  build: { format: 'file' },
  trailingSlash: 'never',
  integrations: [mdx()],
  markdown: {
    // Light theme to sit on the paper background of the blog prose.
    shikiConfig: { theme: 'github-light' },
    // Synced docs write figures as an SVG image plus a caption line; inline them.
    rehypePlugins: [rehypeFigures],
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['homelab']
    }
  }
});
