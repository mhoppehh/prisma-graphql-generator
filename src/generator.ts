import path from 'path'
import fs from 'fs/promises'

import { GeneratorConfig, generatorHandler, GeneratorOptions } from '@prisma/generator-helper'
import { logger } from '@prisma/internals'

import { GENERATOR_NAME } from './constants'
import { generateGraphQLFiles } from './helpers'
import { writeFileSafely } from './utils/writeFileSafely'
import { fileExists } from './utils/fileExists'
import { config as generatorConfig } from './config/config'
import { executeHook, loadPlugins, pluginManager } from './plugins'

const { version } = require('../package.json')

/**
 * Read and parse external script options from the JSON file
 */
async function readScriptOptions(optionsPath: string): Promise<{
  modelName?: string
  modulePath?: string
  queries?: string[]
  mutations?: string[]
  operations?: string[]
  customPlurals?: Record<string, string>
} | null> {
  try {
    // Check if there's a script options file alongside the options.json
    const scriptOptionsPath = optionsPath.replace('options.json', 'script-options.json')

    if (await fileExists(scriptOptionsPath)) {
      const content = await fs.readFile(scriptOptionsPath, 'utf-8')
      const scriptOptions = JSON.parse(content)

      return {
        modelName: scriptOptions.modelName?.trim(),
        modulePath: scriptOptions.modulePath?.trim(),
        queries: scriptOptions.queries || [],
        mutations: scriptOptions.mutations || [],
        operations: scriptOptions.operations || [],
        customPlurals: scriptOptions.customPlurals || {},
      }
    }

    return null
  } catch (error) {
    logger.warn(`${GENERATOR_NAME}: Could not read script options: ${error}`)
    return null
  }
}

export const onGenerate = async (options: GeneratorOptions) => {
  await loadPlugins(generatorConfig.getConfig())
  await pluginManager.initializeAll()

  try {
    const configData = generatorConfig.getConfig()

    const optionsPath = path.join(process.cwd(), configData.files.fallbackFiles.optionsJson)
    await writeFileSafely(optionsPath, JSON.stringify(options, null, 2))
    logger.info(`${GENERATOR_NAME}: Options saved to ${optionsPath}`)

    // Read script options instead of environment variables
    const scriptOptions = await readScriptOptions(optionsPath)

    if (!scriptOptions) {
      logger.info(
        `${GENERATOR_NAME}: No script options found, waiting for script to generate files`,
      )
      return
    }

    const {
      modelName,
      modulePath,
      queries = [],
      mutations = [],
      operations = [],
      customPlurals = {},
    } = scriptOptions

    if (!modelName || !modulePath) {
      logger.info(
        `${GENERATOR_NAME}: Missing required script options (modelName or modulePath), waiting for script to generate files`,
      )
      return
    }

    if (queries.length > 0 || mutations.length > 0) {
      await generateGraphQLFiles(options.dmmf, {
        modelName: modelName,
        modulePath: modulePath,
        queries: queries,
        mutations: mutations,
        customPlurals: customPlurals,
      })
      executeHook('onGenerationFinished', {
        modelName,
        modulePath,
        queries,
        mutations,
        customPlurals,
      })
    }
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
