import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'dev-dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // El dominio es TypeScript puro: sin React, sin APIs del navegador, sin otras capas.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/domain no puede depender de React.' },
            { name: 'react-dom', message: 'src/domain no puede depender de React.' },
            { name: 'idb', message: 'src/domain no puede acceder al almacenamiento.' },
          ],
          patterns: [
            {
              group: ['**/storage', '**/storage/**', '**/sync', '**/sync/**', '**/ui', '**/ui/**'],
              message: 'src/domain no puede importar las capas storage, sync ni ui.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'localStorage',
          'sessionStorage',
          'indexedDB',
          'BroadcastChannel',
          'navigator',
        ].map((name) => ({ name, message: 'src/domain no puede usar APIs del navegador.' })),
      ],
    },
  },
  prettier,
);
