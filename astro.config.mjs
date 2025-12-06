import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://creativestuff.vercel.app',
  trailingSlash: 'never', // SEO: Consistent URL structure without trailing slashes
  build: {
    format: 'file' // Generate clean URLs (product/slug not product/slug/index.html)
  },
  security: {
    checkOrigin: false
  }
});
