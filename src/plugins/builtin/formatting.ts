import { promises as fs } from 'fs'
import prettier from 'prettier'

import { OnFileWritePayload } from '../types'

export default {
  name: 'formatting-plugin',
  version: '1.0.0',
  description: 'Formats generated files using Prettier configuration',

  hooks: {
    onFileWrite: async (payload: OnFileWritePayload) => {
      // Only format TypeScript and GraphQL files
      if (!payload.writeLocation.match(/\.(ts|js|graphql|gql)$/)) {
        return payload
      }

      try {
        // Read the file content that was just written
        const content = await fs.readFile(payload.writeLocation, 'utf-8')

        // Get prettier config
        const options = await prettier.resolveConfig(process.cwd())

        if (!options) {
          // No prettier config found, skip formatting
          return payload
        }

        // Determine parser based on file extension
        let parser = 'typescript'
        if (payload.writeLocation.match(/\.(graphql|gql)$/)) {
          parser = 'graphql'
        } else if (payload.writeLocation.endsWith('.js')) {
          parser = 'babel'
        }

        // Format the content
        const formatted = await prettier.format(content, {
          ...options,
          parser,
        })

        return { ...payload, content: formatted }
      } catch (error) {
        console.warn(`Failed to format file ${payload.writeLocation}:`, error)
      }
    },
  },
}
