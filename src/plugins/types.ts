import { DMMF } from '@prisma/generator-helper'
import {
  GenerateModuleOptions,
  GeneratorConfig,
  Operation,
  GraphQLInputField,
  GraphQLInputType,
} from '../types/newTypes'
import { PluginConfig } from './loader'

export interface HookPayloads {
  onModuleNotFound: OnModuleNotFoundPayload
  onError: OnErrorPayload
  onGenerationFinished: OnGenerationFinishedPayload
  onFileWrite: OnFileWritePayload
  onUpdateFile: OnUpdateFilePayload
  onCompileTemplate: OnCompileTemplatePayload
  onPreparedOperation: OnPreparedOperationPayload
  onPreparedTypeField: OnPreparedTypeFieldPayload
  onPreparedType: OnPreparedTypePayload
}

export type HookName = keyof HookPayloads

export type HookFunction = <T extends HookName>(context: HookPayloads[T]) => HookPayloads[T]

export interface HookPayload {
  timestamp?: Date
}

export interface OnModuleNotFoundPayload extends HookPayload {
  modulePath?: string
  modelName?: string
}

export interface OnErrorPayload extends HookPayload {
  error: Error
}

export interface OnGenerationFinishedPayload extends HookPayload {
  modelName?: string
  modulePath?: string
  queries?: string[]
  mutations?: string[]
  customPlurals?: Record<string, string>
}

export interface OnFileWritePayload extends HookPayload {
  writeLocation: string
  content: any
}

export interface OnUpdateFilePayload extends HookPayload {
  sdlPath: string
  options: GenerateModuleOptions
  config: GeneratorConfig
}

export interface OnCompileTemplatePayload extends HookPayload {
  resolverPath: string
  template: string
  options: GenerateModuleOptions
  config: GeneratorConfig
}

export interface OnPreparedOperationPayload extends HookPayload, Operation {
  _metadata: {
    operationFieldType: DMMF.SchemaField
  }
}

export interface OnPreparedTypeFieldPayload extends HookPayload, GraphQLInputField {
  _metadata?: {
    typeCategory?: string
  }
}

export interface OnPreparedTypePayload extends HookPayload, GraphQLInputType {
  _metadata: {
    typeCategory: string
  }
}

export interface Plugin {
  name: string
  version?: string
  description?: string
  hooks?: Partial<{
    [K in HookName]: (context: HookPayloads[K]) => HookPayloads[K]
  }>
  initialize?: (pluginManager: PluginManager) => Promise<void> | void
  cleanup?: () => Promise<void> | void
}

export interface PluginManager {
  register(plugin: Plugin, config?: PluginConfig): void
  unregister(name: string): void
  isRegistered(name: string): boolean
  getPlugin(name: string): Plugin | undefined

  executeHook<T extends HookName>(hookName: T, context: HookPayloads[T]): HookPayloads[T]

  getRegisteredPlugins(): Array<{ plugin: Plugin; config: PluginConfig }>

  initializeAll(): Promise<void>
  cleanupAll(): Promise<void>
}

export interface PluginRegistry {
  [pluginName: string]: {
    plugin: Plugin
    config: PluginConfig
  }
}
