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
import options from '../__fixtures__/generated/options.patched'

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

const captureGeneratedOutput = () => {
// Helper function to capture and normalize generated files for snapshots
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

describe('Generator Cartesian Product Snapshot Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(process.env)
      .filter(key => key.startsWith('GENERATOR_'))
      .forEach(key => delete process.env[key])
    mockFileExists.mockImplementation(() => Promise.resolve(false))
    mockReadExistingFile.mockImplementation(() => Promise.resolve(''))
    mockWriteFileSafely.mockImplementation(() => Promise.resolve(undefined))
  })

  describe('Core Generator Output Snapshots', () => {
    // Define key combinations we want to snapshot
    const snapshotParameters = {
      scenarios: {
        values: [
          { model: 'Employee', queries: ['findMany'], mutations: [], description: 'findMany-only' },
          { model: 'Employee', queries: ['findUnique'], mutations: [], description: 'findUnique-only' },
          { model: 'Employee', queries: [], mutations: ['create'], description: 'create-only' },
          { model: 'Employee', queries: ['findMany', 'findUnique'], mutations: ['create', 'update'], description: 'mixed-operations' },
          { model: 'Category', queries: ['findMany'], mutations: [], description: 'different-model' },
        ],
        multi: false
      }
    }

    const combinations = generateParameterCombinations(snapshotParameters)

    describe.each(combinations)(
      'Generator output scenarios',
      (scenarios) => {
        const scenario = scenarios[0]

        it(`should generate correct output for ${scenario.model} with ${scenario.description}`, async () => {
          // Set environment variables based on scenario
          process.env.GENERATOR_MODEL = scenario.model
          process.env.GENERATOR_MODULE_PATH = './src/modules'
          
          if (scenario.queries.length > 0) {
            process.env.GENERATOR_QUERIES = scenario.queries.join(',')
          }
          if (scenario.mutations.length > 0) {
            process.env.GENERATOR_MUTATIONS = scenario.mutations.join(',')
          }

          // Run the generator
          await onGenerate(options)

          // Capture and snapshot the output
          const generatedOutput = captureGeneratedOutput()
          
          const snapshot = {
            scenario: {
              model: scenario.model,
              queries: scenario.queries,
              mutations: scenario.mutations,
              description: scenario.description
            },
            files: generatedOutput
          }

          // Create snapshot with descriptive name
          expect(snapshot).toMatchSnapshot(`generator-output-${scenario.model}-${scenario.description}`)
        })
      }
    )
  })

  describe('File Merging Scenarios', () => {
    const mergingParameters = {
      scenarios: {
        values: [
          { 
            model: 'Employee', 
            queries: ['findMany'], 
            mutations: [], 
            existingType: 'sdl',
            description: 'merge-with-existing-sdl' 
          },
          { 
            model: 'Employee', 
            queries: [], 
            mutations: ['create'], 
            existingType: 'none',
            description: 'fresh-mutation-only' 
          }
        ],
        multi: false
      }
    }

    const mergingCombinations = generateParameterCombinations(mergingParameters)

    describe.each(mergingCombinations)(
      'File merging scenarios',
      (scenarios) => {
        const scenario = scenarios[0]

        it(`should handle ${scenario.description} for ${scenario.model}`, async () => {
          // Setup file existence mocking
          if (scenario.existingType === 'sdl') {
            mockFileExists.mockImplementation((filePath: string) => 
              Promise.resolve(filePath.includes('.sdl'))
            )
            mockReadExistingFile.mockImplementation((filePath: string) => {
              if (filePath.includes('.sdl')) {
                return Promise.resolve(`
type ${scenario.model} {
  id: ID!
  # Existing field
  existingField: String
}

type Query {
  existingQuery: String
}`)
              }
              return Promise.resolve('')
            })
          }

          // Set environment variables
          process.env.GENERATOR_MODEL = scenario.model
          process.env.GENERATOR_MODULE_PATH = './src/modules'
          
          if (scenario.queries.length > 0) {
            process.env.GENERATOR_QUERIES = scenario.queries.join(',')
          }
          if (scenario.mutations.length > 0) {
            process.env.GENERATOR_MUTATIONS = scenario.mutations.join(',')
          }

          // Run the generator
          await onGenerate(options)

          // Capture and snapshot the output
          const generatedOutput = captureGeneratedOutput()
          
          const snapshot = {
            scenario: {
              model: scenario.model,
              queries: scenario.queries,
              mutations: scenario.mutations,
              existingType: scenario.existingType,
              description: scenario.description
            },
            files: generatedOutput
          }

          expect(snapshot).toMatchSnapshot(`file-merging-${scenario.model}-${scenario.description}`)
        })
      }
    )
  })

  describe('Multiple Query/Mutation Combinations', () => {
    const multiOpParameters = {
      combinations: {
        values: [
          { 
            model: 'Product', 
            queries: ['findMany', 'findUnique'], 
            mutations: ['create', 'update'],
            description: 'common-operations'
          },
          { 
            model: 'Category', 
            queries: ['findUnique'], 
            mutations: ['update'],
            description: 'minimal-operations'
          }
        ],
        multi: false
      }
    }

    const multiOpCombinations = generateParameterCombinations(multiOpParameters)

    describe.each(multiOpCombinations)(
      'Multiple operation scenarios',
      (combinations) => {
        const combo = combinations[0]

        it(`should generate ${combo.description} for ${combo.model}`, async () => {
          process.env.GENERATOR_MODEL = combo.model
          process.env.GENERATOR_MODULE_PATH = './src/modules'
          process.env.GENERATOR_QUERIES = combo.queries.join(',')
          process.env.GENERATOR_MUTATIONS = combo.mutations.join(',')

          await onGenerate(options)

          const generatedOutput = captureGeneratedOutput()
          
          const snapshot = {
            scenario: {
              model: combo.model,
              queries: combo.queries,
              mutations: combo.mutations,
              description: combo.description
            },
            files: generatedOutput
          }

          expect(snapshot).toMatchSnapshot(`multi-ops-${combo.model}-${combo.description}`)
        })
      }
    )
  })
})
