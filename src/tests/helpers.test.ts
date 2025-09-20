import * as helpers from '../helpers'
import { formatFile } from '../utils/formatFile'
import patchedOptions from './__fixtures__/options.patched'
import { GenerateModuleOptions } from '../types/newTypes'

jest.mock('../utils/formatFile', () => ({
  formatFile: jest.fn().mockImplementation((content: string) => content)
}))

jest.mock('../utils/fileExists', () => ({
  fileExists: jest.fn().mockResolvedValue(false)
}))

jest.mock('../utils/writeFileSafely', () => ({
  writeFileSafely: jest.fn().mockResolvedValue(undefined)
}))

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
      
      await expect(helpers.generateGraphqlModule(options, {
        modelName: options.model.name,
        modulePath: options.modulePath,
        operations: [...options.queries, ...options.mutations],
        queries: options.queries,
        mutations: options.mutations
      })).resolves.not.toThrow()
    }
  })

  test('should generate GraphQL files using configuration', async () => {
    const mockDmmf = patchedOptions.dmmf
    
    if (mockDmmf.datamodel.models.length > 0) {
      const firstModel = mockDmmf.datamodel.models[0]
      
      const config = {
        modelName: firstModel.name,
        modulePath: '/test/modules',
        queries: ['findMany', 'findUnique'],
        mutations: ['create', 'update', 'delete']
      }
      
      await expect(helpers.generateGraphQLFiles(mockDmmf, config)).resolves.not.toThrow()
    }
  })

  test('should handle missing model gracefully', async () => {
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
    
    await expect(helpers.generateGraphQLFiles(minimalDmmf as any, config)).rejects.toThrow('Model NonExistentModel not found in DMMF')
  })

  test('should validate configuration integration', () => {
    expect(helpers.generateGraphqlModule).toBeDefined()
    expect(helpers.generateGraphQLFiles).toBeDefined()
  })
})
