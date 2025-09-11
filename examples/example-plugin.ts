import { 
  Plugin, 
} from '../src/plugins'

/**
 * Example plugin that demonstrates various plugin capabilities
 */
export const examplePlugin: Plugin = {
  name: 'example-plugin',
  version: '1.0.0',
  description: 'An example plugin demonstrating various hook usage patterns',

  hooks: {

  },
  initialize: async (pluginManager) => {
    console.log('🔌 Example plugin initialized')
    
    // Example: You could load configuration, set up resources, etc.
    // const config = await loadPluginConfig('example-plugin')
  },

  cleanup: async () => {
    console.log('🧹 Example plugin cleaned up')
    
    // Example: Clean up resources, close connections, etc.
  }
}

/**
 * Example of a configurable plugin factory
 */
export interface ExamplePluginConfig {
  addCustomField?: boolean
  customDirective?: string
  logLevel?: 'info' | 'debug' | 'warn'
}

export function createExamplePlugin(config: ExamplePluginConfig = {}): Plugin {
  const {
    addCustomField = true,
    customDirective = '@exampleDirective',
    logLevel = 'info'
  } = config

  const log = (level: string, message: string) => {
    if (logLevel === 'debug' || (logLevel === 'info' && level !== 'debug')) {
      console.log(`[${level.toUpperCase()}] Example plugin: ${message}`)
    }
  }

  return {
    ...examplePlugin,
    name: 'example-plugin-configured',
    
    hooks: {
      ...examplePlugin.hooks,
    }
  }
}

// Example usage:
// const myPlugin = createExamplePlugin({
//   addCustomField: true,
//   customDirective: '@myDirective',
//   logLevel: 'debug'
// })
// 
// pluginManager.register(myPlugin)
