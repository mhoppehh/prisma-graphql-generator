import { Plugin, HookContext, HookResult } from '../src/plugins'

/**
 * Example plugin that demonstrates various plugin capabilities
 */
export const examplePlugin: Plugin = {
  name: 'example-plugin',
  version: '1.0.0',
  description: 'An example plugin demonstrating various hook usage patterns',

  hooks: {
    onGenerateStart: (context: HookContext) => {
      console.log('🚀 Example plugin: Generation started')
      
      // Add custom metadata
      return {
        metadata: {
          examplePluginStartTime: Date.now()
        }
      }
    },

    onConfigParsed: (context: HookContext): HookResult | void => {
      console.log('⚙️ Example plugin: Config parsed')
      
      if (!context.config) return

      // Example: Automatically add 'findMany' query if not present
      if (!context.config.queries.includes('findMany')) {
        return {
          config: {
            ...context.config,
            queries: [...context.config.queries, 'findMany']
          }
        }
      }
    },

    onModelFound: (context: HookContext): HookResult | void => {
      console.log(`🎯 Example plugin: Processing model ${context.model?.name}`)
      
      if (!context.model) return

      // Example: Add a computed field to the model
      const computedField = {
        name: 'computedDisplayName',
        type: 'String',
        isOptional: true,
        isList: false,
        isId: false,
        isUnique: false,
        isUpdatedAt: false,
        kind: 'scalar' as const,
        documentation: 'A computed display name field added by example plugin'
      }

      return {
        model: {
          ...context.model,
          fields: [...context.model.fields, computedField as any]
        }
      }
    },

    onTemplateDataPrepared: (context: HookContext): HookResult | void => {
      console.log('📝 Example plugin: Template data prepared')
      
      if (!context.templateData) return

      // Example: Add a custom field to template data
      const customField = {
        name: 'exampleCustomField',
        type: 'String!',
        directives: ['@example'],
        isRequired: true,
        isList: false
      }

      return {
        templateData: {
          ...context.templateData,
          fields: [...context.templateData.fields, customField]
        }
      }
    },

    onSDLGenerated: (context: HookContext): HookResult | void => {
      console.log('📄 Example plugin: SDL generated')
      
      if (!context.generatedContent) return

      // Example: Add custom directive to the main type
      const modelName = context.moduleOptions?.model.name
      if (modelName) {
        const modifiedContent = context.generatedContent.replace(
          `type ${modelName} {`,
          `type ${modelName} @exampleDirective {`
        )

        return {
          generatedContent: modifiedContent
        }
      }
    },

    onResolverGenerated: (context: HookContext): HookResult | void => {
      console.log('🔗 Example plugin: Resolver generated')
      
      if (!context.generatedContent) return

      // Example: Add custom resolver logic
      const customResolver = `
  // Custom resolver added by example plugin
  exampleCustomField: async (parent, args, context) => {
    return \`\${parent.id}-\${parent.name}\`
  },`

      // Insert custom resolver before the closing brace
      const modifiedContent = context.generatedContent.replace(
        /(\s*)(}\s*export)/, 
        `$1${customResolver}\n$1$2`
      )

      return {
        generatedContent: modifiedContent
      }
    },

    onFileWritten: (context: HookContext) => {
      console.log(`💾 Example plugin: File written ${context.filePath}`)
    },

    onGenerateComplete: (context: HookContext) => {
      const startTime = context.metadata?.examplePluginStartTime
      if (startTime) {
        const duration = Date.now() - startTime
        console.log(`✅ Example plugin: Generation completed in ${duration}ms`)
      }
    },

    onError: (context: HookContext) => {
      console.error(`❌ Example plugin: Error during ${context.stage}:`, context.error?.message)
    }
  },

  initialize: async (pluginManager) => {
    console.log('🔌 Example plugin initialized')
    
    // Example: You could load configuration, set up resources, etc.
    // const config = await loadPluginConfig('example-plugin')
  },

  cleanup: async () => {
    console.log('🧹 Example plugin cleaned up')
    
    // Example: Clean up resources, close connections, etc.
  }
}

/**
 * Example of a configurable plugin factory
 */
export interface ExamplePluginConfig {
  addCustomField?: boolean
  customDirective?: string
  logLevel?: 'info' | 'debug' | 'warn'
}

export function createExamplePlugin(config: ExamplePluginConfig = {}): Plugin {
  const {
    addCustomField = true,
    customDirective = '@exampleDirective',
    logLevel = 'info'
  } = config

  const log = (level: string, message: string) => {
    if (logLevel === 'debug' || (logLevel === 'info' && level !== 'debug')) {
      console.log(`[${level.toUpperCase()}] Example plugin: ${message}`)
    }
  }

  return {
    ...examplePlugin,
    name: 'example-plugin-configured',
    
    hooks: {
      ...examplePlugin.hooks,
      
      onSDLGenerated: (context: HookContext): HookResult | void => {
        log('info', 'SDL generated')
        
        if (!context.generatedContent || !addCustomField) return

        const modelName = context.moduleOptions?.model.name
        if (modelName) {
          const modifiedContent = context.generatedContent.replace(
            `type ${modelName} {`,
            `type ${modelName} ${customDirective} {`
          )

          return {
            generatedContent: modifiedContent
          }
        }
      }
    }
  }
}

// Example usage:
// const myPlugin = createExamplePlugin({
//   addCustomField: true,
//   customDirective: '@myDirective',
//   logLevel: 'debug'
// })
// 
// pluginManager.register(myPlugin)
