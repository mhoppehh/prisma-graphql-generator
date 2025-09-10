// Mock for formatFile to avoid prettier ES module issues
export const formatFile = jest.fn().mockResolvedValue(undefined);
