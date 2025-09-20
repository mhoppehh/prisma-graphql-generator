import fs from 'fs'
import path from 'path'
import { GeneratorOptions } from '@prisma/generator-helper'
import { config as generatorConfig } from './config/config'
import { fileExists } from './utils/fileExists'

interface ScriptOptions {
  modelName?: string
  modulePath?: string
  operations?: string[]
  queries?: string[]
  mutations?: string[]
  customPlurals?: Record<string, string>
  presetUsed?: string
  timestamp?: string
}

export async function readScriptOptions(fallbackPath?: string): Promise<ScriptOptions | null> {
  try {
    const configData = generatorConfig.getConfig()

    const possiblePaths = ['script-options.json', '.script-options.json', fallbackPath].filter(
      Boolean,
    )

    for (const optionsPath of possiblePaths) {
      if (await fileExists(optionsPath!)) {
        const fs = await import('fs/promises')
        const optionsData = await fs.readFile(optionsPath!, 'utf8')
        return JSON.parse(optionsData) as ScriptOptions
      }
    }

    return null
  } catch (error) {
    console.warn('Failed to load script options:', error)
    return null
  }
}

export async function loadExtractedOptions(): Promise<GeneratorOptions | null> {
  try {
    const configData = generatorConfig.getConfig()
    const optionsPath = path.join(process.cwd(), configData.files.fallbackFiles.optionsJson)

    if (!fs.existsSync(optionsPath)) {
      return null
    }

    const optionsData = fs.readFileSync(optionsPath, 'utf8')
    return JSON.parse(optionsData) as GeneratorOptions
  } catch (error) {
    console.warn('Failed to load extracted options:', error)
    return null
  }
}

export async function generateWithOptions(
  options: GeneratorOptions,
  config: {
    modelName: string
    modulePath: string
    queries: string[]
    mutations: string[]
    customPlurals?: Record<string, string>
  },
): Promise<void> {
  const { generateGraphQLFiles } = await import('./helpers')

  await generateGraphQLFiles(options.dmmf, {
    modelName: config.modelName,
    modulePath: config.modulePath,
    queries: config.queries,
    mutations: config.mutations,
    customPlurals: config.customPlurals,
  })
}
