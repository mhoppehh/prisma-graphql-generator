import { onGenerate } from '../generator'
import { GeneratorOptions } from '@prisma/generator-helper'
import { writeFileSafely } from '../utils/writeFileSafely'
import { generateGraphQLFiles } from '../helpers'
import { config as generatorConfig } from '../config/generator.config'

// Mock dependencies
jest.mock('../utils/writeFileSafely')
jest.mock('../helpers')
jest.mock('../utils/formatFile', () => ({
  formatFile: jest.fn().mockResolvedValue(undefined)
}))

const mockWriteFileSafely = writeFileSafely as jest.MockedFunction<typeof writeFileSafely>
const mockGenerateGraphQLFiles = generateGraphQLFiles as jest.MockedFunction<typeof generateGraphQLFiles>

describe('Generator', () => {
  let originalEnv: NodeJS.ProcessEnv
  let mockOptions: GeneratorOptions

  beforeEach(() => {
    originalEnv = { ...process.env }
    
    // Clear generator-related env vars
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('GENERATOR_')) {
        delete process.env[key]
      }
    })

    mockOptions = {
      generator: {
        name: 'test-generator',
        provider: {
          value: 'test-provider',
          fromEnvVar: null
        },
        sourceFilePath: '/test/generator.ts',
        output: {
          value: '/test/output',
          fromEnvVar: null
        },
        config: {},
        binaryTargets: [],
        previewFeatures: []
      },
      dmmf: {} as any, // Simplified mock for tests
      datamodel: {} as any,
      datasources: [],
      otherGenerators: [],
      schemaPath: '/test/schema.prisma',
      version: '1.0.0'
    }

    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('onGenerate', () => {
    // it('should generate fallback files when model and module path are missing', async () => {
    //   await onGenerate(mockOptions)

    //   const configData = generatorConfig.getConfig()
      
    //   expect(mockWriteFileSafely).toHaveBeenCalledTimes(2)
    //   expect(mockWriteFileSafely).toHaveBeenCalledWith(
    //     '/test/output/' + configData.files.fallbackFiles.schemaTs,
    //     configData.content.fallbackMessages.basic
    //   )
    //   expect(mockWriteFileSafely).toHaveBeenCalledWith(
    //     '/test/output/' + configData.files.fallbackFiles.schemaGraphql,
    //     configData.content.fallbackMessages.basic
    //   )
    //   expect(mockWriteFileSafely).toHaveBeenCalledWith(
    //     '/test/output/' + configData.files.fallbackFiles.optionsJson,
    //     JSON.stringify(mockOptions, null, 2)
    //   )
    // })

    it('should generate GraphQL files when model and module path are provided with operations', async () => {
      const configData = generatorConfig.getConfig()
      
      process.env[configData.envVars.model] = 'User'
      process.env[configData.envVars.modulePath] = './src/modules'
      process.env[configData.envVars.queries] = 'findMany,findUnique'
      process.env[configData.envVars.mutations] = 'create,update'

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).toHaveBeenCalledWith(
        mockOptions.dmmf,
        expect.objectContaining({
          modelName: 'User',
          modulePath: './src/modules',
          queries: ['findMany', 'findUnique'],
          mutations: ['create', 'update']
        })
      )
    })

    it('should generate fallback files when no operations are specified', async () => {
      const configData = generatorConfig.getConfig()
      
      process.env[configData.envVars.model] = 'User'
      process.env[configData.envVars.modulePath] = './src/modules'
      // No queries or mutations

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).not.toHaveBeenCalled()
      expect(mockWriteFileSafely).toHaveBeenCalledWith(
        '/test/output/' + configData.files.fallbackFiles.schemaTs,
        configData.content.fallbackMessages.withOperations
      )
    })

    it('should parse custom plurals from environment variable', async () => {
      const configData = generatorConfig.getConfig()
      
      process.env[configData.envVars.model] = 'Person'
      process.env[configData.envVars.modulePath] = './src/modules'
      process.env[configData.envVars.queries] = 'findMany'
      process.env[configData.envVars.customPlurals] = 'person:people,child:children'

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).toHaveBeenCalledWith(
        mockOptions.dmmf,
        expect.objectContaining({
          customPlurals: {
            person: 'people',
            child: 'children'
          }
        })
      )
    })

    it('should handle malformed custom plurals gracefully', async () => {
      const configData = generatorConfig.getConfig()
      
      process.env[configData.envVars.model] = 'User'
      process.env[configData.envVars.modulePath] = './src/modules'
      process.env[configData.envVars.queries] = 'findMany'
      process.env[configData.envVars.customPlurals] = 'invalid,person:people,malformed:,:'

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).toHaveBeenCalledWith(
        mockOptions.dmmf,
        expect.objectContaining({
          customPlurals: {
            person: 'people'
          }
        })
      )
    })

    it('should trim environment variable values', async () => {
      const configData = generatorConfig.getConfig()
      
      process.env[configData.envVars.model] = '  User  '
      process.env[configData.envVars.modulePath] = '  ./src/modules  '
      process.env[configData.envVars.queries] = '  findMany , findUnique  '

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).toHaveBeenCalledWith(
        mockOptions.dmmf,
        expect.objectContaining({
          modelName: 'User',
          modulePath: './src/modules',
          queries: ['findMany', 'findUnique']
        })
      )
    })

    it('should filter empty values from operations', async () => {
      const configData = generatorConfig.getConfig()
      
      process.env[configData.envVars.model] = 'User'
      process.env[configData.envVars.modulePath] = './src/modules'
      process.env[configData.envVars.queries] = 'findMany,,findUnique,'
      process.env[configData.envVars.mutations] = ',create,,'

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).toHaveBeenCalledWith(
        mockOptions.dmmf,
        expect.objectContaining({
          queries: ['findMany', 'findUnique'],
          mutations: ['create']
        })
      )
    })

    it('should include preset and timestamp information when provided', async () => {
      const configData = generatorConfig.getConfig()
      
      process.env[configData.envVars.model] = 'User'
      process.env[configData.envVars.modulePath] = './src/modules'
      process.env[configData.envVars.queries] = 'findMany'
      process.env[configData.envVars.presetUsed] = 'crud-preset'
      process.env[configData.envVars.timestamp] = '2025-01-01T00:00:00Z'

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).toHaveBeenCalledWith(
        mockOptions.dmmf,
        expect.objectContaining({
          presetUsed: 'crud-preset',
          timestamp: '2025-01-01T00:00:00Z'
        })
      )
    })
  })
})
