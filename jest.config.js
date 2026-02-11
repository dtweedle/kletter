/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/topo-render/src', '<rootDir>/topo-editor/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: [
    'topo-render/src/**/*.ts',
    'topo-editor/src/**/*.ts',
    '!topo-render/src/**/__tests__/**',
    '!topo-render/src/**/index.ts',
    '!topo-editor/src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
