import { Plugin, HookContext, HookResult } from '../types'

/**
 * A validation plugin that checks generated content and model constraints
 */
export const validationPlugin: Plugin = {
  name: 'validation-plugin',
  version: '1.0.0',
  description: 'Validates generated content and enforces model constraints',

  hooks: {
    onConfigParsed: (context: HookContext): HookResult | void => {
      if (!context.config) return

      const errors: string[] = []

      // Validate model name
      if (!context.config.modelName || !/^[A-Z][a-zA-Z0-9]*$/.test(context.config.modelName)) {
        errors.push('Model name must start with uppercase letter and contain only alphanumeric characters')
      }

      // Validate module path
      if (!context.config.modulePath || context.config.modulePath.length === 0) {
        errors.push('Module path cannot be empty')
      }

      // Validate operations
      const validQueries = ['findUnique', 'findMany', 'findFirst', 'count', 'aggregate', 'groupBy']
      const validMutations = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']

      const invalidQueries = context.config.queries?.filter(q => !validQueries.includes(q)) || []
      const invalidMutations = context.config.mutations?.filter(m => !validMutations.includes(m)) || []

      if (invalidQueries.length > 0) {
        errors.push(`Invalid query operations: ${invalidQueries.join(', ')}`)
      }

      if (invalidMutations.length > 0) {
        errors.push(`Invalid mutation operations: ${invalidMutations.join(', ')}`)
      }

      if (errors.length > 0) {
        throw new Error(`Validation errors:\n${errors.map(e => `- ${e}`).join('\n')}`)
      }
    },

    onModelFound: (context: HookContext): HookResult | void => {
      if (!context.model) return

      const warnings: string[] = []

      // Check for model without ID field
      const hasIdField = context.model.fields.some(f => f.isId)
      if (!hasIdField) {
        warnings.push(`Model ${context.model.name} has no ID field`)
      }

      // Check for models with only scalar fields (might be missing relations)
      const hasRelationFields = context.model.fields.some(f => f.relationName)
      if (!hasRelationFields && context.model.fields.length > 1) {
        warnings.push(`Model ${context.model.name} has no relation fields`)
      }

      // Log warnings
      warnings.forEach(warning => {
        console.warn(`⚠️ Validation warning: ${warning}`)
      })
    },

    onSDLGenerated: (context: HookContext): HookResult | void => {
      if (!context.generatedContent) return

      try {
        // Basic SDL validation - check for required patterns
        const content = context.generatedContent

        // Ensure type definition exists
        if (!content.includes(`type ${context.moduleOptions?.model.name} {`)) {
          throw new Error('Generated SDL is missing main type definition')
        }

        // Ensure Query/Mutation extensions are valid if they exist
        if (content.includes('extend type Query') && !content.includes('Query {')) {
          throw new Error('Invalid Query extension in generated SDL')
        }

        if (content.includes('extend type Mutation') && !content.includes('Mutation {')) {
          throw new Error('Invalid Mutation extension in generated SDL')
        }

      } catch (error) {
        throw new Error(`SDL validation failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    },

    onResolverGenerated: (context: HookContext): HookResult | void => {
      if (!context.generatedContent) return

      try {
        // Basic resolver validation
        const content = context.generatedContent

        // Check for basic resolver structure
        if (!content.includes('resolvers') && !content.includes('Resolvers')) {
          throw new Error('Generated resolver is missing resolver export')
        }

        // Check for async function patterns if there are operations
        const hasQueries = context.moduleOptions?.queries.length && context.moduleOptions.queries.length > 0
        const hasMutations = context.moduleOptions?.mutations.length && context.moduleOptions.mutations.length > 0

        if ((hasQueries || hasMutations) && !content.includes('async ')) {
          console.warn('⚠️ Resolver may be missing async operations')
        }

      } catch (error) {
        throw new Error(`Resolver validation failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
}
