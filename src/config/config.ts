import fs from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

import defaultConfig from './config.default'

/**
 * Configuration interface for the Prisma GraphQL Generator
 */
export interface GeneratorConfig {
  // Generator identity
  generator: {
    prettyName: string
    defaultOutput: string
  }

  // File paths and naming
  files: {
    extensions: {
      graphql: string
      resolver: string
    }
    templates: {
      graphqlTemplate: string
      resolverTemplate: string
    }
    fallbackFiles: {
      schemaTs: string
      schemaGraphql: string
      optionsJson: string
    }
    baseGraphqlPath: string
    baseModulePath: string
    presetsFilePath: string
  }

  // Environment variables
  envVars: {
    model: string
    modulePath: string
    operations: string
    queries: string
    mutations: string
    presetUsed: string
    timestamp: string
    customPlurals: string
  }

  // Content and messages
  content: {
    fallbackMessages: {
      basic: string
      withOperations: string
    }
    resolverImplementation: {
      dataSourceMethod: string
      errorMessageTemplate: string
    }
  }

  // Type mappings
  typeMappings: {
    prismaToGraphQL: Record<string, string>
  }
}

export interface PartialGeneratorConfig {
  generator?: Partial<GeneratorConfig['generator']>
  files?: {
    extensions?: Partial<GeneratorConfig['files']['extensions']>
    templates?: Partial<GeneratorConfig['files']['templates']>
    fallbackFiles?: Partial<GeneratorConfig['files']['fallbackFiles']>
    baseGraphqlPath?: string
    baseModulePath?: string
    presetsFilePath?: string
  }
  envVars?: Partial<GeneratorConfig['envVars']>
  content?: {
    fallbackMessages?: Partial<GeneratorConfig['content']['fallbackMessages']>
    resolverImplementation?: Partial<GeneratorConfig['content']['resolverImplementation']>
  }
  typeMappings?: {
    prismaToGraphQL?: GeneratorConfig['typeMappings']['prismaToGraphQL']
  }
}

/**
 * Configuration loader that merges user config with defaults
 */
export class ConfigLoader {
  private config: GeneratorConfig

  constructor(userConfig?: PartialGeneratorConfig) {
    // Determine final user config: use provided or attempt to load generator.config.json
    let finalUserConfig: PartialGeneratorConfig = {}
    if (userConfig) {
      finalUserConfig = userConfig
    } else {
      const configPath = path.resolve(process.cwd(), 'generator.config.json')
      if (existsSync(configPath)) {
        try {
          const content = readFileSync(configPath, 'utf-8')
          finalUserConfig = JSON.parse(content)
        } catch (error) {
          console.warn(`Failed to load generator.config.json, using defaults:`, error)
        }
      }
    }
    this.config = this.mergeConfig(defaultConfig, finalUserConfig)
  }

  getConfig(): GeneratorConfig {
    return this.config
  }

  updateConfig(updates: PartialGeneratorConfig): void {
    this.config = this.mergeConfig(this.config, updates)
  }

  private mergeConfig(
    base: GeneratorConfig,
    overrides: PartialGeneratorConfig
  ): GeneratorConfig {
    return {
      generator: { ...base.generator, ...overrides.generator },
      files: {
        extensions: { ...base.files.extensions, ...overrides.files?.extensions },
        templates: { ...base.files.templates, ...overrides.files?.templates },
        fallbackFiles: { ...base.files.fallbackFiles, ...overrides.files?.fallbackFiles },
        baseGraphqlPath: overrides.files?.baseGraphqlPath || base.files.baseGraphqlPath,
        baseModulePath: overrides.files?.baseModulePath || base.files.baseModulePath,
        presetsFilePath: overrides.files?.presetsFilePath || base.files.presetsFilePath

      },
      envVars: { ...base.envVars, ...overrides.envVars },
      content: {
        fallbackMessages: { ...base.content.fallbackMessages, ...overrides.content?.fallbackMessages },
        resolverImplementation: { ...base.content.resolverImplementation, ...overrides.content?.resolverImplementation }
      },
      typeMappings: {
        prismaToGraphQL: { ...base.typeMappings.prismaToGraphQL, ...overrides.typeMappings?.prismaToGraphQL }
      }
    }
  }

  /**
   * Load configuration from a file
   */
  static async loadFromFile(configPath: string): Promise<ConfigLoader> {
    try {
      const fullPath = path.resolve(configPath)
      const configContent = await fs.readFile(fullPath, 'utf-8')
      
      let userConfig: PartialGeneratorConfig
      
      if (configPath.endsWith('.json')) {
        userConfig = JSON.parse(configContent)
      } else if (configPath.endsWith('.js') || configPath.endsWith('.ts')) {
        // For JS/TS files, we would need to use dynamic imports
        const configModule = await import(fullPath)
        userConfig = configModule.default || configModule
      } else {
        throw new Error(`Unsupported config file format: ${configPath}`)
      }
      
      return new ConfigLoader(userConfig)
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}, using defaults:`, error)
      return new ConfigLoader()
    }
  }

  /**
   * Load configuration from environment variables
   */
  static loadFromEnv(): ConfigLoader {
    const envConfig: PartialGeneratorConfig = {}

    if (process.env.GENERATOR_DEFAULT_OUTPUT) {
      envConfig.generator = { 
        ...defaultConfig.generator,
        defaultOutput: process.env.GENERATOR_DEFAULT_OUTPUT 
      }
    }

    // Load file extension overrides
    if (process.env.GENERATOR_GRAPHQL_EXT || 
        process.env.GENERATOR_RESOLVER_EXT) {
      envConfig.files = {
        ...defaultConfig.files,
        extensions: {
          ...defaultConfig.files.extensions,
          ...(process.env.GENERATOR_GRAPHQL_EXT && { graphql: process.env.GENERATOR_GRAPHQL_EXT }),
          ...(process.env.GENERATOR_RESOLVER_EXT && { resolver: process.env.GENERATOR_RESOLVER_EXT })
        }
      }
    }

    // Load template paths
    if (process.env.GENERATOR_GRAPHQL_TEMPLATE || process.env.GENERATOR_RESOLVER_TEMPLATE) {
      envConfig.files = {
        ...envConfig.files || defaultConfig.files,
        templates: {
          ...defaultConfig.files.templates,
          ...(process.env.GENERATOR_GRAPHQL_TEMPLATE && { graphqlTemplate: process.env.GENERATOR_GRAPHQL_TEMPLATE }),
          ...(process.env.GENERATOR_RESOLVER_TEMPLATE && { resolverTemplate: process.env.GENERATOR_RESOLVER_TEMPLATE })
        }
      }
    }

    // Load data source method override
    if (process.env.GENERATOR_DATA_SOURCE_METHOD) {
      envConfig.content = {
        ...defaultConfig.content,
        resolverImplementation: {
          ...defaultConfig.content.resolverImplementation,
          dataSourceMethod: process.env.GENERATOR_DATA_SOURCE_METHOD
        }
      }
    }

    return new ConfigLoader(envConfig)
  }
}

// Export a default instance for simple usage
export const config = new ConfigLoader()
