import { generateGraphqlModule } from '../helpers'
import { GenerateModuleOptions } from '../types/newTypes'
import { fileExists } from '../utils/fileExists'
import { config as generatorConfig } from '../config/config'
import patchedOptions from './__fixtures__/options.patched'

jest.mock('../utils/fileExists')
jest.mock('../utils/writeFileSafely')
jest.mock('../utils/formatFile', () => ({
  formatFile: jest.fn().mockResolvedValue(undefined)
}))
jest.mock('fs/promises')
jest.mock('handlebars')

const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>

describe('helpers with configuration', () => {
  let mockOptions: GenerateModuleOptions

  beforeEach(() => {
    mockOptions = {
      model: patchedOptions.dmmf.datamodel.models[0],
      queries: ['findMany', 'findUnique', 'findFirst'],
      mutations: ['create', 'update', 'delete'],
      modulePath: './src/modules',
      dmmf: patchedOptions.dmmf,
      customPlurals: undefined
    }

    jest.clearAllMocks()
  })

  describe('generateGraphqlModule', () => {
    it('should use configurable file extensions for SDL and resolver paths', async () => {
      const configData = generatorConfig.getConfig()
      mockFileExists.mockResolvedValue(false)

      const fs = require('fs/promises')
      fs.readFile = jest.fn().mockResolvedValue('template content')
      
      const handlebars = require('handlebars')
      handlebars.compile = jest.fn().mockReturnValue(() => 'compiled content')

      await generateGraphqlModule(mockOptions, {
        modelName: mockOptions.model.name,
        modulePath: mockOptions.modulePath,
        operations: [...mockOptions.queries, ...mockOptions.mutations],
        queries: mockOptions.queries,
        mutations: mockOptions.mutations
      })

      const expectedSdlPath = `src/modules/Employee${configData.files.extensions.graphql}`
      const expectedResolverPath = `src/modules/Employee${configData.files.extensions.resolver}`

      expect(mockFileExists).toHaveBeenCalledWith(expectedSdlPath)
      expect(mockFileExists).toHaveBeenCalledWith(expectedResolverPath)
    })

    it('should use configurable template paths when creating new files', async () => {
      const configData = generatorConfig.getConfig()
      mockFileExists.mockResolvedValue(false)

      const fs = require('fs/promises')
      fs.readFile = jest.fn().mockResolvedValue('template content')
      
      const handlebars = require('handlebars')
      handlebars.compile = jest.fn().mockReturnValue(() => 'compiled content')

      await generateGraphqlModule(mockOptions, {
        modelName: mockOptions.model.name,
        modulePath: mockOptions.modulePath,
        operations: [...mockOptions.queries, ...mockOptions.mutations],
        queries: mockOptions.queries,
        mutations: mockOptions.mutations
      })

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining(configData.files.templates.graphqlTemplate),
        'utf-8'
      )
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining(configData.files.templates.resolverTemplate),
        'utf-8'
      )
    })

    it('should handle custom file extensions', async () => {
      const originalConfig = generatorConfig.getConfig()
      
      generatorConfig.updateConfig({
        files: {
          ...originalConfig.files,
          extensions: {
            graphql: '.gql',
            resolver: '.resolvers.ts',
          }
        }
      })

      mockFileExists.mockResolvedValue(false)

      const fs = require('fs/promises')
      fs.readFile = jest.fn().mockResolvedValue('template content')
      
      const handlebars = require('handlebars')
      handlebars.compile = jest.fn().mockReturnValue(() => 'compiled content')

      await generateGraphqlModule(mockOptions, {
        modelName: mockOptions.model.name,
        modulePath: mockOptions.modulePath,
        operations: [...mockOptions.queries, ...mockOptions.mutations],
        queries: mockOptions.queries,
        mutations: mockOptions.mutations
      })

      const configData = generatorConfig.getConfig()

      const expectedSdlPath = `src/modules/Employee${configData.files.extensions.graphql}`
      const expectedResolverPath = `src/modules/Employee${configData.files.extensions.resolver}`

      expect(mockFileExists).toHaveBeenCalledWith(expectedSdlPath)
      expect(mockFileExists).toHaveBeenCalledWith(expectedResolverPath)
      
      expect(expectedSdlPath).toContain('.gql')
      expect(expectedResolverPath).toContain('.resolvers.ts')
    })
  })

  describe('configuration integration', () => {
    it('should allow updating type mappings', () => {
      const originalConfig = generatorConfig.getConfig()
      
      generatorConfig.updateConfig({
        typeMappings: {
          prismaToGraphQL: {
            ...originalConfig.typeMappings.prismaToGraphQL,
            Int: 'Integer',
            String: 'Text',
            DateTime: 'Date'
          }
        }
      })

      const configData = generatorConfig.getConfig()

      expect(configData.typeMappings.prismaToGraphQL.Int).toBe('Integer')
      expect(configData.typeMappings.prismaToGraphQL.String).toBe('Text')
      expect(configData.typeMappings.prismaToGraphQL.DateTime).toBe('Date')
    })

    it('should allow updating resolver implementation settings', () => {
      const originalConfig = generatorConfig.getConfig()
      
      generatorConfig.updateConfig({
        content: {
          ...originalConfig.content,
          resolverImplementation: {
            dataSourceMethod: 'context.myDb',
            errorMessageTemplate: 'Custom error: {operationName}'
          }
        }
      })

      const configData = generatorConfig.getConfig()

      expect(configData.content.resolverImplementation.dataSourceMethod).toBe('context.myDb')
      expect(configData.content.resolverImplementation.errorMessageTemplate).toBe('Custom error: {operationName}')
    })

    it('should allow updating base GraphQL path', () => {
      const originalConfig = generatorConfig.getConfig()
      
      generatorConfig.updateConfig({
        files: {
          ...originalConfig.files,
          baseGraphqlPath: 'custom/schema/base.graphql'
        }
      })

      const configData = generatorConfig.getConfig()

      expect(configData.files.baseGraphqlPath).toBe('custom/schema/base.graphql')
    })
  })
})
