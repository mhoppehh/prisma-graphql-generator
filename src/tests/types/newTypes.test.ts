import { mapOperationToPrismaFunc } from '../../types/newTypes';

describe('newTypes', () => {
  describe('mapOperationToPrismaFunc', () => {
    it('maps standard query operations correctly', () => {
      expect(mapOperationToPrismaFunc('findUnique')).toBe('findUnique');
      expect(mapOperationToPrismaFunc('findMany')).toBe('findMany');
      expect(mapOperationToPrismaFunc('count')).toBe('count');
      expect(mapOperationToPrismaFunc('aggregate')).toBe('aggregate');
      expect(mapOperationToPrismaFunc('groupBy')).toBe('groupBy');
    });

    it('maps mutation operations correctly', () => {
      expect(mapOperationToPrismaFunc('create')).toBe('createOne');
      expect(mapOperationToPrismaFunc('createMany')).toBe('createMany');
      expect(mapOperationToPrismaFunc('update')).toBe('updateOne');
      expect(mapOperationToPrismaFunc('updateMany')).toBe('updateMany');
      expect(mapOperationToPrismaFunc('upsert')).toBe('upsertOne');
      expect(mapOperationToPrismaFunc('delete')).toBe('deleteOne');
      expect(mapOperationToPrismaFunc('deleteMany')).toBe('deleteMany');
    });

    it('returns empty string for unknown operations', () => {
      expect(mapOperationToPrismaFunc('unknown')).toBe('');
      expect(mapOperationToPrismaFunc('')).toBe('');
      expect(mapOperationToPrismaFunc('invalidOperation')).toBe('');
    });
  });
});
