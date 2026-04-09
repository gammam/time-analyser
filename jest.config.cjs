module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/?(*.)+(test).[tj]s'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
