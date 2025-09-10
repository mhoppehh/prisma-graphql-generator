import {
  loadConfiguration,
  getConfigPath,
  validateConfiguration,
  debugConfiguration
} from '../../config/config.utils'
import { GeneratorConfig, defaultConfig } from '../../config/generator.config'
import * as fs from 'fs/promises'
import * as path from 'path'

// Mock fs module
jest.mock('fs/promises')
const mockFs = fs as jest.Mocked<typeof fs>

describe('config.utils', () => {
  let originalEnv: NodeJS.ProcessEnv
  let consoleSpy: jest.SpyInstance
  
  beforeEach(() => {
    originalEnv = { ...process.env }
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    jest.clearAllMocks()
    
    // Clear generator-related env vars
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('GENERATOR_')) {
        delete process.env[key]
      }
    })
  })

  afterEach(() => {
    process.env = originalEnv
    consoleSpy.mockRestore()
  })

  describe('loadConfiguration', () => {
    it('should load default configuration when no config file is provided', async () => {
      const config = await loadConfiguration()
      
      expect(config.getConfig().generator.prettyName).toBe(defaultConfig.generator.prettyName)
    })

    it('should merge environment variables with defaults', async () => {
      process.env.GENERATOR_DEFAULT_OUTPUT = './env-test-output'
      
      const config = await loadConfiguration()
      
      expect(config.getConfig().generator.defaultOutput).toBe('./env-test-output')
      expect(config.getConfig().files.extensions.graphql).toBe(defaultConfig.files.extensions.graphql)
    })

    it('should load configuration from file when provided', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const mockConfig = {
        generator: {
          prettyName: 'Prisma GraphQL Generator',
          defaultOutput: './file-output'
        }
      }
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig))
      
      const config = await loadConfiguration('./test-config.json')
      
      expect(mockFs.readFile).toHaveBeenCalledWith(path.resolve('./test-config.json'), 'utf-8')
      expect(warnSpy).not.toHaveBeenCalled() // Should not warn on successful load
      expect(config.getConfig().generator.prettyName).toBe('Prisma GraphQL Generator')
      
      warnSpy.mockRestore()
    })

    it('should prioritize environment variables over file configuration', async () => {
      process.env.GENERATOR_DEFAULT_OUTPUT = './env-override-output'
      
      const mockConfig = {
        generator: {
          prettyName: 'Prisma GraphQL Generator',
          defaultOutput: './file-output'
        }
      }
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig))
      
      const config = await loadConfiguration('./test-config.json')
      
      expect(config.getConfig().generator.defaultOutput).toBe('./env-override-output') // From env
      expect(config.getConfig().generator.prettyName).toBe('Prisma GraphQL Generator') // From file
    })

    it('should handle file read errors gracefully', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      
      const config = await loadConfiguration('./non-existent.json')
      
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load config'),
        expect.any(Error)
      )
      expect(config.getConfig().generator.prettyName).toBe(defaultConfig.generator.prettyName)
      
      warnSpy.mockRestore()
    })
  })

  describe('getConfigPath', () => {
    it('should return explicit config path from environment', () => {
      process.env.GENERATOR_CONFIG_PATH = '/custom/config.json'
      
      const configPath = getConfigPath()
      
      expect(configPath).toBe(path.resolve('/custom/config.json'))
    })

    it('should find common config files in project root', () => {
      const originalResolve = require.resolve
      const mockResolve = jest.fn()
      Object.assign(mockResolve, { paths: jest.fn() })
      
      // Mock first file to be found
      mockResolve
        .mockImplementationOnce(() => path.resolve(process.cwd(), 'generator.config.ts'))
        .mockImplementation(() => { throw new Error('Not found') })
      
      require.resolve = mockResolve as any
      
      const configPath = getConfigPath()
      
      expect(configPath).toBe(path.resolve(process.cwd(), 'generator.config.ts'))
      
      require.resolve = originalResolve
    })
  })

  describe('validateConfiguration', () => {
    it('should return no errors for valid configuration', () => {
      const validConfig: Partial<GeneratorConfig> = {
        generator: {
          prettyName: 'Valid Generator',
          defaultOutput: './output'
        },
        files: {
          extensions: {
            graphql: '.graphql',
            resolver: '.resolver.ts'
          },
          templates: {
            graphqlTemplate: 'templates/schema.hbs',
            resolverTemplate: 'templates/resolver.hbs'
          },
          fallbackFiles: {
            schemaTs: 'schema.ts',
            schemaGraphql: 'schema.graphql',
            optionsJson: 'options.json'
          },
          baseGraphqlPath: 'src/schema/base.graphql'
        }
      }
      
      const errors = validateConfiguration(validConfig)
      
      expect(errors).toEqual([])
    })

    it('should return errors for invalid generator configuration', () => {
      const invalidConfig: Partial<GeneratorConfig> = {
        generator: {
          prettyName: 'Test',
          defaultOutput: '' // Empty output
        }
      }
      
      const errors = validateConfiguration(invalidConfig)
      
      expect(errors).toContain('Default output path cannot be empty')
    })

    it('should validate file extensions', () => {
      const invalidConfig: Partial<GeneratorConfig> = {
        files: {
          extensions: {
            graphql: 'graphql', // Missing dot
            resolver: 'resolver.ts' // Missing dot
          },
          templates: {
            graphqlTemplate: 'template.hbs',
            resolverTemplate: 'resolver.hbs'
          },
          fallbackFiles: {
            schemaTs: 'schema.ts',
            schemaGraphql: 'schema.graphql',
            optionsJson: 'options.json'
          },
          baseGraphqlPath: 'base.graphql'
        }
      }
      
      const errors = validateConfiguration(invalidConfig)
      
      expect(errors).toContain('GraphQL file extension must start with a dot')
      expect(errors).toContain('Resolver file extension must start with a dot')
    })

    it('should validate template paths', () => {
      const invalidConfig: Partial<GeneratorConfig> = {
        files: {
          extensions: {
            graphql: '.graphql',
            resolver: '.resolver.ts'
          },
          templates: {
            graphqlTemplate: '', // Empty template
            resolverTemplate: '   ' // Whitespace only
          },
          fallbackFiles: {
            schemaTs: 'schema.ts',
            schemaGraphql: 'schema.graphql',
            optionsJson: 'options.json'
          },
          baseGraphqlPath: 'base.graphql'
        }
      }
      
      const errors = validateConfiguration(invalidConfig)
      
      expect(errors).toContain('GraphQL template path cannot be empty')
      expect(errors).toContain('Resolver template path cannot be empty')
    })
  })

  describe('debugConfiguration', () => {
    it('should log configuration information', () => {
      debugConfiguration(defaultConfig)
      
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Generator Configuration:')
      expect(consoleSpy).toHaveBeenCalledWith(`  Pretty Name: ${defaultConfig.generator.prettyName}`)
      expect(consoleSpy).toHaveBeenCalledWith('\n📁 File Configuration:')
      expect(consoleSpy).toHaveBeenCalledWith('\n🔀 Data Source:')
      expect(consoleSpy).toHaveBeenCalledWith('\n🏷️  Type Mappings:')
    })

    it('should log type mappings', () => {
      debugConfiguration(defaultConfig)
      
      Object.entries(defaultConfig.typeMappings.prismaToGraphQL).forEach(([prisma, graphql]) => {
        expect(consoleSpy).toHaveBeenCalledWith(`  ${prisma} → ${graphql}`)
      })
    })
  })
})
