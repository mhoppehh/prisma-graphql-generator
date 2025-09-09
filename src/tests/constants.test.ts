import { GENERATOR_NAME } from '../constants';

describe('constants', () => {
  it('exports the correct generator name', () => {
    expect(GENERATOR_NAME).toBe('prisma-generator-graphql-test');
  });
});
