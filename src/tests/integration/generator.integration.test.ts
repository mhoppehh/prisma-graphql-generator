// Mock ts-morph before any imports that might use it
jest.mock('ts-morph', () => ({
  Project: jest.fn().mockImplementation(() => ({
    addSourceFileAtPath: jest.fn(),
    getSourceFiles: jest.fn(() => []),
    saveSync: jest.fn(),
  })),
  SyntaxKind: {
    MethodDeclaration: 'MethodDeclaration',
    PropertySignature: 'PropertySignature',
  },
}))

import * as fs from 'fs'
import * as path from 'path'

import { onGenerate } from '../../generator'
import { fileExists } from '../../utils/fileExists'
import { readExistingFile } from '../../utils/readExistingFile'
import { writeFileSafely } from '../../utils/writeFileSafely'
import { generateParameterCombinations } from '../../utils/testCombinatorics'
import options from '../__fixtures__/generated/options.patched'

jest.mock('prettier', () => ({
  format: (content: string) => content,
  resolveConfig: () => Promise.resolve(undefined),
}))

jest.setTimeout(15000)

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}))
jest.mock('@prisma/internals', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))
jest.mock('../../utils/writeFileSafely')
jest.mock('../../utils/readExistingFile')
jest.mock('../../utils/fileExists')

const mockWriteFileSafely = writeFileSafely as jest.MockedFunction<
  typeof writeFileSafely
>
const mockReadExistingFile = readExistingFile as jest.MockedFunction<
  typeof readExistingFile
>
const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>

const getWrittenFiles = () => {
  return mockWriteFileSafely.mock.calls.map(call => ({
    path: call[0],
    content: call[1],
  }))
}
const getSDLContent = () => {
  const files = getWrittenFiles()
  return files.find(f => f.path.includes('.sdl'))?.content || ''
}
const getResolverContent = () => {
  const files = getWrittenFiles()
  return files.find(f => f.path.includes('.resolvers.'))?.content || ''
}
const logGeneratedContent = () => {
  // For debugging, not for final assertions
  // console.log('=== GENERATED SDL ===')
  // console.log(getSDLContent())
  // console.log('=== GENERATED RESOLVERS ===')
  // console.log(getResolverContent())
  // console.log('=====================')
}

