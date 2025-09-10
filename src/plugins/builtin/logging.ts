import { Plugin, HookContext } from '../types'
import { logger } from '@prisma/internals'

/**
 * A simple logging plugin that logs all generation stages
 */
export const loggingPlugin: Plugin = {
  name: 'logging-plugin',
  version: '1.0.0',
  description: 'Logs all generation stages for debugging purposes',

  hooks: {
    onGenerateStart: (context: HookContext) => {
      logger.info(`🚀 Generation started at ${context.timestamp}`)
      if (context.generatorOptions) {
        logger.info(`📦 Generator: ${context.generatorOptions.generator.name}`)
        logger.info(`📁 Output: ${context.generatorOptions.generator.output?.value}`)
      }
    },

    onConfigParsed: (context: HookContext) => {
      logger.info(`⚙️ Config parsed for model: ${context.config?.modelName}`)
      logger.info(`📂 Module path: ${context.config?.modulePath}`)
      logger.info(`🔍 Queries: ${context.config?.queries?.join(', ') || 'none'}`)
      logger.info(`✏️ Mutations: ${context.config?.mutations?.join(', ') || 'none'}`)
    },

    onModelFound: (context: HookContext) => {
      logger.info(`🎯 Model found: ${context.model?.name}`)
      logger.info(`📊 Fields count: ${context.model?.fields?.length || 0}`)
    },

    onOptionsCreated: (context: HookContext) => {
      logger.info(`🔧 Module options created for: ${context.moduleOptions?.model.name}`)
    },

    onTemplateDataPrepared: (context: HookContext) => {
      logger.info(`📝 Template data prepared`)
      if (context.templateData) {
        logger.info(`📊 Input types: ${context.templateData.inputTypes?.length || 0}`)
        logger.info(`📊 Output types: ${context.templateData.outputTypes?.length || 0}`)
      }
    },

    onTypesGenerated: (context: HookContext) => {
      logger.info(`🏗️ GraphQL types generated`)
      if (context.graphqlTypes) {
        logger.info(`📥 Input types: ${context.graphqlTypes.input.length}`)
        logger.info(`📤 Output types: ${context.graphqlTypes.output.length}`)
      }
    },

    onSDLGenerated: (context: HookContext) => {
      logger.info(`📄 SDL generated for: ${context.filePath}`)
      if (context.generatedContent) {
        const lines = context.generatedContent.split('\n').length
        logger.info(`📏 Content lines: ${lines}`)
      }
    },

    onResolverGenerated: (context: HookContext) => {
      logger.info(`🔗 Resolver generated for: ${context.filePath}`)
      if (context.generatedContent) {
        const lines = context.generatedContent.split('\n').length
        logger.info(`📏 Content lines: ${lines}`)
      }
    },

    onFileWritten: (context: HookContext) => {
      logger.info(`💾 File written: ${context.filePath}`)
    },

    onGenerateComplete: (context: HookContext) => {
      logger.info(`✅ Generation completed at ${context.timestamp}`)
    },

    onError: (context: HookContext) => {
      logger.error(`❌ Error occurred during ${context.stage}:`, context.error?.message)
    }
  }
}
