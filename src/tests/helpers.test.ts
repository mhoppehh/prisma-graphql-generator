import * as helpers from '../helpers'
import { formatFile } from '../utils/formatFile'
import patchedOptions from './__fixtures__/generated/options.patched'
import { GenerateModuleOptions } from '../types/newTypes'

// Mock formatFile to avoid Prettier dependency in tests
jest.mock('../utils/formatFile', () => ({
  formatFile: jest.fn().mockImplementation((content: string) => content)
}))

// Mock fileExists to avoid file system dependencies
jest.mock('../utils/fileExists', () => ({
  fileExists: jest.fn().mockResolvedValue(false)
}))

// Mock writeFileSafely to avoid file system dependencies
jest.mock('../utils/writeFileSafely', () => ({
  writeFileSafely: jest.fn().mockResolvedValue(undefined)
}))

// Mock fs/promises to avoid file system dependencies
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined)
}))

describe('Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should generate GraphQL module using configuration', async () => {
    // Use the existing DMMF fixture from the test files
    const mockDmmf = patchedOptions.dmmf
    
    if (mockDmmf.datamodel.models.length > 0) {
      const firstModel = mockDmmf.datamodel.models[0]
      
      const options: GenerateModuleOptions = {
        model: firstModel,
        modulePath: '/test/modules',
        dmmf: mockDmmf,
        queries: ['findMany', 'findUnique'],
        mutations: ['create', 'update', 'delete']
      }
      
      // This should not throw an error
      await expect(helpers.generateGraphqlModule(options)).resolves.not.toThrow()
    }
  })

  test('should generate GraphQL files using configuration', async () => {
    // Use real DMMF data from fixtures
    const mockDmmf = patchedOptions.dmmf
    
    if (mockDmmf.datamodel.models.length > 0) {
      const firstModel = mockDmmf.datamodel.models[0]
      
      const config = {
        modelName: firstModel.name,
        modulePath: '/test/modules',
        queries: ['findMany', 'findUnique'],
        mutations: ['create', 'update', 'delete']
      }
      
      // This should not throw an error
      await expect(helpers.generateGraphQLFiles(mockDmmf, config)).resolves.not.toThrow()
    }
  })

  test('should handle missing model gracefully', async () => {
    // Test with minimal DMMF structure
    const minimalDmmf = {
      datamodel: { models: [] },
      schema: { outputObjectTypes: { prisma: [] } }
    }
    
    const config = {
      modelName: 'NonExistentModel',
      modulePath: '/test/modules',
      queries: ['findMany'],
      mutations: ['create']
    }
    
    // This should throw an error for missing model
    await expect(helpers.generateGraphQLFiles(minimalDmmf as any, config)).rejects.toThrow('Model NonExistentModel not found in DMMF')
  })

  test('should validate configuration integration', () => {
    // Test that configuration is properly integrated
    // This is mainly a smoke test to ensure no runtime errors
    expect(helpers.generateGraphqlModule).toBeDefined()
    expect(helpers.generateGraphQLFiles).toBeDefined()
  })
})
