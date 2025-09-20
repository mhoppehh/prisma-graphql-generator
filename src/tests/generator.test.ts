import { onGenerate } from '../generator'
import { GeneratorOptions } from '@prisma/generator-helper'
import { writeFileSafely } from '../utils/writeFileSafely'
import { generateGraphQLFiles } from '../helpers'
import { fileExists } from '../utils/fileExists'
import { config as generatorConfig } from '../config/config'
import fs from 'fs/promises'

jest.mock('../utils/writeFileSafely')
jest.mock('../utils/fileExists')
jest.mock('../helpers')
jest.mock('../utils/formatFile', () => ({
  formatFile: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('fs/promises')

const mockWriteFileSafely = writeFileSafely as jest.MockedFunction<typeof writeFileSafely>
const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>
const mockGenerateGraphQLFiles = generateGraphQLFiles as jest.MockedFunction<
  typeof generateGraphQLFiles
>
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>

describe('Generator', () => {
  let mockOptions: GeneratorOptions

  beforeEach(() => {
    mockOptions = {
      generator: {
        name: 'test-generator',
        provider: {
          value: 'test-provider',
          fromEnvVar: null,
        },
        sourceFilePath: '/test/generator.ts',
        output: {
          value: '/test/output',
          fromEnvVar: null,
        },
        config: {},
        binaryTargets: [],
        previewFeatures: [],
      },
      dmmf: {} as any,
      datamodel: {} as any,
      datasources: [],
      otherGenerators: [],
      schemaPath: '/test/schema.prisma',
      version: '1.0.0',
    }

    jest.clearAllMocks()

    mockFileExists.mockResolvedValue(false)
    mockReadFile.mockRejectedValue(new Error('File not found'))
  })

  describe('onGenerate', () => {
    it('should generate GraphQL files when script options are provided', async () => {
      mockFileExists.mockResolvedValue(true)
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          modelName: 'User',
          modulePath: './src/modules',
          queries: ['findMany', 'findUnique'],
          mutations: ['create', 'update'],
          customPlurals: {},
        }),
      )

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).toHaveBeenCalledWith(
        mockOptions.dmmf,
        expect.objectContaining({
          modelName: 'User',
          modulePath: './src/modules',
          queries: ['findMany', 'findUnique'],
          mutations: ['create', 'update'],
        }),
      )
    })

    it('should not generate files when model name is missing', async () => {
      mockFileExists.mockResolvedValue(true)
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          modulePath: './src/modules',
          queries: ['findMany'],
          mutations: [],
        }),
      )

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).not.toHaveBeenCalled()
    })

    it('should handle custom plurals correctly', async () => {
      mockFileExists.mockResolvedValue(true)
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          modelName: 'Person',
          modulePath: './src/modules',
          queries: ['findMany'],
          mutations: [],
          customPlurals: { person: 'people', child: 'children' },
        }),
      )

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).toHaveBeenCalledWith(
        mockOptions.dmmf,
        expect.objectContaining({
          modelName: 'Person',
          modulePath: './src/modules',
          queries: ['findMany'],
          mutations: [],
          customPlurals: { person: 'people', child: 'children' },
        }),
      )
    })

    it('should handle missing script options file gracefully', async () => {
      mockFileExists.mockResolvedValue(false)

      await onGenerate(mockOptions)

      expect(mockGenerateGraphQLFiles).not.toHaveBeenCalled()
      expect(mockWriteFileSafely).toHaveBeenCalledWith(
        expect.stringContaining('options.json'),
        JSON.stringify(mockOptions, null, 2),
      )
    })

    it('should save options to JSON file', async () => {
      mockFileExists.mockResolvedValue(false)

      await onGenerate(mockOptions)

      expect(mockWriteFileSafely).toHaveBeenCalledWith(
        expect.stringContaining('options.json'),
        JSON.stringify(mockOptions, null, 2),
      )
    })
  })
})
