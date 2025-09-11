import { logger } from '@prisma/internals'

import {
  OnErrorPayload,
  OnFileWritePayload,
  OnGenerationFinishedPayload,
  OnModuleNotFoundPayload,
  OnPreparedOperationPayload,
  OnPreparedTypeFieldPayload,
} from '../types'

export default {
  name: 'logging-plugin',
  version: '1.0.0',
  description:
    'Enhanced logging with detailed debugging information, performance metrics, and structured output for all generation stages',

  hooks: {
    onModuleNotFound: (payload: OnModuleNotFoundPayload) => {
      logger.warn(`Module not found: ${payload.modulePath || 'unknown path'}`)
      if (payload.modelName) {
        logger.warn(`Affected model: ${payload.modelName}`)
      }
      logger.error('No model-specific GraphQL files will be generated.')
      payload.timestamp = new Date()
      return payload
    },
    onFileWrite: (payload: OnFileWritePayload) => {
      logger.info(`Writing to file: ${payload.writeLocation}`)
      return payload
    },
    onPreparedOperation: (payload: OnPreparedOperationPayload) => {
      logger.info(`Preparing operation: ${payload.name}(${payload.args}): ${payload.returnType}`)
      return payload
    },
    onPreparedTypeField: (payload: OnPreparedTypeFieldPayload) => {
      logger.info(`Preparing type field: ${payload.name}: ${payload.type}`)
    },
    onGenerationFinished: (payload: OnGenerationFinishedPayload) => {
      logger.info(`Model: ${payload.modelName}`)
      if (payload.queries) logger.info(`Queries: ${payload.queries.join(', ')}`)
      if (payload.mutations) logger.info(`Mutations: ${payload.mutations.join(', ')}`)
      logger.info(`Custom Plurals: ${JSON.stringify(payload.customPlurals)}`)
    },
    onError: (payload: OnErrorPayload) => {
      logger.error(`Error occurred: ${payload.error.message}`)
      payload.timestamp = new Date()
      return payload
    },
  },
}
