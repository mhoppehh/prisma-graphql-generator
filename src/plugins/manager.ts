import { logger } from '@prisma/internals'
import {
  Plugin,
  PluginConfig,
  PluginManager,
  PluginRegistry,
  HookName,
  HookContext,
  HookResult,
  HookFunction
} from './types'

/**
 * Default plugin manager implementation
 */
export class DefaultPluginManager implements PluginManager {
  private plugins: PluginRegistry = {}

  /**
   * Register a plugin with optional configuration
   */
  register(plugin: Plugin, config: PluginConfig = { enabled: true }): void {
    if (this.plugins[plugin.name]) {
      logger.warn(`Plugin '${plugin.name}' is already registered. Overwriting...`)
    }

    this.plugins[plugin.name] = {
      plugin,
      config
    }

    logger.info(`Plugin '${plugin.name}' registered successfully`)
  }

  /**
   * Unregister a plugin by name
   */
  unregister(name: string): void {
    if (!this.plugins[name]) {
      logger.warn(`Plugin '${name}' is not registered`)
      return
    }

    delete this.plugins[name]
    logger.info(`Plugin '${name}' unregistered successfully`)
  }

  /**
   * Check if a plugin is registered
   */
  isRegistered(name: string): boolean {
    return name in this.plugins
  }

  /**
   * Get a registered plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins[name]?.plugin
  }

  /**
   * Execute a specific hook with all registered plugins
   */
  async executeHook(hookName: HookName, context: HookContext): Promise<HookContext> {
    let modifiedContext = { ...context }

    // Get all enabled plugins that have handlers for this hook
    const pluginsWithHook = Object.values(this.plugins)
      .filter(({ config }) => config.enabled)
      .filter(({ plugin }) => plugin.hooks?.[hookName])

    if (pluginsWithHook.length === 0) {
      return modifiedContext
    }

    logger.info(`Executing hook '${hookName}' for ${pluginsWithHook.length} plugin(s)`)

    for (const { plugin } of pluginsWithHook) {
      try {
        const hookHandlers = plugin.hooks![hookName]
        const handlers = Array.isArray(hookHandlers) ? hookHandlers : [hookHandlers!]

        for (const handler of handlers) {
          const result = await this.executeHookFunction(handler, modifiedContext, plugin.name)
          if (result) {
            modifiedContext = this.mergeHookResult(modifiedContext, result)
            
            // If a plugin wants to stop the process
            if (result.continue === false) {
              logger.info(`Plugin '${plugin.name}' requested to stop generation process`)
              break
            }
          }
        }
      } catch (error) {
        logger.error(`Error executing hook '${hookName}' in plugin '${plugin.name}':`, error)
        
        // Execute error hook if this isn't already an error hook
        if (hookName !== 'onError') {
          await this.executeHook('onError', {
            ...modifiedContext,
            stage: 'onError',
            error: error instanceof Error ? error : new Error(String(error))
          })
        }
      }
    }

    return modifiedContext
  }

  /**
   * Execute a single hook function with proper error handling
   */
  private async executeHookFunction(
    handler: HookFunction,
    context: HookContext,
    pluginName: string
  ): Promise<HookResult | void> {
    try {
      return await handler(context)
    } catch (error) {
      logger.error(`Hook function in plugin '${pluginName}' threw an error:`, error)
      throw error
    }
  }

  /**
   * Merge hook result into context
   */
  private mergeHookResult(context: HookContext, result: HookResult): HookContext {
    const mergedContext = { ...context }

    // Merge all modifiable properties
    if (result.config) mergedContext.config = result.config
    if (result.model) mergedContext.model = result.model
    if (result.moduleOptions) mergedContext.moduleOptions = result.moduleOptions
    if (result.templateData) mergedContext.templateData = result.templateData
    if (result.graphqlTypes) mergedContext.graphqlTypes = result.graphqlTypes
    if (result.generatedContent) mergedContext.generatedContent = result.generatedContent

    // Merge metadata
    if (result.metadata) {
      mergedContext.metadata = {
        ...mergedContext.metadata,
        ...result.metadata
      }
    }

    return mergedContext
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): Array<{ plugin: Plugin; config: PluginConfig }> {
    return Object.values(this.plugins)
  }

  /**
   * Initialize all registered plugins
   */
  async initializeAll(): Promise<void> {
    const enabledPlugins = Object.values(this.plugins)
      .filter(({ config }) => config.enabled)

    logger.info(`Initializing ${enabledPlugins.length} plugin(s)`)

    for (const { plugin } of enabledPlugins) {
      try {
        if (plugin.initialize) {
          await plugin.initialize(this)
          logger.info(`Plugin '${plugin.name}' initialized successfully`)
        }
      } catch (error) {
        logger.error(`Failed to initialize plugin '${plugin.name}':`, error)
      }
    }
  }

  /**
   * Cleanup all registered plugins
   */
  async cleanupAll(): Promise<void> {
    const enabledPlugins = Object.values(this.plugins)
      .filter(({ config }) => config.enabled)

    logger.info(`Cleaning up ${enabledPlugins.length} plugin(s)`)

    for (const { plugin } of enabledPlugins) {
      try {
        if (plugin.cleanup) {
          await plugin.cleanup()
          logger.info(`Plugin '${plugin.name}' cleaned up successfully`)
        }
      } catch (error) {
        logger.error(`Failed to cleanup plugin '${plugin.name}':`, error)
      }
    }
  }
}

/**
 * Global plugin manager instance
 */
export const pluginManager = new DefaultPluginManager()

/**
 * Convenience function to register a plugin
 */
export function registerPlugin(plugin: Plugin, config?: PluginConfig): void {
  pluginManager.register(plugin, config)
}

/**
 * Convenience function to execute a hook
 */
export async function executeHook(hookName: HookName, context: HookContext): Promise<HookContext> {
  return pluginManager.executeHook(hookName, context)
}
