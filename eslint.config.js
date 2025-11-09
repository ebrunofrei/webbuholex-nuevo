// eslint.config.js
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  
  // Ignora todo lo que NO queremos lintear ahora
  {
    ignores: [
      'backend/**',
      'scripts/**',
      'tests/**',
      'public/**',
      'dist/**',
      'server.js',
      'verificarKey.js',
      'vite.config.js',
      'src/vite.config.sample.js',
    ],
  },

  js.configs.recommended,

  // Reglas para el lector + noticias
  {
    files: [
      'src/features/noticias/**/*.{js,jsx,ts,tsx}',
      'src/components/ui/ReaderModal.jsx',
      'src/services/noticiasClientService.js',
      'src/services/noticiasContenido.js',
      'src/services/vozService.js',
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }, // ← habilita JSX para evitar "Parsing error"
      },
      globals: {
        ...globals.browser, // fetch, URL, AbortController, Audio, console, etc.
        __BUILD_VERSION__: 'readonly',
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }], // menos ruido en catch { }
      'react/react-in-jsx-scope': 'off',
      'react/no-danger': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
