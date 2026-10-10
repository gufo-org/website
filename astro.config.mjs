import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://gufo.blog',
  integrations: [mdx()],
  markdown: {
    // Light theme to sit on the paper background of the blog prose.
    shikiConfig: { theme: 'github-light' },
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['homelab', true]
    }
  }
});
