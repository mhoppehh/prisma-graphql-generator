# Plugin and Hook System

The Prisma GraphQL Generator now includes a comprehensive plugin and hook system that allows you to intercept and modify the generation process at every stage.

## Overview

The plugin system provides hooks at key stages of the generation process:

- `onGenerateStart` - Called when generation begins
- `onConfigParsed` - Called after environment variables are parsed
- `onModelFound` - Called after the Prisma model is found
- `onOptionsCreated` - Called after GenerateModuleOptions is created
- `onTemplateDataPrepared` - Called after template data is prepared
- `onTypesGenerated` - Called after GraphQL types are generated
- `onSDLGenerated` - Called after SDL content is generated
- `onResolverGenerated` - Called after resolver content is generated
- `onFileWritten` - Called after a file is written
- `onGenerateComplete` - Called when generation is complete
- `onError` - Called when an error occurs

## Built-in Plugins

### Logging Plugin
Logs all generation stages for debugging purposes.

### Validation Plugin
Validates generated content and enforces model constraints.

### Field Transform Plugin
Transforms model fields during generation with custom naming, types, and directives.

## Creating Custom Plugins

```typescript
import { Plugin, HookContext, HookResult } from './src/plugins'

const myCustomPlugin: Plugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  description: 'My custom plugin description',

  hooks: {
    onModelFound: (context: HookContext): HookResult | void => {
      // Modify the model or add metadata
      if (context.model) {
        console.log(`Processing model: ${context.model.name}`)
      }
    },

    onSDLGenerated: (context: HookContext): HookResult | void => {
      // Modify the generated SDL content
      if (context.generatedContent) {
        const modifiedContent = context.generatedContent.replace(
          /type (\w+) {/g,
          'type $1 @customDirective {'
        )
        
        return {
          generatedContent: modifiedContent
        }
      }
    }
  },

  initialize: async (pluginManager) => {
    console.log('Plugin initialized')
  },

  cleanup: async () => {
    console.log('Plugin cleaned up')
  }
}
```

## Registering Plugins

### Using the Plugin Manager

```typescript
import { pluginManager } from './src/plugins'

// Register a plugin
pluginManager.register(myCustomPlugin, { enabled: true })

// Register with custom options
pluginManager.register(myCustomPlugin, { 
  enabled: true, 
  options: { customSetting: 'value' } 
})
```

### Using the Plugin Loader

```typescript
import { loadPlugins } from './src/plugins'

await loadPlugins({
  builtinPlugins: {
    logging: true,
    validation: { enabled: true },
    fieldTransform: false
  },
  customPlugins: [
    { plugin: myCustomPlugin, config: { enabled: true } }
  ]
})
```

## Hook Context

Each hook receives a `HookContext` object containing relevant data for that stage:

```typescript
interface HookContext {
  stage: HookName
  timestamp: Date
  generatorOptions?: GeneratorOptions
  config?: GeneratorConfig
  dmmf?: DMMF.Document
  model?: DMMF.Model
  moduleOptions?: GenerateModuleOptions
  templateData?: HandlebarsTemplateData
  graphqlTypes?: GraphQLTypes
  generatedContent?: string
  filePath?: string
  error?: Error
  metadata?: Record<string, any>
}
```

## Hook Results

Hooks can return a `HookResult` to modify the generation process:

```typescript
interface HookResult {
  continue?: boolean              // Whether to continue generation
  config?: GeneratorConfig        // Modified config
  model?: DMMF.Model             // Modified model
  moduleOptions?: GenerateModuleOptions  // Modified options
  templateData?: HandlebarsTemplateData  // Modified template data
  graphqlTypes?: GraphQLTypes     // Modified types
  generatedContent?: string       // Modified content
  metadata?: Record<string, any>  // Additional metadata
  skipSDLGeneration?: boolean     // Skip SDL generation
  skipResolverGeneration?: boolean // Skip resolver generation
  skipFileWrite?: boolean         // Skip file writing
}
```

## Example Use Cases

### Adding Custom Directives
```typescript
const directivePlugin: Plugin = {
  name: 'directive-plugin',
  hooks: {
    onSDLGenerated: (context) => {
      if (context.generatedContent) {
        // Add @auth directive to all mutations
        const modified = context.generatedContent.replace(
          /(extend type Mutation {[\s\S]*?)([\w]+)(\([^)]*\))?: ([^\n]+)/g,
          '$1$2$3: $4 @auth'
        )
        return { generatedContent: modified }
      }
    }
  }
}
```

### Field Filtering
```typescript
const fieldFilterPlugin: Plugin = {
  name: 'field-filter-plugin',
  hooks: {
    onTemplateDataPrepared: (context) => {
      if (context.templateData) {
        // Remove sensitive fields
        const filteredFields = context.templateData.fields.filter(
          field => !['password', 'secret'].includes(field.name)
        )
        return {
          templateData: {
            ...context.templateData,
            fields: filteredFields
          }
        }
      }
    }
  }
}
```

### Custom Validation
```typescript
const businessRulesPlugin: Plugin = {
  name: 'business-rules-plugin',
  hooks: {
    onModelFound: (context) => {
      if (context.model) {
        // Enforce business rules
        if (context.model.name === 'User' && !context.model.fields.find(f => f.name === 'email')) {
          throw new Error('User model must have an email field')
        }
      }
    }
  }
}
```

## Plugin Execution Order

Plugins are executed in the order they are registered. Each hook stage executes all registered plugins before moving to the next stage.

## Error Handling

If a plugin throws an error, the `onError` hook is executed for all plugins, and the original error is re-thrown unless handled by a plugin.

## Environment Variables for Plugin Configuration

You can configure plugins using environment variables:

```bash
# Disable built-in validation
GENERATOR_PLUGIN_VALIDATION_ENABLED=false

# Configure field transform plugin
GENERATOR_PLUGIN_FIELD_TRANSFORM_CONFIG='{"excludeFields":["internalId"]}'
```
