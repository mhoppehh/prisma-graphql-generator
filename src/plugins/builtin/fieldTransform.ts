import { Plugin, HookContext, HookResult } from '../types'

/**
 * Configuration for the field transformation plugin
 */
export interface FieldTransformConfig {
  // Field name transformations
  fieldNameTransforms?: Record<string, string>
  // Add description to specific fields
  fieldDescriptions?: Record<string, string>
  // Add custom directives to fields
  fieldDirectives?: Record<string, string[]>
  // Exclude specific fields from generation
  excludeFields?: string[]
  // Transform field types
  typeTransforms?: Record<string, string>
}

/**
 * A plugin that allows transformation of fields during generation
 */
export const fieldTransformPlugin: Plugin = {
  name: 'field-transform-plugin',
  version: '1.0.0',
  description: 'Transforms model fields during generation with custom naming, types, and directives',

  hooks: {
    onTemplateDataPrepared: (context: HookContext): HookResult | void => {
      if (!context.templateData) return

      // Get plugin config from metadata (would be set during plugin registration)
      const config = context.metadata?.fieldTransformConfig as FieldTransformConfig | undefined
      if (!config) return

      // Transform fields
      const transformedFields = context.templateData.fields.map(field => {
        // Skip excluded fields
        if (config.excludeFields?.includes(field.name)) {
          return null
        }

        let transformedField = { ...field }

        // Transform field name
        if (config.fieldNameTransforms?.[field.name]) {
          transformedField.name = config.fieldNameTransforms[field.name]
        }

        // Transform field type
        if (config.typeTransforms?.[field.type]) {
          transformedField.type = config.typeTransforms[field.type]
        }

        // Add custom directives
        if (config.fieldDirectives?.[field.name]) {
          transformedField.directives = [
            ...(transformedField.directives || []),
            ...config.fieldDirectives[field.name]
          ]
        }

        return transformedField
      }).filter(Boolean) // Remove null fields (excluded ones)

      return {
        templateData: {
          ...context.templateData,
          fields: transformedFields as any[]
        }
      }
    },

    onSDLGenerated: (context: HookContext): HookResult | void => {
      if (!context.generatedContent) return

      // Get plugin config from metadata
      const config = context.metadata?.fieldTransformConfig as FieldTransformConfig | undefined
      if (!config?.fieldDescriptions) return

      let modifiedContent = context.generatedContent

      // Add field descriptions as comments
      Object.entries(config.fieldDescriptions).forEach(([fieldName, description]) => {
        const fieldPattern = new RegExp(`(\\s+)(${fieldName}):`, 'g')
        modifiedContent = modifiedContent.replace(fieldPattern, `$1# ${description}\n$1$2:`)
      })

      return {
        generatedContent: modifiedContent
      }
    }
  }
}

/**
 * Helper function to create a configured field transform plugin
 */
export function createFieldTransformPlugin(config: FieldTransformConfig): Plugin {
  return {
    ...fieldTransformPlugin,
    initialize: async (pluginManager) => {
      // Store config in metadata for hooks to access
      const context = {
        stage: 'onGenerateStart' as const,
        timestamp: new Date(),
        metadata: { fieldTransformConfig: config }
      }
      // This would ideally be stored in the plugin manager context
    }
  }
}
