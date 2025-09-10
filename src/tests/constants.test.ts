import { GENERATOR_NAME } from '../constants'

describe('GENERATOR_NAME', () => {
  it('should be defined', () => {
    expect(GENERATOR_NAME).toBe('prisma-generator-graphql-test');
  });
});
