import { GeneratorConfig } from './src/config/generator.config'

// Example TypeScript configuration - only override what you need to change
const config: Partial<GeneratorConfig> = {
  generator: {
    prettyName: 'TypeScript GraphQL Generator',
    defaultOutput: './src/generated'
  },
  content: {
    fallbackMessages: {
      basic: '// Custom fallback message for basic generation',
      withOperations: '// Custom fallback message when operations are specified'
    },
    resolverImplementation: {
      dataSourceMethod: 'context.dataSources.db()',
      errorMessageTemplate: 'Resolver for {operationName} needs implementation'
    }
  },
  typeMappings: {
    prismaToGraphQL: {
      Int: 'Int',
      String: 'String',
      Boolean: 'Boolean',
      Float: 'Float',
      DateTime: 'Date',
      Json: 'JSONObject',
      Decimal: 'Float',
      BigInt: 'BigInt',
      Bytes: 'Bytes'
    }
  }
}

export default config
