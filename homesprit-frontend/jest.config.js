// Jest configuration — taken from sp-company-ltd-ui, the upstream reference
// hgs-frontend follows. hgs-frontend itself has no test runner, so this is the
// one piece of Homesprit's frontend tooling that comes from one level further
// up the lineage.
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/app/**/page.tsx'],
};

module.exports = createJestConfig(customJestConfig);