describe('Generator Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(process.env)
      .filter(key => key.startsWith('GENERATOR_'))
      .forEach(key => delete process.env[key])
    mockFileExists.mockImplementation(() => Promise.resolve(false))
    mockReadExistingFile.mockImplementation(() => Promise.resolve(''))
    mockWriteFileSafely.mockImplementation(() => Promise.resolve(undefined))
  })

  // Define all possible parameter combinations
  const testParameters = {
    models: {
      values: [
        'Employee',
        'Category', 
        'Customer',
        'Order',
        'Product',
        'Supplier',
        'Region',
        'Territory',
        'EmployeeTerritory',
        'Shipper',
        'OrderDetail',
        'CustomerCustomerDemo',
        'CustomerDemographic'
      ],
      multi: false // Single choice - one model at a time
    },
    queries: {
      values: ['findUnique', 'findMany', 'findFirst', 'count'],
      multi: true // Multi-choice - can have multiple queries
    },
    mutations: {
      values: ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'],
      multi: true // Multi-choice - can have multiple mutations
    },
    modulePaths: {
      values: ['./src/modules', './generated/modules', './api/graphql'],
      multi: false // Single choice - one module path at a time
    }
  }

  // Generate all combinations using cartesian product
  const parameterCombinations = generateParameterCombinations(testParameters)

  describe.each(parameterCombinations)(
    'Parameterized Generation Tests',
    (models, queries, mutations, modulePaths) => {
      const model = models[0] // Single model from array
      const queriesStr = queries.length > 0 ? queries.join(',') : ''
      const mutationsStr = mutations.length > 0 ? mutations.join(',') : ''
      const modulePath = modulePaths[0] // Single module path from array

      // Skip combinations with no operations
      if (queries.length === 0 && mutations.length === 0) {
        return
      }

      const testName = `Model: ${model}, Queries: [${queriesStr}], Mutations: [${mutationsStr}], Path: ${modulePath}`

      it(`should generate files for ${testName}`, async () => {
        // Set up environment variables
        process.env.GENERATOR_MODEL = model
        process.env.GENERATOR_MODULE_PATH = modulePath
        
        if (queriesStr) {
          process.env.GENERATOR_QUERIES = queriesStr
        }
        if (mutationsStr) {
          process.env.GENERATOR_MUTATIONS = mutationsStr
        }

        await onGenerate(options)

        // Verify that files were written
        expect(mockWriteFileSafely).toHaveBeenCalled()
        const writeCalls = mockWriteFileSafely.mock.calls
        expect(writeCalls.length).toBeGreaterThan(0)
        
        // Verify that the model name appears in at least one file path
        expect(
          writeCalls.some(call => 
            call[0].includes(model.toLowerCase())
          )
        ).toBe(true)

        // Verify module path is used correctly
        expect(
          writeCalls.some(call => 
            call[0].includes(modulePath.replace('./', ''))
          )
        ).toBe(true)
      })
    }
  )

  // Test specific scenarios with existing files
  describe('File System Integration with Cartesian Product', () => {
    const fileSystemTestParameters = {
      models: {
        values: ['Employee', 'Category', 'Customer', 'Product'],
        multi: false
      },
      existingFileTypes: {
        values: ['sdl', 'resolvers', 'both', 'none'],
        multi: false
      },
      operations: {
        values: [
          { queries: ['findMany'], mutations: [] },
          { queries: ['findUnique'], mutations: ['create'] },
          { queries: ['findMany', 'count'], mutations: ['update', 'delete'] }
        ],
        multi: false
      }
    }

    const fileSystemCombinations = generateParameterCombinations(fileSystemTestParameters)

    describe.each(fileSystemCombinations)(
      'File merge scenarios',
      (models, existingFileTypes, operations) => {
        const model = models[0]
        const existingFileType = existingFileTypes[0] 
        const operation = operations[0]

        it(`should handle ${model} with existing ${existingFileType} files and operations ${JSON.stringify(operation)}`, async () => {
          // Setup existing file mocks based on type
          mockFileExists.mockImplementation((filePath: string) => {
            switch (existingFileType) {
              case 'sdl':
                return Promise.resolve(filePath.includes('.sdl'))
              case 'resolvers':
                return Promise.resolve(filePath.includes('.resolvers.'))
              case 'both':
                return Promise.resolve(filePath.includes('.sdl') || filePath.includes('.resolvers.'))
              case 'none':
              default:
                return Promise.resolve(false)
            }
          })

          mockReadExistingFile.mockImplementation((filePath: string) => {
            if (filePath.includes('.sdl')) {
              return Promise.resolve(`
                type ${model} {
                  id: ID!
                }
                type Query {
                  existingQuery: String
                }
              `)
            }
            if (filePath.includes('.resolvers.')) {
              return Promise.resolve(`
                export default {
                  Query: {
                    existingResolver: () => 'existing'
                  }
                }
              `)
            }
            return Promise.resolve('')
          })

          // Set environment variables
          process.env.GENERATOR_MODEL = model
          process.env.GENERATOR_MODULE_PATH = './src/modules'
          
          if (operation.queries.length > 0) {
            process.env.GENERATOR_QUERIES = operation.queries.join(',')
          }
          if (operation.mutations.length > 0) {
            process.env.GENERATOR_MUTATIONS = operation.mutations.join(',')
          }

          await onGenerate(options)

          // Verify interactions based on existing file type
          if (existingFileType !== 'none') {
            expect(mockReadExistingFile).toHaveBeenCalled()
          }
          expect(mockWriteFileSafely).toHaveBeenCalled()
        })
      }
    )
  })

  // Test edge cases and error scenarios
  describe('Edge Cases and Error Scenarios', () => {
    const errorTestParameters = {
      models: {
        values: ['Employee', 'NonExistentModel'],
        multi: false
      },
      errorTypes: {
        values: ['fileReadError', 'fileWriteError', 'noError'],
        multi: false
      },
      operations: {
        values: [
          { queries: ['findMany'], mutations: [] },
          { queries: [], mutations: ['create'] },
          { queries: ['invalidQuery'], mutations: [] }
        ],
        multi: false
      }
    }

    const errorCombinations = generateParameterCombinations(errorTestParameters)

    describe.each(errorCombinations)(
      'Error handling scenarios',
      (models, errorTypes, operations) => {
        const model = models[0]
        const errorType = errorTypes[0]
        const operation = operations[0]

        it(`should handle ${errorType} for ${model} with operations ${JSON.stringify(operation)}`, async () => {
          // Setup error conditions
          switch (errorType) {
            case 'fileReadError':
              mockFileExists.mockResolvedValue(true)
              mockReadExistingFile.mockRejectedValue(new Error('Permission denied'))
              break
            case 'fileWriteError':
              mockWriteFileSafely.mockRejectedValue(new Error('Disk full'))
              break
            case 'noError':
            default:
              // Normal operation
              break
          }

          process.env.GENERATOR_MODEL = model
          process.env.GENERATOR_MODULE_PATH = './src/modules'
          
          if (operation.queries.length > 0) {
            process.env.GENERATOR_QUERIES = operation.queries.join(',')
          }
          if (operation.mutations.length > 0) {
            process.env.GENERATOR_MUTATIONS = operation.mutations.join(',')
          }

          // Test should not throw regardless of error type
          await expect(onGenerate(options)).resolves.not.toThrow()

          // Verify appropriate methods were called
          if (errorType === 'fileWriteError') {
            expect(mockWriteFileSafely).toHaveBeenCalled()
          } else if (errorType === 'noError') {
            expect(mockWriteFileSafely).toHaveBeenCalled()
          }
        })
      }
    )
  })

  // Test combinations of custom plurals and other parameters
  describe('Custom Plurals Integration', () => {
    const pluralsTestParameters = {
      models: {
        values: ['Category', 'Territory', 'Employee'],
        multi: false
      },
      customPlurals: {
        values: [
          '',
          'category:categories',
          'territory:territories,employee:staff',
          'invalid:format:extra'
        ],
        multi: false
      },
      queries: {
        values: ['findMany', 'count'],
        multi: true
      }
    }

    const pluralsCombinations = generateParameterCombinations(pluralsTestParameters)

    describe.each(pluralsCombinations)(
      'Custom plurals scenarios',
      (models, customPlurals, queries) => {
        const model = models[0]
        const customPlural = customPlurals[0]
        const queriesStr = queries.join(',')

        if (queries.length === 0) return // Skip empty query combinations

        it(`should handle ${model} with custom plurals "${customPlural}" and queries [${queriesStr}]`, async () => {
          process.env.GENERATOR_MODEL = model
          process.env.GENERATOR_MODULE_PATH = './src/modules'
          process.env.GENERATOR_QUERIES = queriesStr
          
          if (customPlural) {
            process.env.GENERATOR_CUSTOM_PLURALS = customPlural
          }

          await onGenerate(options)

          expect(mockWriteFileSafely).toHaveBeenCalled()
          const writeCalls = mockWriteFileSafely.mock.calls
          expect(writeCalls.length).toBeGreaterThan(0)
        })
      }
    )
  })

  // Focused test suite for debugging - smaller combinations
  describe('Focused Cartesian Product Tests (for debugging)', () => {
    const focusedParameters = {
      models: {
        values: ['Employee', 'Category'],
        multi: false
      },
      queries: {
        values: ['findMany', 'findUnique'],
        multi: true
      },
      mutations: {
        values: ['create', 'update'],
        multi: true
      }
    }

    const focusedCombinations = generateParameterCombinations(focusedParameters)

    describe.each(focusedCombinations)(
      'Focused test combinations',
      (models, queries, mutations) => {
        const model = models[0]
        const queriesStr = queries.length > 0 ? queries.join(',') : ''
        const mutationsStr = mutations.length > 0 ? mutations.join(',') : ''

        // Skip combinations with no operations
        if (queries.length === 0 && mutations.length === 0) {
          return
        }

        it(`should generate for Model: ${model}, Q: [${queriesStr}], M: [${mutationsStr}]`, async () => {
          process.env.GENERATOR_MODEL = model
          process.env.GENERATOR_MODULE_PATH = './src/modules'
          
          if (queriesStr) {
            process.env.GENERATOR_QUERIES = queriesStr
          }
          if (mutationsStr) {
            process.env.GENERATOR_MUTATIONS = mutationsStr
          }

          await onGenerate(options)

          expect(mockWriteFileSafely).toHaveBeenCalled()
          
          // Log for debugging purposes
          logGeneratedContent()
        })
      }
    )
  })
})
