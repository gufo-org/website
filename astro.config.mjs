import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://gufo.blog',
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['homelab', true]
    }
  }
});
