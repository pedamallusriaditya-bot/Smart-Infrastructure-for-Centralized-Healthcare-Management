export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  moduleNameMapper: {
    // This regex catches imports ending in .js and maps them to the .ts source
    '^@/(.*)\\.js$': '<rootDir>/src/$1.ts',
    // Catch standard relative paths
    '^(\\.\\.?/.*)\\.js$': '$1', 
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json',
    }],
  },
  // Ensure Jest doesn't try to "pre-compile" files that need ESM transformation
  transformIgnorePatterns: ['/node_modules/'],
  extensionsToTreatAsEsm: ['.ts'],
};