import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'src/{domain,net,platform,storage,sync,ui}/**/*.test.ts',
            'electron/**/*.test.ts',
            'tests/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/ui/**/*.test.tsx'],
          setupFiles: ['./tests/setup-dom.ts'],
        },
      },
    ],
  },
});
