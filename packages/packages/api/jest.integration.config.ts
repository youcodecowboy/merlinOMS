import type { Config } from '@jest/types';
import baseConfig from './jest.config';

const config: Config.InitialOptions = {
  ...baseConfig,
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/integration/setup.ts'
  ],
  testTimeout: 30000, // Integration tests might need more time
  maxConcurrency: 1 // Run tests serially since they share a database
};

export default config; 