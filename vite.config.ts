import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { SITE_BASE } from './site.config';

export default defineConfig({
  base: SITE_BASE,
  plugins: [react()],
});
