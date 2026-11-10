// ESLint (flat config). src/main.js is not linted on its own: it is only
// meaningful once build.mjs has inlined core.js and the stylesheet around it,
// so the *built* userscript is linted instead — that way an undefined name or
// a dead function anywhere in the shipped file fails the check.
import js from '@eslint/js';
import globals from 'globals';

const rules = {
  ...js.configs.recommended.rules,
  'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
  'no-empty': ['error', { allowEmptyCatch: true }],
  eqeqeq: 'error',
  'no-var': 'error',
  'prefer-const': 'error',
  'no-implied-eval': 'error',
  'no-eval': 'error',
};

export default [
  { ignores: ['node_modules/', 'src/main.js'] },
  {
    files: ['pomodoro.user.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        GM_getValue: 'readonly', GM_setValue: 'readonly', GM_notification: 'readonly',
        GM_registerMenuCommand: 'readonly', GM_addValueChangeListener: 'readonly',
      },
    },
    rules,
  },
  {
    files: ['src/core.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { module: 'writable' } },
    rules,
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules,
  },
];
