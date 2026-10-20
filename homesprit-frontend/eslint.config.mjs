import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// Ported from hgs-frontend. Next 16 removed `next lint`; ESLint 9 flat config
// is the entry point.
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ['coverage/**', 'jest.config.js'],
  },
  {
    rules: {
      /* Redux Toolkit reducers that only flip loading flags still DECLARE the
         action parameter — that is what types the generated action creator —
         so `_action` is the pattern in `src/state/features/*`, not dead code. */
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      /* The guardrail hgs-frontend ported from sp-company-ltd-ui: the client API
         base URL comes from `@/config/apiConfig` only. A raw read re-introduces
         the trailing-slash `//` bug, and is the one edit that would silently
         publish the backend's address to the browser. */
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name=/^NEXT_PUBLIC_.*(API|BACKEND).*URL$/]",
          message:
            'Import API_BASE_URL from @/config/apiConfig instead of reading process.env directly.',
        },
      ],
    },
  },
  {
    files: ['src/config/apiConfig.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];

export default config;
