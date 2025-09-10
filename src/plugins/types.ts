import { DMMF } from '@prisma/generator-helper'
import { GeneratorOptions } from '@prisma/generator-helper'
import { 
  GenerateModuleOptions, 
  GeneratorConfig, 
  HandlebarsTemplateData,
  GraphQLTypes 
} from '../types/newTypes'

/**
 * Hook names for different stages of the generation process
 */
export type HookName = 
  | 'onGenerateStart'           // Start of generation process
  | 'onConfigParsed'            // After environment variables are parsed
  | 'onModelFound'              // After model is found in DMMF
  | 'onOptionsCreated'          // After GenerateModuleOptions is created
  | 'onTemplateDataPrepared'    // After template data is prepared
  | 'onTypesGenerated'          // After GraphQL types are generated
  | 'onSDLGenerated'            // After SDL content is generated
  | 'onResolverGenerated'       // After resolver content is generated
  | 'onFileWritten'             // After a file is written
  | 'onGenerateComplete'        // End of generation process
  | 'onError'                   // When an error occurs

/**
 * Context object passed to hooks containing all relevant data for the current stage
 */
export interface HookContext {
  // Always available
  stage: HookName
  timestamp: Date
  
  // Available from onGenerateStart
  generatorOptions?: GeneratorOptions
  
  // Available from onConfigParsed
  config?: GeneratorConfig
  
  // Available from onModelFound
  dmmf?: DMMF.Document
  model?: DMMF.Model
  
  // Available from onOptionsCreated
  moduleOptions?: GenerateModuleOptions
  
  // Available from onTemplateDataPrepared
  templateData?: HandlebarsTemplateData
  
  // Available from onTypesGenerated
  graphqlTypes?: GraphQLTypes
  
  // Available from onSDLGenerated and onResolverGenerated
  generatedContent?: string
  filePath?: string
  
  // Available from onError
  error?: Error
  
  // Metadata that can be shared between hooks
  metadata?: Record<string, any>
}

/**
 * Result object that hooks can return to modify the generation process
 */
export interface HookResult {
  // Whether to continue with the generation process
  continue?: boolean
  
  // Modified data to use for the next stage
  config?: GeneratorConfig
  model?: DMMF.Model
  moduleOptions?: GenerateModuleOptions
  templateData?: HandlebarsTemplateData
  graphqlTypes?: GraphQLTypes
  generatedContent?: string
  
  // Additional metadata to add to context
  metadata?: Record<string, any>
  
  // Skip certain operations
  skipSDLGeneration?: boolean
  skipResolverGeneration?: boolean
  skipFileWrite?: boolean
}

/**
 * Hook function signature
 */
export type HookFunction = (context: HookContext) => Promise<HookResult | void> | HookResult | void

/**
 * Plugin interface
 */
export interface Plugin {
  name: string
  version?: string
  description?: string
  
  // Lifecycle hooks
  hooks?: Partial<Record<HookName, HookFunction | HookFunction[]>>
  
  // Plugin initialization
  initialize?: (pluginManager: PluginManager) => Promise<void> | void
  
  // Plugin cleanup
  cleanup?: () => Promise<void> | void
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean
  options?: Record<string, any>
}

/**
 * Plugin manager interface
 */
export interface PluginManager {
  // Plugin management
  register(plugin: Plugin, config?: PluginConfig): void
  unregister(name: string): void
  isRegistered(name: string): boolean
  getPlugin(name: string): Plugin | undefined
  
  // Hook execution
  executeHook(hookName: HookName, context: HookContext): Promise<HookContext>
  
  // Plugin listing
  getRegisteredPlugins(): Array<{ plugin: Plugin; config: PluginConfig }>
  
  // Lifecycle
  initializeAll(): Promise<void>
  cleanupAll(): Promise<void>
}

/**
 * Plugin registry type for storing plugins
 */
export interface PluginRegistry {
  [pluginName: string]: {
    plugin: Plugin
    config: PluginConfig
  }
}
