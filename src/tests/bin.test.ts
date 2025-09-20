jest.mock('../generator', () => ({}));

describe('bin', () => {
  it('imports the generator module', () => {
    expect(() => require('../bin')).not.toThrow();
  });
});
