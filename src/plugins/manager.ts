import { logger } from '@prisma/internals'
import {
  Plugin,
  PluginManager,
  PluginRegistry,
  HookName,
  HookPayloads,
  HookFunction,
} from './types'
import { PluginConfig } from './loader'
import { omit } from 'lodash'

/**
 * Default plugin manager implementation
 */
export class DefaultPluginManager implements PluginManager {
  private plugins: PluginRegistry = {}

  /**
   * Register a plugin with optional configuration
   */
  register(plugin: Plugin, config: PluginConfig): void {
    if (this.plugins[plugin.name]) {
      logger.warn(`Plugin '${plugin.name}' is already registered. Overwriting...`)
    }

    this.plugins[plugin.name] = {
      plugin,
      config,
    }
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
  executeHook<T extends HookName>(hookName: T, payload: HookPayloads[T]): HookPayloads[T] {
    const pluginsWithHook = Object.values(this.plugins)
      .filter(({ config }) => config.config?.enabled !== false)
      .filter(({ plugin }) => plugin?.hooks?.[hookName])

    if (pluginsWithHook.length === 0) {
      return payload
    }

    for (const { plugin } of pluginsWithHook) {
      try {
        const hookHandler = plugin.hooks![hookName]
        if (hookHandler) {
          const result = this.executeHookFunction<T>(hookHandler as any, payload, plugin.name)

          return omit(result, ['_metadata']) as HookPayloads[T]
        }
      } catch (error) {
        logger.error(`Error executing hook '${hookName}' in plugin '${plugin.name}':`, error)

        // Execute error hook if this isn't already an error hook
        if (hookName !== 'onError') {
          this.executeHook('onError', {
            ...payload,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }
    }

    return payload
  }

  /**
   * Execute a single hook function with proper error handling
   */
  private executeHookFunction<T extends HookName>(
    handler: HookFunction,
    payload: HookPayloads[T],
    pluginName: string,
  ): HookPayloads[T] {
    try {
      let result = handler(payload)
      result = omit(result, ['_metadata']) as HookPayloads[T]
      return result
    } catch (error) {
      logger.error(`Hook function in plugin '${pluginName}' threw an error:`, error)
      throw error
    }
  }

  getRegisteredPlugins(): Array<{ plugin: Plugin; config: PluginConfig }> {
    return Object.values(this.plugins)
  }

  async initializeAll(): Promise<void> {
    const enabledPlugins = Object.values(this.plugins).filter(
      ({ config }) => config?.config?.enabled !== false,
    )

    for (const { plugin } of enabledPlugins) {
      try {
        if (plugin.initialize) {
          await plugin.initialize(this)
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
    const enabledPlugins = Object.values(this.plugins).filter(
      ({ config }) => config?.config?.enabled !== false,
    )

    for (const { plugin } of enabledPlugins) {
      try {
        if (plugin.cleanup) {
          await plugin.cleanup()
        }
      } catch (error) {
        logger.error(`Failed to cleanup plugin '${plugin.name}':`, error)
      }
    }
  }
}

export const pluginManager = new DefaultPluginManager()

export function registerPlugin(plugin: Plugin, config: PluginConfig): void {
  pluginManager.register(plugin, config)
}

export function executeHook<T extends HookName>(
  hookName: T,
  context: HookPayloads[T],
): HookPayloads[T] {
  return pluginManager.executeHook<T>(hookName, context)
}
