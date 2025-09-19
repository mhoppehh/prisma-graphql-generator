#!/usr/bin/env node
import inquirer from 'inquirer'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

import { config as generatorConfig } from './src/config/config'
import { loadExtractedOptions, generateWithOptions } from './src/optionsLoader'

// Type definitions
interface PrismaModel {
  name: string
  value: string
  description: string
}

interface ExistingFiles {
  sdl: boolean
  queries: string[]
  mutations: string[]
}

interface GeneratorConfig {
  modelName: string
  moduleFolderPath: string
  operations: string[]
  queries: string[]
  mutations: string[]
  existingFiles?: ExistingFiles
}

interface Presets {
  [key: string]: GeneratorConfig
}

const configData = generatorConfig.getConfig()

// Show usage help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 Prisma GraphQL Generator

Usage:
  node prisma-generator.js [preset-name]
  
Examples:
  node prisma-generator.js                           # Interactive mode
  node prisma-generator.js branches-sdl-quer-mut-all  # Use specific preset
  
Options:
  --help, -h    Show this help message
  --list, -l    List available presets
`)
  process.exit(0)
}

// List presets
if (process.argv.includes('--list') || process.argv.includes('-l')) {
  try {
    const data = fs.readFileSync(configData.files.presetsFilePath, 'utf8')
    const presets = JSON.parse(data)
    const presetNames = Object.keys(presets)

    if (presetNames.length === 0) {
      console.log('📋 No presets found. Create some using interactive mode first.')
    } else {
      console.log('📋 Available presets:')
      presetNames.forEach(name => {
        const preset = presets[name]
        console.log(`  • ${name} (${preset.modelName})`)
      })
    }
  } catch {
    console.log('📋 No presets found. Create some using interactive mode first.')
  }
  process.exit(0)
}

async function loadPresets(): Promise<Presets> {
  try {
    const data = fs.readFileSync(configData.files.presetsFilePath, 'utf8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function savePresets(presets: Presets): Promise<void> {
  fs.writeFileSync(configData.files.presetsFilePath, JSON.stringify(presets, null, 2))
}

async function getPrismaModels(): Promise<PrismaModel[]> {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')

    // Extract model names from schema
    const modelMatches = schemaContent.match(/model\s+(\w+)\s*{/g)
    if (!modelMatches) return []

    return modelMatches.map(match => {
      const modelNameMatch = match.match(/model\s+(\w+)/)
      if (!modelNameMatch) throw new Error(`Could not extract model name from: ${match}`)
      const modelName = modelNameMatch[1]
      return {
        name: modelName,
        value: modelName,
        // Make it easier to find by showing both CamelCase and potential underscore versions
        description: modelName
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .replace(/^_/, ''),
      }
    })
  } catch (error) {
    console.warn("Could not read Prisma schema, you'll need to type the model name manually")
    return []
  }
}

async function scanModuleFolder(
  moduleFolderPath: string,
  modelName: string,
): Promise<ExistingFiles> {
  const moduleDir = path.join(moduleFolderPath, modelName.toLowerCase())
  const existingFiles: ExistingFiles = {
    sdl: false,
    queries: [],
    mutations: [],
  }

  try {
    if (fs.existsSync(moduleDir)) {
      const files = fs.readdirSync(moduleDir)

      // Check for SDL file
      existingFiles.sdl = files.some(file => file.endsWith('.graphql') || file.endsWith('.sdl.js'))

      // Check for resolver files and extract query/mutation names
      files.forEach(file => {
        if (file.includes('queries') || file.includes('query')) {
          // You could parse the file to extract specific query names
          existingFiles.queries.push(file)
        }
        if (file.includes('mutations') || file.includes('mutation')) {
          // You could parse the file to extract specific mutation names
          existingFiles.mutations.push(file)
        }
      })
    }
  } catch (error) {
    console.warn(`Could not scan module folder: ${(error as Error).message}`)
  }

  return existingFiles
}

// Helper to singularize model names (basic, for common cases)
function singularize(name: string): string {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y'
  if (name.endsWith('ses')) return name.slice(0, -2)
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1)
  return name
}

// Convert modelName to kebab-case for folder
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .toLowerCase()
}

async function main(): Promise<void> {
  const presets = await loadPresets()
  const presetNames = Object.keys(presets)

  // Check if preset name was passed as command line argument
  const presetArg = process.argv[2]
  let config: GeneratorConfig

  if (presetArg) {
    // Use preset directly without prompts
    if (presets[presetArg]) {
      config = presets[presetArg]
      console.log(`\n📋 Using preset: ${presetArg}`)
      console.log(`📝 Model: ${config.modelName}`)
      console.log(`📁 Output: ${config.moduleFolderPath}`)
      console.log(`🔧 Operations: ${config.operations.join(', ')}`)
      if (config.queries && config.queries.length > 0)
        console.log(`🔍 Queries: ${config.queries.join(', ')}`)
      if (config.mutations && config.mutations.length > 0)
        console.log(`✏️  Mutations: ${config.mutations.join(', ')}`)
      console.log('')

      // Skip to execution
      await executeGeneration(config)
      return
    } else {
      console.error(`❌ Preset "${presetArg}" not found.`)
      console.log('Available presets:', presetNames.join(', '))
      process.exit(1)
    }
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '🆕 Create new GraphQL module', value: 'new' },
        ...(presetNames.length > 0 ? [{ name: '📋 Use saved preset', value: 'preset' }] : []),
        { name: '⚡ Quick generate (basic CRUD)', value: 'quick' },
      ],
    },
  ])

  if (action === 'preset') {
    const { presetName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'presetName',
        message: 'Choose a preset:',
        choices: presetNames.map(name => ({
          name: `${name} (${presets[name].modelName})`,
          value: name,
        })),
      },
    ])
    config = presets[presetName]
    console.log(`\n📋 Using preset: ${presetName}`)
  } else if (action === 'new') {
    // Get available Prisma models
    const models = await getPrismaModels()

    // Ask for model name first
    let modelQuestion: any
    if (models.length > 0) {
      modelQuestion = {
        type: 'list',
        name: 'modelName',
        message: 'Select Prisma model to generate from:',
        choices: [
          ...models,
          new inquirer.Separator(),
          { name: '✏️  Type custom model name', value: 'custom' },
        ],
      }
    } else {
      modelQuestion = {
        type: 'input',
        name: 'modelName',
        message: 'Enter Prisma model name:',
        validate: (input: string) => {
          if (!input.trim()) return 'Model name is required'
          return true
        },
      }
    }

    let { modelName } = await inquirer.prompt([modelQuestion])

    // Handle custom input
    if (modelName === 'custom') {
      const { customModelName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customModelName',
          message: 'Enter model name:',
          validate: (input: string) => {
            if (!input.trim()) return 'Model name is required'
            return true
          },
        },
      ])
      modelName = customModelName
    }

    // Convert modelName to kebab-case for folder
    const moduleFolderPath = path.join('.', configData.files.baseModulePath, toKebabCase(modelName))

    // Scan existing files
    const existingFiles = await scanModuleFolder(moduleFolderPath, modelName)

    if (
      existingFiles.sdl ||
      existingFiles.queries.length > 0 ||
      existingFiles.mutations.length > 0
    ) {
      console.log(`\n⚠️  Found existing files for ${modelName}:`)
      if (existingFiles.sdl) console.log('  - SDL file exists')
      if (existingFiles.queries.length > 0)
        console.log(`  - Query files: ${existingFiles.queries.join(', ')}`)
      if (existingFiles.mutations.length > 0)
        console.log(`  - Mutation files: ${existingFiles.mutations.join(', ')}`)
      console.log('')
    }

    // Ask about operations
    const operationsResult = await inquirer.prompt({
      type: 'checkbox',
      name: 'operations',
      message: 'What do you want to generate?',
      choices: [
        { name: 'SDL (Schema Definition)', value: 'sdl', checked: !existingFiles.sdl },
        { name: 'Queries', value: 'queries' },
        { name: 'Mutations', value: 'mutations' },
      ],
      validate: (choices: any) => {
        if (choices.length === 0) return 'Select at least one option'
        return true
      },
    } as any)
    const operations = operationsResult.operations as string[]

    let queries: string[] = []
    let mutations: string[] = []

    // Ask for specific queries if selected
    if (operations.includes('queries')) {
      const singularModel = singularize(modelName)
      const pluralModel = modelName.endsWith('s') ? modelName : modelName + 's'
      const queriesResult = await inquirer.prompt({
        type: 'checkbox',
        name: 'selectedQueries',
        message: 'Select queries to generate:',
        choices: [
          {
            name: `${singularModel.toLowerCase()} - Find single record`,
            value: 'findUnique',
            checked: true,
          },
          {
            name: `${pluralModel.toLowerCase()} - Find multiple records`,
            value: 'findMany',
            checked: true,
          },
          { name: `${singularModel.toLowerCase()}Count - Count records`, value: 'count' },
          { name: `${singularModel.toLowerCase()}Aggregate - Aggregate data`, value: 'aggregate' },
          { name: `${singularModel.toLowerCase()}GroupBy - Group by fields`, value: 'groupBy' },
        ],
        validate: (choices: any) => {
          if (choices.length === 0) return 'Select at least one query'
          return true
        },
      } as any)
      queries = queriesResult.selectedQueries
    }

    // Ask for specific mutations if selected
    if (operations.includes('mutations')) {
      const singularModel = singularize(modelName)
      const pluralModel = modelName.endsWith('s') ? modelName : modelName + 's'
      const mutationsResult = await inquirer.prompt({
        type: 'checkbox',
        name: 'selectedMutations',
        message: 'Select mutations to generate:',
        choices: [
          { name: `create${singularModel} - Create single record`, value: 'create', checked: true },
          { name: `createMany${pluralModel} - Create multiple records`, value: 'createMany' },
          { name: `update${singularModel} - Update single record`, value: 'update', checked: true },
          { name: `updateMany${pluralModel} - Update multiple records`, value: 'updateMany' },
          { name: `upsert${singularModel} - Create or update record`, value: 'upsert' },
          { name: `delete${singularModel} - Delete single record`, value: 'delete', checked: true },
          { name: `deleteMany${pluralModel} - Delete multiple records`, value: 'deleteMany' },
        ],
        validate: (choices: any) => {
          if (choices.length === 0) return 'Select at least one mutation'
          return true
        },
      } as any)
      mutations = mutationsResult.selectedMutations
    }

    config = {
      modelName,
      moduleFolderPath,
      operations,
      queries,
      mutations,
      existingFiles,
    }

    // Ask if they want to save this as a preset
    const { saveAsPreset, presetName } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'saveAsPreset',
        message: 'Save this configuration as a preset?',
        default: false,
      },
      {
        type: 'input',
        name: 'presetName',
        message: 'Preset name:',
        when: (answers: any) => answers.saveAsPreset,
        default: `${modelName.toLowerCase()}-${operations.join('-')}`,
        validate: (input: string) => {
          if (!input.trim()) return 'Preset name is required'
          if (presets[input]) return 'Preset name already exists'
          return true
        },
      },
    ])

    if (saveAsPreset && presetName) {
      presets[presetName] = config
      await savePresets(presets)
      console.log(`✅ Preset "${presetName}" saved!`)
    }
  } else {
    // Quick mode with defaults
    const models = await getPrismaModels()
    let modelName: string

    if (models.length > 0) {
      const { selectedModel } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedModel',
          message: 'Quick generate for which model?',
          choices: models,
        },
      ])
      modelName = selectedModel
    } else {
      const { inputModel } = await inquirer.prompt([
        {
          type: 'input',
          name: 'inputModel',
          message: 'Enter model name for quick generate:',
          validate: (input: string) => (input.trim() ? true : 'Model name is required'),
        },
      ])
      modelName = inputModel
    }

    config = {
      modelName,
      moduleFolderPath: './src/modules',
      operations: ['sdl', 'queries', 'mutations'],
      queries: ['findUnique', 'findMany'],
      mutations: ['create', 'update', 'delete'],
      existingFiles: {
        sdl: false,
        queries: [],
        mutations: [],
      },
    }
  }

  // Execute generation
  await executeGeneration(config)
}

async function executeGeneration(config: GeneratorConfig): Promise<void> {
  console.log('\n🚀 Generating GraphQL module...')
  console.log(`📝 Model: ${config.modelName}`)
  console.log(`📁 Output: ${config.moduleFolderPath}/${config.modelName.toLowerCase()}`)
  console.log(`🔧 Operations: ${config.operations.join(', ')}`)
  if (config.queries.length > 0) console.log(`🔍 Queries: ${config.queries.join(', ')}`)
  if (config.mutations.length > 0) console.log(`✏️  Mutations: ${config.mutations.join(', ')}`)
  console.log('')

  try {
    console.log('📊 Extracting Prisma schema options...')

    await new Promise<void>((resolve, reject) => {
      const child = spawn('npx', ['prisma', 'generate'], {
        stdio: 'inherit',
        shell: true,
      })

      child.on('exit', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Options extraction failed with exit code ${code}`))
        }
      })
    })

    console.log('📥 Loading extracted options...')
    const extractedOptions = await loadExtractedOptions()

    if (!extractedOptions) {
      throw new Error('Failed to load extracted options from options.json')
    }

    console.log('🔨 Generating GraphQL files...')
    await generateWithOptions(extractedOptions, {
      modelName: config.modelName,
      modulePath: config.moduleFolderPath,
      queries: config.queries,
      mutations: config.mutations,
    })

    console.log('\n✅ GraphQL module generation completed successfully!')
  } catch (error) {
    console.error('\n❌ Generation failed:', error)
    throw error
  }
}

main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
