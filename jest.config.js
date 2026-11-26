module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/util/formato.js'],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};
