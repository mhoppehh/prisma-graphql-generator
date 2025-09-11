import path from 'path'

import { GeneratorConfig, generatorHandler, GeneratorOptions } from '@prisma/generator-helper'
import { logger } from '@prisma/internals'

import { GENERATOR_NAME } from './constants'
import { generateGraphQLFiles } from './helpers'
import { writeFileSafely } from './utils/writeFileSafely'
import { config as generatorConfig } from './config/config'
import { executeHook, loadPlugins, pluginManager } from './plugins'

const { version } = require('../package.json')

export const onGenerate = async (options: GeneratorOptions) => {
  await loadPlugins(generatorConfig.getConfig())
  await pluginManager.initializeAll()

  try {
    const configData = generatorConfig.getConfig()

    const modelName = process.env[configData.envVars.model]?.trim()
    const modulePath = process.env[configData.envVars.modulePath]?.trim()
    const operations =
      process.env[configData.envVars.operations]
        ?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || []
    const queries =
      process.env[configData.envVars.queries]
        ?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || []
    const mutations =
      process.env[configData.envVars.mutations]
        ?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || []
    const presetUsed = process.env[configData.envVars.presetUsed]?.trim()
    const timestamp = process.env[configData.envVars.timestamp]?.trim()

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

    if (!modelName || !modulePath) {
      executeHook('onModuleNotFound', {
        modulePath,
        modelName,
      })

      const basePath = options.generator.output?.value!
      const fallbackContent = configData.content.fallbackMessages.basic
      await writeFileSafely(
        path.join(basePath, configData.files.fallbackFiles.schemaTs),
        fallbackContent,
      )
      await writeFileSafely(
        path.join(basePath, configData.files.fallbackFiles.schemaGraphql),
        fallbackContent,
      )
      return
    }

    if (config.queries.length > 0 || config.mutations.length > 0) {
      await generateGraphQLFiles(options.dmmf, {
        modelName: config.modelName,
        modulePath: config.modulePath,
        queries: config.queries,
        mutations: config.mutations,
        customPlurals: config.customPlurals,
      })
      executeHook('onGenerationFinished', {
        modelName,
        modulePath,
        queries,
        mutations,
        customPlurals,
      })
      return
    }

    const basePath = options.generator.output?.value!
    const fallbackContent = configData.content.fallbackMessages.withOperations
    await writeFileSafely(
      path.join(basePath, configData.files.fallbackFiles.schemaTs),
      fallbackContent,
    )
    await writeFileSafely(
      path.join(basePath, configData.files.fallbackFiles.schemaGraphql),
      fallbackContent,
    )
  } catch (error) {
    throw error
  } finally {
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
