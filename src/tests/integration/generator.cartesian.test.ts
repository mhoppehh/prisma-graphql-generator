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

import { onGenerate } from '../../generator'
import { fileExists } from '../../utils/fileExists'
import { readExistingFile } from '../../utils/readExistingFile'
import { writeFileSafely } from '../../utils/writeFileSafely'
import { generateParameterCombinations } from '../../utils/testCombinatorics'
import path from 'path'
import options from '../__fixtures__/options.patched'

jest.mock('prettier', () => ({
  format: (content: string) => content,
  resolveConfig: () => Promise.resolve(undefined),
}))

jest.setTimeout(15000)

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('enum SortOrder { asc desc }'),
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

// Helper function to capture and normalize generated files for snapshots
const captureGeneratedOutput = () => {
  const calls = mockWriteFileSafely.mock.calls

  const filteredCalls = calls.filter(call => {
      const filePath = call[0]
      const fileName = path.basename(filePath)
      const extension = path.extname(fileName)
      
      // Exclude all JSON files (especially options.json with DMMF data)
      if (extension === '.json') {
        return false
      }
      
      // Exclude schema.ts (contains generated TypeScript types)
      if (fileName === 'schema.ts') {
        return false
      }
      
      // Only include actual generated GraphQL and resolver files
      const shouldInclude = (filePath.includes('.graphql') || 
              filePath.includes('.resolver.') || 
              filePath.includes('.resolvers.')) &&
             !filePath.includes('dmmf') &&
             !filePath.includes('config')
      
      return shouldInclude
    })
  
  return filteredCalls
    .map(call => ({
      filePath: call[0]
        .replace(process.cwd(), '<PROJECT_ROOT>')
        .replace(/\\/g, '/'), // Normalize path separators
      content: call[1]
        .replace(/\/\* Generated at .+ \*\//, '/* Generated at <TIMESTAMP> */')
        .replace(/Generated on: .+/, 'Generated on: <DATE>')
        .replace(/\r\n/g, '\n') // Normalize line endings
        .trim() // Remove leading/trailing whitespace
    }))
    .filter(file => file.content.length > 0) // Remove empty files
}

describe('Cartesian Product Generator Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(process.env)
      .filter(key => key.startsWith('GENERATOR_'))
      .forEach(key => delete process.env[key])
    mockFileExists.mockImplementation(() => Promise.resolve(false))
    mockReadExistingFile.mockImplementation(() => Promise.resolve(''))
    mockWriteFileSafely.mockImplementation(() => Promise.resolve(undefined))
  })

  describe('Small Scale Cartesian Product Tests', () => {
    // Define a focused set of parameters for testing the cartesian product approach
    const testParameters = {
      models: {
        values: ['Employee', 'Category'],
        multi: false
      },
      queries: {
        values: ['findMany', 'findUnique'],
        multi: true // Can select multiple queries
      },
      mutations: {
        values: ['create', 'update'],
        multi: true // Can select multiple mutations
      }
    }

    const combinations = generateParameterCombinations(testParameters)

    describe.each(combinations)(
      'Generated combination tests',
      (models, queries, mutations) => {
        const model = models[0]
        const queriesStr = queries.length > 0 ? queries.join(',') : ''
        const mutationsStr = mutations.length > 0 ? mutations.join(',') : ''

        // Skip test cases with no operations at all
        if (queries.length === 0 && mutations.length === 0) {
          return
        }

        it(`should generate files for Model: ${model}, Queries: [${queriesStr}], Mutations: [${mutationsStr}]`, async () => {
          // Set environment variables
          process.env.GENERATOR_MODEL = model
          process.env.GENERATOR_MODULE_PATH = './src/modules'
          
          if (queriesStr) {
            process.env.GENERATOR_QUERIES = queriesStr
          }
          if (mutationsStr) {
            process.env.GENERATOR_MUTATIONS = mutationsStr
          }

          await onGenerate(options)

          // Capture generated files for snapshot testing
          const generatedOutput = captureGeneratedOutput()
          
          // Create a snapshot-friendly object
          const snapshot = {
            scenario: {
              model,
              queries: queriesStr || 'none',
              mutations: mutationsStr || 'none',
              modulePath: './src/modules'
            },
            files: generatedOutput
          }

          // Snapshot test the generated output
          expect(snapshot).toMatchSnapshot(`cartesian-${model}-${queriesStr || 'noQueries'}-${mutationsStr || 'noMutations'}`)
        })
      }
    )
  })

  // describe('Verify Cartesian Product Generation Count', () => {
  //   it('should generate the expected number of test combinations', () => {
  //     const testParameters = {
  //       models: {
  //         values: ['A', 'B'],
  //         multi: false
  //       },
  //       queries: {
  //         values: ['q1', 'q2'],
  //         multi: true
  //       },
  //       mutations: {
  //         values: ['m1', 'm2'],
  //         multi: true
  //       }
  //     }

  //     const combinations = generateParameterCombinations(testParameters)
      
  //     // Expected combinations:
  //     // Models: 2 choices (A, B)
  //     // Queries: 4 subsets ([], [q1], [q2], [q1,q2])
  //     // Mutations: 4 subsets ([], [m1], [m2], [m1,m2])
  //     // Total: 2 * 4 * 4 = 32 combinations
  //     expect(combinations).toHaveLength(32)

  //     // Verify structure of first few combinations
  //     expect(combinations[0]).toEqual([['A'], [], []])
  //     expect(combinations[1]).toEqual([['A'], [], ['m1']])
  //     expect(combinations[2]).toEqual([['A'], [], ['m2']])
  //     expect(combinations[3]).toEqual([['A'], [], ['m1', 'm2']])
  //   })
  // })

  // describe('Focused Test Combinations (Practical Examples)', () => {
  //   const practicalParameters = {
  //     models: {
  //       values: ['Employee', 'Product'],
  //       multi: false
  //     },
  //     queryTypes: {
  //       values: [
  //         { queries: ['findMany'], mutations: [] },
  //         { queries: ['findUnique'], mutations: [] },
  //         { queries: [], mutations: ['create'] },
  //         { queries: ['findMany'], mutations: ['update'] }
  //       ],
  //       multi: false
  //     }
  //   }

  //   const practicalCombinations = generateParameterCombinations(practicalParameters)

  //   describe.each(practicalCombinations)(
  //     'Practical test scenarios',
  //     (models, queryTypes) => {
  //       const model = models[0]
  //       const queryType = queryTypes[0]

  //       it(`should generate files for ${model} with operations ${JSON.stringify(queryType)}`, async () => {
  //         process.env.GENERATOR_MODEL = model
  //         process.env.GENERATOR_MODULE_PATH = './src/modules'
          
  //         if (queryType.queries.length > 0) {
  //           process.env.GENERATOR_QUERIES = queryType.queries.join(',')
  //         }
  //         if (queryType.mutations.length > 0) {
  //           process.env.GENERATOR_MUTATIONS = queryType.mutations.join(',')
  //         }

  //         await onGenerate(options)

  //         // Capture generated files for snapshot testing
  //         const generatedOutput = captureGeneratedOutput()
          
  //         const snapshot = {
  //           scenario: {
  //             model,
  //             queries: queryType.queries.join(',') || 'none',
  //             mutations: queryType.mutations.join(',') || 'none',
  //             modulePath: './src/modules'
  //           },
  //           files: generatedOutput
  //         }

  //         const queriesLabel = queryType.queries.join('_') || 'noQueries'
  //         const mutationsLabel = queryType.mutations.join('_') || 'noMutations'
  //         expect(snapshot).toMatchSnapshot(`practical-${model}-${queriesLabel}-${mutationsLabel}`)
  //       })
  //     }
  //   )
  // })
})
