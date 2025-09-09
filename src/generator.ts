import path from 'path'

import {
  GeneratorConfig,
  generatorHandler,
  GeneratorOptions,
} from '@prisma/generator-helper'
import { logger } from '@prisma/internals'

import { GENERATOR_NAME } from './constants'
import { generateGraphQLFiles } from './helpers'
import { checkExistingFiles } from './utils/fileExists'
import { writeFileSafely } from './utils/writeFileSafely'

const { version } = require('../package.json')

export const onGenerate = async (options: GeneratorOptions) => {
  // Parse environment variables
  const modelName = process.env.GENERATOR_MODEL?.trim()
  const modulePath = process.env.GENERATOR_MODULE_PATH?.trim()
  const operations =
    process.env.GENERATOR_OPERATIONS?.split(',')
      .map(s => s.trim())
      .filter(Boolean) || []
  const queries =
    process.env.GENERATOR_QUERIES?.split(',')
      .map(s => s.trim())
      .filter(Boolean) || []
  const mutations =
    process.env.GENERATOR_MUTATIONS?.split(',')
      .map(s => s.trim())
      .filter(Boolean) || []
  const presetUsed = process.env.GENERATOR_PRESET_USED?.trim()
  const timestamp = process.env.GENERATOR_TIMESTAMP?.trim()

  // Parse custom plurals from environment variable
  // Format: "singular1:plural1,singular2:plural2"
  const customPlurals: Record<string, string> = {}
  const customPluralsEnv = process.env.GENERATOR_CUSTOM_PLURALS?.trim()
  if (customPluralsEnv) {
    customPluralsEnv.split(',').forEach(pair => {
      const [singular, plural] = pair.split(':').map(s => s.trim())
      if (singular && plural) {
        customPlurals[singular.toLowerCase()] = plural
      }
    })
  }

  // Validate required fields
  if (!modelName || !modulePath) {
    logger.error(
      'Missing required environment variables: GENERATOR_MODEL and/or GENERATOR_MODULE_PATH.',
    )
    logger.error('No model-specific GraphQL files will be generated.')
    // Fallback: generate basic schema files - simplified since legacy functions are deprecated
    const basePath = options.generator.output?.value!
    const fallbackContent = `// GraphQL generator fallback - please use specific model generation`
    await writeFileSafely(path.join(basePath, 'schema.ts'), fallbackContent)
    await writeFileSafely(
      path.join(basePath, 'schema.graphql'),
      fallbackContent,
    )
    await writeFileSafely(
      path.join(basePath, 'options.json'),
      JSON.stringify(options, null, 2),
    )
    return
  }

  // Prepare config object
  const config = {
    modelName,
    modulePath,
    operations,
    queries,
    mutations,
    presetUsed,
    timestamp,
    customPlurals,
  }

  // Check for existing files
  // const existingFiles = await checkExistingFiles(modulePath, modelName)

  // Only generate GraphQL files if queries or mutations are specified
  if (queries.length > 0 || mutations.length > 0) {
    await generateGraphQLFiles(options.dmmf, config)
    logger.info(`✅ Generated GraphQL files for model: ${modelName}`)
    logger.info(`📋 Queries: ${queries.join(', ')}`)
    logger.info(`🔧 Mutations: ${mutations.join(', ')}`)
    const basePath = options.generator.output?.value!
    await writeFileSafely(
      path.join(basePath, 'options.json'),
      JSON.stringify(options, null, 2),
    )
    return
  }

  // Fallback: generate basic schema files
  const basePath = options.generator.output?.value!
  const fallbackContent = `// GraphQL generator fallback - please use specific model generation with queries or mutations`
  await writeFileSafely(path.join(basePath, 'schema.ts'), fallbackContent)
  await writeFileSafely(path.join(basePath, 'schema.graphql'), fallbackContent)
  await writeFileSafely(
    path.join(basePath, 'options.json'),
    JSON.stringify(options, null, 2),
  )
}

generatorHandler({
  onManifest(config: GeneratorConfig) {
    logger.info(`${GENERATOR_NAME}:Registered`)
    logger.info('Config: ' + JSON.stringify(config, null, 2))
    return {
      version,
      defaultOutput: '../generated',
      prettyName: GENERATOR_NAME,
    }
  },
  onGenerate: onGenerate,
})
