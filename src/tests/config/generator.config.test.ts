import { ConfigLoader, defaultConfig, GeneratorConfig } from '../../config/generator.config'

describe('ConfigLoader', () => {
  let originalEnv: NodeJS.ProcessEnv
  
  beforeEach(() => {
    originalEnv = { ...process.env }
    // Clear generator-related env vars
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('GENERATOR_')) {
        delete process.env[key]
      }
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('constructor', () => {
    it('should use default config when no user config is provided', () => {
      const loader = new ConfigLoader()
      const config = loader.getConfig()
      
      expect(config.generator.prettyName).toBe(defaultConfig.generator.prettyName)
      expect(config.files.extensions.graphql).toBe(defaultConfig.files.extensions.graphql)
    })

    it('should merge user config with defaults', () => {
      const userConfig: Partial<GeneratorConfig> = {
        generator: {
          prettyName: 'Custom Generator',
          defaultOutput: './custom-output'
        }
      }
      
      const loader = new ConfigLoader(userConfig)
      const config = loader.getConfig()
      
      expect(config.generator.prettyName).toBe('Custom Generator')
      expect(config.files.extensions.graphql).toBe(defaultConfig.files.extensions.graphql) // Should keep default
    })

    it('should deeply merge nested configurations', () => {
      const userConfig: Partial<GeneratorConfig> = {
        files: {
          extensions: {
            graphql: '.gql',
            resolver: '.resolvers.ts'
          },
          templates: defaultConfig.files.templates,
          fallbackFiles: defaultConfig.files.fallbackFiles,
          baseGraphqlPath: 'custom/path/base.graphql'
        }
      }
      
      const loader = new ConfigLoader(userConfig)
      const config = loader.getConfig()
      
      expect(config.files.extensions.graphql).toBe('.gql')
      expect(config.files.extensions.resolver).toBe('.resolvers.ts')
      expect(config.files.baseGraphqlPath).toBe('custom/path/base.graphql')
      expect(config.files.templates.graphqlTemplate).toBe(defaultConfig.files.templates.graphqlTemplate)
    })
  })

  describe('updateConfig', () => {
    it('should update configuration with new values', () => {
      const loader = new ConfigLoader()
      
      loader.updateConfig({
        generator: {
          prettyName: 'Updated Generator',
          defaultOutput: './updated-output'
        }
      })
      
      const config = loader.getConfig()
      expect(config.generator.prettyName).toBe('Updated Generator')
      expect(config.generator.defaultOutput).toBe('./updated-output')
    })
  })

  describe('loadFromEnv', () => {
    it('should load configuration from environment variables', () => {
      process.env.GENERATOR_DEFAULT_OUTPUT = './env-output'
      process.env.GENERATOR_GRAPHQL_EXT = '.gql'
      process.env.GENERATOR_DATA_SOURCE_METHOD = 'context.db'
      
      const loader = ConfigLoader.loadFromEnv()
      const config = loader.getConfig()
      
      expect(config.generator.defaultOutput).toBe('./env-output')
      expect(config.files.extensions.graphql).toBe('.gql')
      expect(config.content.resolverImplementation.dataSourceMethod).toBe('context.db')
    })

    it('should use defaults when environment variables are not set', () => {
      const loader = ConfigLoader.loadFromEnv()
      const config = loader.getConfig()
      
      expect(config.generator.prettyName).toBe(defaultConfig.generator.prettyName)
      expect(config.generator.defaultOutput).toBe(defaultConfig.generator.defaultOutput)
    })

    it('should handle partial environment configuration', () => {
      process.env.GENERATOR_DEFAULT_OUTPUT = './partial-env-output'
      // Don't set other env vars
      
      const loader = ConfigLoader.loadFromEnv()
      const config = loader.getConfig()
      
      expect(config.generator.defaultOutput).toBe('./partial-env-output')
      expect(config.generator.prettyName).toBe(defaultConfig.generator.prettyName) // Should use default
    })
  })

  describe('type mappings', () => {
    it('should allow custom type mappings', () => {
      const userConfig: Partial<GeneratorConfig> = {
        typeMappings: {
          prismaToGraphQL: {
            Int: 'Integer',
            String: 'Text',
            DateTime: 'Date',
            Json: 'JSONObject',
            Decimal: 'BigDecimal',
            Boolean: 'Boolean',
            Float: 'Float',
            BigInt: 'BigInt',
            Bytes: 'Bytes'
          }
        }
      }
      
      const loader = new ConfigLoader(userConfig)
      const config = loader.getConfig()
      
      expect(config.typeMappings.prismaToGraphQL.Int).toBe('Integer')
      expect(config.typeMappings.prismaToGraphQL.String).toBe('Text')
      expect(config.typeMappings.prismaToGraphQL.DateTime).toBe('Date')
    })
  })

  describe('content configuration', () => {
    it('should allow custom fallback messages', () => {
      const userConfig: Partial<GeneratorConfig> = {
        content: {
          fallbackMessages: {
            basic: 'Custom basic fallback',
            withOperations: 'Custom operations fallback'
          },
          resolverImplementation: defaultConfig.content.resolverImplementation
        }
      }
      
      const loader = new ConfigLoader(userConfig)
      const config = loader.getConfig()
      
      expect(config.content.fallbackMessages.basic).toBe('Custom basic fallback')
      expect(config.content.fallbackMessages.withOperations).toBe('Custom operations fallback')
    })

    it('should allow custom resolver implementation settings', () => {
      const userConfig: Partial<GeneratorConfig> = {
        content: {
          fallbackMessages: defaultConfig.content.fallbackMessages,
          resolverImplementation: {
            dataSourceMethod: 'context.myDatabase',
            errorMessageTemplate: 'Custom error: {operationName} not found'
          }
        }
      }
      
      const loader = new ConfigLoader(userConfig)
      const config = loader.getConfig()
      
      expect(config.content.resolverImplementation.dataSourceMethod).toBe('context.myDatabase')
      expect(config.content.resolverImplementation.errorMessageTemplate).toBe('Custom error: {operationName} not found')
    })
  })
})

describe('defaultConfig', () => {
  it('should have all required properties', () => {
    expect(defaultConfig.generator.prettyName).toBeDefined()
    expect(defaultConfig.generator.defaultOutput).toBeDefined()
    
    expect(defaultConfig.files.extensions.graphql).toBeDefined()
    expect(defaultConfig.files.extensions.resolver).toBeDefined()
    
    expect(defaultConfig.files.templates.graphqlTemplate).toBeDefined()
    expect(defaultConfig.files.templates.resolverTemplate).toBeDefined()
    
    expect(defaultConfig.content.fallbackMessages.basic).toBeDefined()
    expect(defaultConfig.content.fallbackMessages.withOperations).toBeDefined()
    
    expect(defaultConfig.content.resolverImplementation.dataSourceMethod).toBeDefined()
    expect(defaultConfig.content.resolverImplementation.errorMessageTemplate).toBeDefined()
    
    expect(defaultConfig.typeMappings.prismaToGraphQL).toBeDefined()
    expect(typeof defaultConfig.typeMappings.prismaToGraphQL).toBe('object')
  })

  it('should have sensible default values', () => {
    expect(defaultConfig.generator.prettyName).toBe('Prisma GraphQL Generator')
    expect(defaultConfig.generator.defaultOutput).toBe('../generated')
    expect(defaultConfig.files.extensions.graphql).toBe('.graphql')
    expect(defaultConfig.files.extensions.resolver).toBe('.resolver.ts')
    expect(defaultConfig.content.resolverImplementation.dataSourceMethod).toBe('context.dataSources.prisma()')
  })
})
