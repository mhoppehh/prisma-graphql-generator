import { GeneratorConfig } from './config'

// Example TypeScript configuration - only override what you need to change
const config: GeneratorConfig = {
  generator: {
    prettyName: 'Prisma GraphQL Generator',
    defaultOutput: '../generated'
  },

  files: {
    extensions: {
      graphql: '.graphql',
      resolver: '.resolver.ts'
    },
    templates: {
      graphqlTemplate: 'templates/handlebars/module.graphql.hbs',
      resolverTemplate: 'templates/handlebars/module.resolver.ts.hbs'
    },
    fallbackFiles: {
      schemaTs: 'schema.ts',
      schemaGraphql: 'schema.graphql',
      optionsJson: 'options.json'
    },
    baseGraphqlPath: 'src/subgraphs/base.graphql',
    baseModulePath: 'src/subgraphs/',
    presetsFilePath: 'prisma/presets.json'
  },

  envVars: {
    model: 'GENERATOR_MODEL',
    modulePath: 'GENERATOR_MODULE_PATH',
    operations: 'GENERATOR_OPERATIONS',
    queries: 'GENERATOR_QUERIES',
    mutations: 'GENERATOR_MUTATIONS',
    presetUsed: 'GENERATOR_PRESET_USED',
    timestamp: 'GENERATOR_TIMESTAMP',
    customPlurals: 'GENERATOR_CUSTOM_PLURALS'
  },

  content: {
    fallbackMessages: {
      basic: '// GraphQL generator fallback - please use specific model generation',
      withOperations: '// GraphQL generator fallback - please use specific model generation with queries or mutations'
    },
    resolverImplementation: {
      dataSourceMethod: 'context.dataSources.prisma()',
      errorMessageTemplate: '{operationName} resolver not implemented'
    }
  },

  typeMappings: {
    prismaToGraphQL: {
      Int: 'Int',
      String: 'String',
      Boolean: 'Boolean',
      Float: 'Float',
      DateTime: 'DateTime',
      Json: 'JSON',
      Decimal: 'Float',
      BigInt: 'BigInt',
      Bytes: 'Bytes'
    }
  }
}

export default config
