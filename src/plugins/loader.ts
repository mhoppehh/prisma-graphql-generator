import { logger } from '@prisma/internals'
import { pluginManager } from './manager'
import { Plugin, PluginConfig } from './types'
import { loggingPlugin, validationPlugin, fieldTransformPlugin } from './builtin'

/**
 * Plugin loader configuration
 */
export interface PluginLoaderConfig {
  // Built-in plugins to auto-register
  builtinPlugins?: {
    logging?: boolean | PluginConfig
    validation?: boolean | PluginConfig
    fieldTransform?: boolean | PluginConfig
  }
  
  // Custom plugins to register
  customPlugins?: Array<{
    plugin: Plugin
    config?: PluginConfig
  }>
  
  // Plugin discovery settings
  discovery?: {
    // Scan for plugins in specific directories
    directories?: string[]
    // Plugin file patterns to look for
    patterns?: string[]
  }
}

/**
 * Plugin loader utility
 */
export class PluginLoader {
  private config: PluginLoaderConfig

  constructor(config: PluginLoaderConfig = {}) {
    this.config = config
  }

  /**
   * Load and register all configured plugins
   */
  async loadPlugins(): Promise<void> {
    logger.info('🔌 Loading plugins...')

    // Load built-in plugins
    await this.loadBuiltinPlugins()

    // Load custom plugins
    await this.loadCustomPlugins()

    // Auto-discover plugins (if configured)
    await this.discoverPlugins()

    const registeredPlugins = pluginManager.getRegisteredPlugins()
    logger.info(`🔌 Loaded ${registeredPlugins.length} plugin(s)`)
  }

  /**
   * Load built-in plugins based on configuration
   */
  private async loadBuiltinPlugins(): Promise<void> {
    const builtinConfig = this.config.builtinPlugins || {}

    // Logging plugin
    if (builtinConfig.logging !== false) {
      const config = typeof builtinConfig.logging === 'object' 
        ? builtinConfig.logging 
        : { enabled: true }
      
      pluginManager.register(loggingPlugin, config)
    }

    // Validation plugin
    if (builtinConfig.validation !== false) {
      const config = typeof builtinConfig.validation === 'object' 
        ? builtinConfig.validation 
        : { enabled: true }
      
      pluginManager.register(validationPlugin, config)
    }

    // Field transform plugin
    if (builtinConfig.fieldTransform) {
      const config = typeof builtinConfig.fieldTransform === 'object' 
        ? builtinConfig.fieldTransform 
        : { enabled: true }
      
      pluginManager.register(fieldTransformPlugin, config)
    }
  }

  /**
   * Load custom plugins from configuration
   */
  private async loadCustomPlugins(): Promise<void> {
    const customPlugins = this.config.customPlugins || []

    for (const { plugin, config } of customPlugins) {
      try {
        pluginManager.register(plugin, config || { enabled: true })
      } catch (error) {
        logger.error(`Failed to load custom plugin '${plugin.name}':`, error)
      }
    }
  }

  /**
   * Auto-discover plugins in specified directories
   */
  private async discoverPlugins(): Promise<void> {
    const discovery = this.config.discovery
    if (!discovery?.directories?.length) return

    logger.info('🔍 Auto-discovering plugins...')

    // Plugin discovery would be implemented here
    // This would scan directories for plugin files and load them
    // For now, this is a placeholder for future implementation
  }
}

/**
 * Default plugin loader instance
 */
export const defaultPluginLoader = new PluginLoader({
  builtinPlugins: {
    logging: true,
    validation: true,
    fieldTransform: false // Disabled by default as it requires configuration
  }
})

/**
 * Convenience function to load default plugins
 */
export async function loadDefaultPlugins(): Promise<void> {
  await defaultPluginLoader.loadPlugins()
}

/**
 * Convenience function to load plugins with custom configuration
 */
export async function loadPlugins(config: PluginLoaderConfig): Promise<void> {
  const loader = new PluginLoader(config)
  await loader.loadPlugins()
}
