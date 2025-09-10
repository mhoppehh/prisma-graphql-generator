import { DMMF } from '@prisma/generator-helper'

// --- Core Generator Types ---
export interface GenerateModuleOptions {
  model: DMMF.Model
  queries: string[]
  mutations: string[]
  modulePath: string
  dmmf: DMMF.Document
  customPlurals?: Record<string, string>
}

export interface GeneratorConfig {
  modelName: string
  modulePath: string
  operations: string[]
  queries: string[]
  mutations: string[]
  presetUsed?: string
  timestamp?: string
  customPlurals?: Record<string, string>
}

export interface ExistingFiles {
  sdl: boolean
  resolver: boolean
  sdlPath?: string
  resolverPath?: string
}

// --- Template Data Types ---
export interface GraphQLField {
  name: string
  type: string
  directives?: string[]
  isRequired: boolean
  isList: boolean
}

export interface GraphQLTypes {
  input: GraphQLInputType[]
  output: GraphQLOutputType[]
}

export interface GraphQLInputType {
  name: string
  grouping?: string
  fields: GraphQLInputField[]
}

export interface GraphQLInputField {
  name: string
  type: string
  isRequired: boolean
  isNullable: boolean
}

export interface GraphQLOutputType {
  name: string
  fields: GraphQLOutputField[]
}

export interface GraphQLOutputField {
  name: string
  type: string
  args?: string
  isNullable: boolean
}

export interface Operation {
  name: string
  args: string
  returnType: string
  description: string
  operationType: string // e.g., 'create', 'update'
}

export interface HandlebarsTemplateData {
  modelName: string
  modelNameLower: string
  modelNameSingular: string
  modelNamePlural: string
  fields: GraphQLField[]
  queries: Operation[]
  mutations: Operation[]
  hasQueries: boolean
  hasMutations: boolean
  inputTypes: GraphQLInputType[]
  outputTypes: GraphQLOutputType[]
  hasInputTypes: boolean
  hasOutputTypes: boolean
  camelCase: (str: string) => string
  pascalCase: (str: string) => string
  dataSourceMethod?: string
  errorMessageTemplate?: string
}

// --- GraphQL AST Types ---
export interface GqlAttrsObject {
  ['@gqlIgnore']?: boolean
  ['@gqlType']?: string
  ['@gqlNonNullElement']?: boolean
}

export interface ItemType {
  dataType: string
  gqlAttrsObj: GqlAttrsObject
  isRequired: boolean
}

// --- Utility Types ---
export type OperationType =
  | 'findUnique'
  | 'findMany'
  | 'findFirst'
  | 'count'
  | 'aggregate'
  | 'groupBy'
export type MutationType =
  | 'create'
  | 'createMany'
  | 'update'
  | 'updateMany'
  | 'upsert'
  | 'delete'
  | 'deleteMany'

export const mapOperationToPrismaFunc = (operation: string): string => {
  const operationMap: Record<string, string> = {
    findUnique: 'findUnique',
    findMany: 'findMany',
    findFirst: 'findFirst',
    count: 'count',
    aggregate: 'aggregate',
    groupBy: 'groupBy',
    create: 'createOne',
    createMany: 'createMany',
    update: 'updateOne',
    updateMany: 'updateMany',
    upsert: 'upsertOne',
    delete: 'deleteOne',
    deleteMany: 'deleteMany',
  }
  return operationMap[operation] || ''
}
