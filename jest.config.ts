import dotenv from 'dotenv';
import type { Config } from 'jest';

dotenv.config({ path: '.env.development' });

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^#src/(.*)\\.js$': '<rootDir>/src/$1',
    '^#(config|controllers|middleware|models|routes|services|utils|validations)/(.*)\\.js$':
      '<rootDir>/src/$1/$2',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
};

export default config;
