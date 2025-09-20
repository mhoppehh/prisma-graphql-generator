import { 
  Plugin,
} from '../types'

/**
 * Configuration for the field transformation plugin
 */
export interface FieldTransformConfig {
  fieldNameTransforms?: Record<string, string>
  fieldDescriptions?: Record<string, string>
  fieldDirectives?: Record<string, string[]>
  excludeFields?: string[]
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
    
  }
}

/**
 * Helper function to create a configured field transform plugin
 */
export function createFieldTransformPlugin(config: FieldTransformConfig): Plugin {
  return {
    ...fieldTransformPlugin,
    initialize: async (pluginManager) => {
      const context = {
        stage: 'onGenerateStart' as const,
        timestamp: new Date(),
        metadata: { fieldTransformConfig: config }
      }
    }
  }
}
