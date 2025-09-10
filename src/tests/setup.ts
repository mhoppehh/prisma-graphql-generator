/**
 * Jest setup file to mute console logs during tests
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

// Mock console methods to suppress output during tests
beforeAll(() => {
  console.log = jest.fn();
  console.debug = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

// Restore original console methods after tests
afterAll(() => {
  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Optional: If you want to see console output for specific tests,
// you can temporarily restore console methods within individual test blocks:
//
// test('some test', () => {
//   console.log = originalConsole.log; // Restore for this test only
//   // Your test code here
//   console.log = jest.fn(); // Mock again
// });
