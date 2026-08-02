export default [
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { window: true, document: true, navigator: true, console: true, localStorage: true, requestAnimationFrame: true, cancelAnimationFrame: true, setTimeout: true, clearTimeout: true, setInterval: true, clearInterval: true, performance: true, fetch: true, URL: true, Blob: true, Worker: true, self: true, caches: true },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },
];
