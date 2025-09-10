# Configuration System

The Prisma GraphQL Generator supports a configuration system that allows you to customize the code generation process. This replaces hardcoded values with configurable options.

## Configuration Methods

You can configure the generator using any of these methods (in order of priority):

1. **Environment Variables** (highest priority)
2. **Configuration Files**
3. **Default Values** (lowest priority)

## Environment Variables

### Generator Identity
```bash
GENERATOR_DEFAULT_OUTPUT="./src/generated"
```

### File Extensions
```bash
GENERATOR_GRAPHQL_EXT=".gql"
GENERATOR_RESOLVER_EXT=".resolvers.ts"
```

### Template Paths
```bash
GENERATOR_GRAPHQL_TEMPLATE="custom-templates/schema.hbs"
GENERATOR_RESOLVER_TEMPLATE="custom-templates/resolvers.hbs"
```

### Data Source Configuration
```bash
GENERATOR_DATA_SOURCE_METHOD="context.prisma"
```

### Configuration File Path
```bash
GENERATOR_CONFIG_PATH="./my-config.json"
```

## Configuration Files

### JSON Configuration
Create a `generator.config.json` file in your project root:

```json
{
  "generator": {
    "prettyName": "My Custom GraphQL Generator",
    "defaultOutput": "./generated"
  },
  "files": {
    "extensions": {
      "graphql": ".graphql",
      "resolver": ".resolvers.ts"
    },
    "templates": {
      "graphqlTemplate": "custom-templates/schema.hbs",
      "resolverTemplate": "custom-templates/resolvers.hbs"
    },
    "baseGraphqlPath": "src/schema/base.graphql"
  },
  "content": {
    "fallbackMessages": {
      "basic": "// Custom fallback message",
      "withOperations": "// Custom fallback with operations"
    },
    "resolverImplementation": {
      "dataSourceMethod": "context.prisma",
      "errorMessageTemplate": "Operation {operationName} is not implemented"
    }
  },
  "typeMappings": {
    "prismaToGraphQL": {
      "DateTime": "Date",
      "Json": "JSONObject"
    }
  }
}
```

### TypeScript Configuration
Create a `generator.config.ts` file:

```typescript
import { GeneratorConfig } from '@your-org/prisma-graphql-generator'

const config: Partial<GeneratorConfig> = {
  generator: {
    prettyName: 'TypeScript GraphQL Generator',
    defaultOutput: './src/generated'
  },
  content: {
    resolverImplementation: {
      dataSourceMethod: 'context.dataSources.db()',
      errorMessageTemplate: 'Resolver for {operationName} needs implementation'
    }
  },
  typeMappings: {
    prismaToGraphQL: {
      DateTime: 'Date',
      Json: 'JSONObject'
    }
  }
}

export default config
```

## Configuration Options

### Generator Identity
- `prettyName`: Display name for the generator
- `defaultOutput`: Default output directory

### File Configuration
- `extensions.graphql`: GraphQL file extension (default: `.graphql`)
- `extensions.resolver`: Resolver file extension (default: `.resolver.ts`)
- `templates.graphqlTemplate`: Path to GraphQL template
- `templates.resolverTemplate`: Path to resolver template
- `fallbackFiles.schemaTs`: Fallback TypeScript schema filename
- `fallbackFiles.schemaGraphql`: Fallback GraphQL schema filename
- `fallbackFiles.optionsJson`: Options JSON filename
- `baseGraphqlPath`: Path to base GraphQL file for enums

### Content Configuration
- `fallbackMessages.basic`: Message for basic fallback generation
- `fallbackMessages.withOperations`: Message for fallback with operations
- `resolverImplementation.dataSourceMethod`: How to access the data source in resolvers
- `resolverImplementation.errorMessageTemplate`: Template for unimplemented resolver errors

### Type Mappings
- `prismaToGraphQL`: Mapping from Prisma types to GraphQL types

### Environment Variables (used in templates)
- `envVars.model`: Environment variable name for model (default: `GENERATOR_MODEL`)
- `envVars.modulePath`: Environment variable name for module path
- `envVars.operations`: Environment variable name for operations
- `envVars.queries`: Environment variable name for queries
- `envVars.mutations`: Environment variable name for mutations
- `envVars.presetUsed`: Environment variable name for preset
- `envVars.timestamp`: Environment variable name for timestamp
- `envVars.customPlurals`: Environment variable name for custom plurals

## Migration from Hardcoded Values

The following hardcoded values have been extracted into configuration:

### Before (Hardcoded)
```typescript
// File extensions were hardcoded
const sdlPath = path.join(modulePath, `${model.name}.graphql`)
const resolverPath = path.join(modulePath, `${model.name}.resolver.ts`)

// Template paths were hardcoded
'templates/handlebars/module.graphql.hbs'
'templates/handlebars/module.resolver.ts.hbs'

// Data source method was hardcoded
'context.dataSources.prisma()'

// Error messages were hardcoded
'{{name}} resolver not implemented'

// Type mappings were hardcoded
const typeMap = { Int: 'Int', String: 'String', ... }
```

### After (Configurable)
```typescript
// File extensions from config
const configData = generatorConfig.getConfig()
const sdlPath = path.join(modulePath, `${model.name}${configData.files.extensions.graphql}`)
const resolverPath = path.join(modulePath, `${model.name}${configData.files.extensions.resolver}`)

// Template paths from config
configData.files.templates.graphqlTemplate
configData.files.templates.resolverTemplate

// Data source method from config
configData.content.resolverImplementation.dataSourceMethod

// Error messages from config
configData.content.resolverImplementation.errorMessageTemplate

// Type mappings from config
configData.typeMappings.prismaToGraphQL[type] || type
```

## Usage Examples

### 1. Using with Different File Extensions
```bash
GENERATOR_GRAPHQL_EXT=".gql"
GENERATOR_RESOLVER_EXT=".resolvers.ts"
```

### 2. Using Custom Data Source
```bash
GENERATOR_DATA_SOURCE_METHOD="context.db"
```

### 3. Using Custom Templates
Create your own Handlebars templates and configure their paths:
```json
{
  "files": {
    "templates": {
      "graphqlTemplate": "my-templates/custom-schema.hbs",
      "resolverTemplate": "my-templates/custom-resolvers.hbs"
    }
  }
}
```

### 4. Using Different Type Mappings
```json
{
  "typeMappings": {
    "prismaToGraphQL": {
      "DateTime": "Date",
      "Json": "JSONObject",
      "Decimal": "BigInt"
    }
  }
}
```

## Debugging Configuration

Use the debug utility to see your active configuration:

```typescript
import { debugConfiguration } from './src/config/config.utils'
import { config } from './src/config/generator.config'

debugConfiguration(config.getConfig())
```

This will output all active configuration values to help you verify your setup.

## Validation

The configuration system includes validation to ensure your configuration is valid:

```typescript
import { validateConfiguration } from './src/config/config.utils'

const errors = validateConfiguration(yourConfig)
if (errors.length > 0) {
  console.error('Configuration errors:', errors)
}
```

## Benefits

1. **Flexibility**: Customize any aspect of code generation
2. **Multiple Environments**: Different configs for dev/staging/prod
3. **Team Consistency**: Share configuration files via version control
4. **Future-Proof**: Easy to add new configuration options
5. **Backward Compatible**: All defaults match previous hardcoded behavior
