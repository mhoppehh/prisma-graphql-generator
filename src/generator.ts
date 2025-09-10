import path from 'path'

import {
  GeneratorConfig,
  generatorHandler,
  GeneratorOptions,
} from '@prisma/generator-helper'
import { logger } from '@prisma/internals'

import { GENERATOR_NAME } from './constants'
import { generateGraphQLFiles } from './helpers'
import { writeFileSafely } from './utils/writeFileSafely'
import { config as generatorConfig } from './config/config'
import { executeHook, pluginManager, loadDefaultPlugins, HookContext } from './plugins'

const { version } = require('../package.json')

export const onGenerate = async (options: GeneratorOptions) => {
  // Load default plugins
  await loadDefaultPlugins()
  
  // Initialize plugin system
  await pluginManager.initializeAll()

  // Create initial hook context
  let hookContext: HookContext = {
    stage: 'onGenerateStart',
    timestamp: new Date(),
    generatorOptions: options,
    metadata: {}
  }

  try {
    // Execute onGenerateStart hook
    hookContext = await executeHook('onGenerateStart', hookContext)

    const configData = generatorConfig.getConfig()
    
    // Parse environment variables using config
    const modelName = process.env[configData.envVars.model]?.trim()
    const modulePath = process.env[configData.envVars.modulePath]?.trim()
    const operations =
      process.env[configData.envVars.operations]?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || []
    const queries =
      process.env[configData.envVars.queries]?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || []
    const mutations =
      process.env[configData.envVars.mutations]?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || []
    const presetUsed = process.env[configData.envVars.presetUsed]?.trim()
    const timestamp = process.env[configData.envVars.timestamp]?.trim()

    // Parse custom plurals from environment variable
    // Format: "singular1:plural1,singular2:plural2"
    const customPlurals: Record<string, string> = {}
    const customPluralsEnv = process.env[configData.envVars.customPlurals]?.trim()
    if (customPluralsEnv) {
      customPluralsEnv.split(',').forEach(pair => {
        const [singular, plural] = pair.split(':').map(s => s.trim())
        if (singular && plural) {
          customPlurals[singular.toLowerCase()] = plural
        }
      })
    }

    // Prepare config object
    const config = {
      modelName: modelName!,
      modulePath: modulePath!,
      operations,
      queries,
      mutations,
      presetUsed,
      timestamp,
      customPlurals,
    }

    // Execute onConfigParsed hook
    hookContext = await executeHook('onConfigParsed', {
      ...hookContext,
      stage: 'onConfigParsed',
      config
    })

    // Use potentially modified config from hooks
    const finalConfig = hookContext.config || config

    // Validate required fields
    if (!modelName || !modulePath) {
      logger.error(
        'Missing required environment variables: GENERATOR_MODEL and/or GENERATOR_MODULE_PATH.',
      )
      logger.error('No model-specific GraphQL files will be generated.')
      // Fallback: generate basic schema files - simplified since legacy functions are deprecated
      const basePath = options.generator.output?.value!
      const fallbackContent = configData.content.fallbackMessages.basic
      await writeFileSafely(path.join(basePath, configData.files.fallbackFiles.schemaTs), fallbackContent)
      await writeFileSafely(
        path.join(basePath, configData.files.fallbackFiles.schemaGraphql),
        fallbackContent,
      )
      
      // Execute completion hook even for fallback
      await executeHook('onGenerateComplete', {
        ...hookContext,
        stage: 'onGenerateComplete'
      })
      
      return
    }

    // Check for existing files
    // const existingFiles = await checkExistingFiles(modulePath, modelName)

    // Only generate GraphQL files if queries or mutations are specified
    if (finalConfig.queries.length > 0 || finalConfig.mutations.length > 0) {
      await generateGraphQLFiles(options.dmmf, {
        modelName: finalConfig.modelName,
        modulePath: finalConfig.modulePath,
        queries: finalConfig.queries,
        mutations: finalConfig.mutations,
        customPlurals: finalConfig.customPlurals
      })
      logger.info(`✅ Generated GraphQL files for model: ${finalConfig.modelName}`)
      logger.info(`📋 Queries: ${finalConfig.queries.join(', ')}`)
      logger.info(`🔧 Mutations: ${finalConfig.mutations.join(', ')}`)
      
      // Execute completion hook
      await executeHook('onGenerateComplete', {
        ...hookContext,
        stage: 'onGenerateComplete'
      })
      
      return
    }

    // Fallback: generate basic schema files
    const basePath = options.generator.output?.value!
    const fallbackContent = configData.content.fallbackMessages.withOperations
    await writeFileSafely(path.join(basePath, configData.files.fallbackFiles.schemaTs), fallbackContent)
    await writeFileSafely(path.join(basePath, configData.files.fallbackFiles.schemaGraphql), fallbackContent)
    
    // Execute completion hook
    await executeHook('onGenerateComplete', {
      ...hookContext,
      stage: 'onGenerateComplete'
    })

  } catch (error) {
    // Execute error hook
    await executeHook('onError', {
      ...hookContext,
      stage: 'onError',
      error: error instanceof Error ? error : new Error(String(error))
    })
    
    // Re-throw the error
    throw error
  } finally {
    // Cleanup plugins
    await pluginManager.cleanupAll()
  }
}

generatorHandler({
  onManifest(config: GeneratorConfig) {
    const configData = generatorConfig.getConfig()
    logger.info(`${GENERATOR_NAME}:Registered`)
    logger.info('Config: ' + JSON.stringify(config, null, 2))
    return {
      version,
      defaultOutput: configData.generator.defaultOutput,
      prettyName: configData.generator.prettyName,
    }
  },
  onGenerate: onGenerate,
})
