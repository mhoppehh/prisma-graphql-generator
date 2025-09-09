// Mock the generator module to avoid side effects
jest.mock('../generator', () => ({}));

describe('bin', () => {
  it('imports the generator module', () => {
    // This test ensures the module loads without errors
    expect(() => require('../bin')).not.toThrow();
  });
});
