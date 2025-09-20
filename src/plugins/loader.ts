import { logger } from '@prisma/internals'
import { pluginManager } from './manager'
import { Plugin } from './types'
import path from 'path'

export interface PluginConfig {
  name: string
  config: PluginOptions
}

export interface PluginOptions {
  enabled: boolean
  options?: Record<string, any>
}

export class PluginLoader {
  private plugins: Array<PluginConfig>

  constructor(plugins: Array<PluginConfig>) {
    this.plugins = plugins

    this.loadPlugins()
  }

  private async loadPlugins(): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        let actualPlugin: Plugin
        if (typeof plugin === 'string' || 'name' in plugin) {
          actualPlugin = await this.loadPluginFromPath(plugin)
        } else {
          actualPlugin = plugin
        }

        pluginManager.register(actualPlugin, plugin)
      } catch (error) {
        logger.error(`Failed to load custom plugin '${(plugin as any).name || plugin}':`, error)
      }
    }
  }

  private async loadPluginFromPath(pluginRef: string | PluginConfig): Promise<Plugin> {
    const name = typeof pluginRef === 'string' ? pluginRef : pluginRef.name
    const pluginPath = path.join(__dirname, 'builtin/', name + '.ts')

    try {
      const pluginModule = await import(pluginPath)

      const plugin = pluginModule.default || pluginModule[name] || pluginModule

      if (!plugin || !plugin.name) {
        throw new Error(`Invalid plugin format: ${pluginPath}`)
      }

      return plugin
    } catch (error) {
      throw new Error(`Failed to load plugin from '${pluginPath}': ${error}`)
    }
  }
}

export let pluginLoader = new PluginLoader([])

export async function loadPlugins(config: { plugins?: Array<PluginConfig> }): Promise<void> {
  if (config.plugins && config.plugins.length > 0) {
    pluginLoader = new PluginLoader(config.plugins)

    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
