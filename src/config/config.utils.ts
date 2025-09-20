/**
 * Utility functions for managing generator configurations
 */

import path from 'path'
import { ConfigLoader, GeneratorConfig, PartialGeneratorConfig } from './config'

/**
 * Load configuration from various sources with fallback priority:
 * 1. Configuration file (if provided)
 * 2. Default configuration
 */
export async function loadConfiguration(configPath?: string): Promise<ConfigLoader> {
  let config = new ConfigLoader()

  if (configPath) {
    try {
      const fileConfig = await ConfigLoader.loadFromFile(configPath)
      config = fileConfig
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}, using defaults:`, error)
    }
  }

  return config
}

/**
 * Get configuration file path from common config file names
 */
export function getConfigPath(): string | undefined {
  const commonConfigFiles = [
    'generator.config.ts',
    'generator.config.js',
    'generator.config.json',
    '.generator.config.json',
  ]

  for (const configFile of commonConfigFiles) {
    const configPath = path.resolve(process.cwd(), configFile)
    try {
      require.resolve(configPath)
      return configPath
    } catch {
    }
  }

  return undefined
}

/**
 * Validate that a configuration object has required fields
 */
export function validateConfiguration(config: PartialGeneratorConfig): string[] {
  const errors: string[] = []

  if (config.generator?.defaultOutput !== undefined && !config.generator.defaultOutput.trim()) {
    errors.push('Default output path cannot be empty')
  }

  if (config.files?.extensions) {
    const extensions = config.files.extensions
    if (extensions.graphql !== undefined && !extensions.graphql.startsWith('.')) {
      errors.push('GraphQL file extension must start with a dot')
    }
    if (extensions.resolver !== undefined && !extensions.resolver.startsWith('.')) {
      errors.push('Resolver file extension must start with a dot')
    }
  }

  if (config.files?.templates) {
    const templates = config.files.templates
    if (templates.graphqlTemplate !== undefined && !templates.graphqlTemplate.trim()) {
      errors.push('GraphQL template path cannot be empty')
    }
    if (templates.resolverTemplate !== undefined && !templates.resolverTemplate.trim()) {
      errors.push('Resolver template path cannot be empty')
    }
  }

  return errors
}

/**
 * Print configuration information for debugging
 */
export function debugConfiguration(config: GeneratorConfig): void {
  console.log('🔧 Generator Configuration:')
  console.log(`  Pretty Name: ${config.generator.prettyName}`)
  console.log(`  Default Output: ${config.generator.defaultOutput}`)

  console.log('\n📁 File Configuration:')
  console.log(`  GraphQL Extension: ${config.files.extensions.graphql}`)
  console.log(`  Resolver Extension: ${config.files.extensions.resolver}`)
  console.log(`  GraphQL Template: ${config.files.templates.graphqlTemplate}`)
  console.log(`  Resolver Template: ${config.files.templates.resolverTemplate}`)
  console.log(`  Base GraphQL Path: ${config.files.baseGraphqlPath}`)

  console.log('\n🔀 Data Source:')
  console.log(`  Method: ${config.content.resolverImplementation.dataSourceMethod}`)
  console.log(`  Error Template: ${config.content.resolverImplementation.errorMessageTemplate}`)

  console.log('\n🏷️  Type Mappings:')
  Object.entries(config.typeMappings.prismaToGraphQL).forEach(([prisma, graphql]) => {
    console.log(`  ${prisma} → ${graphql}`)
  })
}
