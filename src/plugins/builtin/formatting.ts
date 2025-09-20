import { promises as fs } from 'fs'
import prettier from 'prettier'

import { OnFileWritePayload } from '../types'

export default {
  name: 'formatting-plugin',
  version: '1.0.0',
  description: 'Formats generated files using Prettier configuration',

  hooks: {
    onFileWrite: async (payload: OnFileWritePayload) => {
      if (!payload.writeLocation.match(/\.(ts|js|graphql|gql)$/)) {
        return payload
      }

      try {
        const content = await fs.readFile(payload.writeLocation, 'utf-8')

        const options = await prettier.resolveConfig(process.cwd())

        if (!options) {
          return payload
        }

        let parser = 'typescript'
        if (payload.writeLocation.match(/\.(graphql|gql)$/)) {
          parser = 'graphql'
        } else if (payload.writeLocation.endsWith('.js')) {
          parser = 'babel'
        }

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
