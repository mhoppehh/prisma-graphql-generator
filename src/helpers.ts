import fs from 'fs/promises'
import { parse, print, visit } from 'graphql'
import Handlebars from 'handlebars'
import path from 'path'
import { Project, SyntaxKind } from 'ts-morph'

import { DMMF } from '@prisma/generator-helper'

import {
  GenerateModuleOptions,
  GraphQLField,
  GraphQLInputType,
  GraphQLOutputType,
  HandlebarsTemplateData,
  GqlAttrsObject,
  ItemType,
  Operation,
  mapOperationToPrismaFunc,
  GraphQLTypes,
  GeneratorConfig,
  GraphQLInputField,
} from './types/newTypes'
import { config as generatorConfig } from './config/config'
import { fileExists } from './utils/fileExists'
import { COMMON_PLURALS, pascalCase, pluralize, singularize } from './utils/strings'
import { writeFileSafely } from './utils/writeFileSafely'
import { executeHook } from './plugins'

Handlebars.registerHelper('eq', function (a, b) {
  return a === b
})

Handlebars.registerHelper('camelCase', function (str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1)
})

Handlebars.registerHelper('pascalCase', function (str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

const getGqlAttrs = (item: DMMF.Field): GqlAttrsObject => {
  const attrs = item.documentation?.split(' ')
  if (!attrs) {
    return {} as GqlAttrsObject
  }
  const isNonNullElement = item.documentation?.includes('@gqlNonNullElement')
  return {
    [attrs[0]]: attrs[1] || true,
    ['@gqlNonNullElement']: isNonNullElement,
  }
}

const createDataType = (data: string): string => {
  if (data === 'Decimal') return 'Float'
  if (data === 'Bytes') return 'Byte'
  if (data === 'Unsupported') return 'String'
  return data
}

const createType = (item: DMMF.Field): ItemType | null => {
  const gqlAttrsObj = getGqlAttrs(item)
  const { isRequired } = item

  if (gqlAttrsObj['@gqlIgnore']) {
    return null
  }
  if (gqlAttrsObj['@gqlType']) {
    return {
      dataType: gqlAttrsObj['@gqlType'],
      gqlAttrsObj,
      isRequired,
    }
  }
  const dataType = createDataType(item.type)
  return {
    dataType,
    gqlAttrsObj,
    isRequired,
  }
}

const createList = (itemType: ItemType, item: DMMF.Field): string => {
  const requiredSuffix = itemType.isRequired ? '!' : ''
  const nonNullSuffix = itemType.gqlAttrsObj['@gqlNonNullElement'] ? '!' : ''
  if (item.isList) {
    return `[${itemType.dataType}${nonNullSuffix}]${requiredSuffix}`
  }
  return `${itemType.dataType}${requiredSuffix}`
}

// --- Template Data Preparation ---
const prepareFieldsData = (model: DMMF.Model): GraphQLField[] => {
  return model.fields
    .map(field => {
      const itemType = createType(field)
      if (!itemType) return null

      const graphqlField: GraphQLField = {
        name: field.name,
        type: createList(itemType, field),
        isRequired: field.isRequired,
        isList: field.isList,
        // directives: field.isId
        //   ? ['@id']
        //   : field.isUnique
        //     ? ['@unique']
        //     : undefined,
      }
      return graphqlField
    })
    .filter((field): field is GraphQLField => field !== null)
}

// --- Input/Output Type Processing ---
const mapPrismaTypeToGraphQL = (type: string): string => {
  const configData = generatorConfig.getConfig()
  return configData.typeMappings.prismaToGraphQL[type] || type
}

// Helper function to add enum types to base.graphql
const addEnumToBase = async (enumName: string, dmmf: DMMF.Document): Promise<void> => {
  const configData = generatorConfig.getConfig()
  // Path relative to the project root
  const baseGraphQLPath = path.resolve(process.cwd(), configData.files.baseGraphqlPath)

  try {
    console.log(`🔍 Attempting to add enum ${enumName} to ${baseGraphQLPath}`)

    // Find the enum definition in DMMF
    const enumTypes = dmmf.schema.enumTypes.prisma || []
    const enumDef = enumTypes.find((e: any) => e.name === enumName)

    if (!enumDef) {
      console.warn(`Enum ${enumName} not found in DMMF`)
      return
    }

    // Read current base.graphql
    const currentContent = await fs.readFile(baseGraphQLPath, 'utf-8')
    console.log(`📄 Current file length: ${currentContent.length}`)
    console.log(`📄 Current content preview: ${currentContent.substring(0, 100)}...`)

    // Check if enum already exists
    if (currentContent.includes(`enum ${enumName}`)) {
      console.log(`⚠️ Enum ${enumName} already exists, skipping`)
      return // Enum already exists
    }

    // Generate enum definition
    const enumDefinition = `
enum ${enumName} {
${enumDef.values.map((value: string) => `  ${value}`).join('\n')}
}
`

    // Add enum to the file (preserve original content and append)
    const updatedContent = currentContent.trimEnd() + '\n' + enumDefinition
    console.log(`📝 Writing updated content, new length: ${updatedContent.length}`)

    await fs.writeFile(baseGraphQLPath, updatedContent, 'utf-8')
    console.log(`✅ Added enum ${enumName} to base.graphql`)
  } catch (error) {
    console.error(`Failed to add enum ${enumName} to base.graphql:`, error)
  }
}

const selectPreferredInputType = (inputTypeOptions: any[]): any => {
  const scalarNonNull = inputTypeOptions.find(
    option => option.location === 'scalar' && option.type !== 'Null',
  )
  if (scalarNonNull) return scalarNonNull

  const nonNull = inputTypeOptions.find(option => option.type !== 'Null')
  if (nonNull) return nonNull

  return inputTypeOptions[0]
}

const prepareTypesData = async (
  dmmf: DMMF.Document,
  modelName: string,
  queries: string[],
  mutations: string[],
  returnTypes: string[],
): Promise<GraphQLTypes> => {
  const processedTypes = new Set<string>()
  const inputTypes: GraphQLInputType[] = []
  const outputTypes: GraphQLOutputType[] = []
  const neededEnums = new Set<string>()

  // Helper function to recursively process input types
  const processType = (
    typeName: string,
    typeCategory: 'input' | 'output',
    namespace?: string,
  ): void => {
    if (processedTypes.has(typeName)) return

    // Find the input type definition
    let inputObjectTypes: any[] = []
    if (namespace) {
      inputObjectTypes =
        typeCategory === 'input'
          ? (dmmf.schema.inputObjectTypes as any)[namespace] || []
          : (dmmf.schema.outputObjectTypes as any)[namespace] || []
    } else {
      // Check all namespaces when namespace is undefined
      const allTypes =
        typeCategory === 'input'
          ? (dmmf.schema.inputObjectTypes as any)
          : (dmmf.schema.outputObjectTypes as any)
      inputObjectTypes = Object.values(allTypes).flat()
    }

    const inputType = inputObjectTypes.find((type: any) => type.name === typeName)

    if (!inputType) return

    processedTypes.add(typeName)

    let graphqlType: GraphQLInputType = {
      name: inputType.name,
      grouping: inputType?.meta?.grouping,
      fields: inputType.fields.map((field: any) => {
        let preferredType: any
        if (typeCategory === 'input') {
          preferredType = selectPreferredInputType(field.inputTypes)
        } else {
          preferredType = field.outputType
        }

        if (preferredType.location === 'enumTypes') {
          neededEnums.add(preferredType.type)
        } else if (preferredType.location === 'inputObjectTypes') {
          processType(preferredType.type, 'input', preferredType.namespace)
        } else if (preferredType.location === 'outputObjectTypes') {
          processType(preferredType.type, 'output', preferredType.namespace)
        }

        const baseType = mapPrismaTypeToGraphQL(preferredType.type)
        const fieldType = preferredType.isList ? `[${baseType}!]` : baseType

        let preparedField: GraphQLInputField = {
          name: field.name,
          type: fieldType + (field.isRequired ? '!' : ''),
          isRequired: field?.isRequired ?? false,
          isNullable: field.isNullable,
        }

        preparedField = executeHook('onPreparedTypeField', {
          ...preparedField,
          _metadata: {
            typeCategory,
          },
        })

        return preparedField
      }),
    }
    graphqlType = executeHook('onPreparedType', {
      ...graphqlType,
      _metadata: {
        typeCategory,
      },
    })
    if (typeCategory === 'input') {
      inputTypes.push(graphqlType)
    } else {
      outputTypes.push(graphqlType)
    }
  }

  // Determine which input types are needed based on queries and mutations
  const neededInputTypes = new Set<string>()
  const neededOutputTypes = new Set<string>()
  returnTypes.forEach(returnType => neededOutputTypes.add(returnType))

  // Map operation types to required input types
  const operationInputTypeMap: Record<string, string[]> = {
    findUnique: [`${modelName}WhereUniqueInput`],
    findMany: [`${modelName}WhereInput`, `${modelName}OrderByWithRelationInput`],
    findFirst: [`${modelName}WhereInput`, `${modelName}OrderByWithRelationInput`],
    count: [`${modelName}WhereInput`],
    aggregate: [`${modelName}WhereInput`, `${modelName}OrderByWithRelationInput`],
    groupBy: [
      `${modelName}WhereInput`,
      `${modelName}OrderByWithAggregationInput`,
      `${modelName}ScalarWhereWithAggregatesInput`,
    ],
    create: [`${modelName}CreateInput`],
    createMany: [`${modelName}CreateManyInput`],
    update: [`${modelName}WhereUniqueInput`, `${modelName}UpdateInput`],
    updateMany: [`${modelName}WhereInput`, `${modelName}UpdateManyMutationInput`],
    upsert: [`${modelName}WhereUniqueInput`, `${modelName}CreateInput`, `${modelName}UpdateInput`],
    delete: [`${modelName}WhereUniqueInput`],
    deleteMany: [`${modelName}WhereInput`],
  }

  neededOutputTypes.add(modelName)

  // Add input types needed for queries
  queries.forEach(queryType => {
    const inputTypesForOperation = operationInputTypeMap[queryType] || []
    inputTypesForOperation.forEach(inputType => neededInputTypes.add(inputType))
  })

  // Add input types needed for mutations
  mutations.forEach(mutationType => {
    const inputTypesForOperation = operationInputTypeMap[mutationType] || []
    inputTypesForOperation.forEach(inputType => neededInputTypes.add(inputType))
  })

  // Process only the needed input types and their dependencies
  neededOutputTypes.forEach(typeName => {
    processType(typeName, 'output')
  })

  neededInputTypes.forEach(typeName => {
    processType(typeName, 'input')
  })

  // Collect and add needed enum types to base.graphql
  // Add enum types to base.graphql sequentially
  for (const enumName of neededEnums) {
    try {
      await addEnumToBase(enumName, dmmf)
    } catch (error) {
      console.error(`Failed to add enum ${enumName}:`, error)
    }
  }

  return {
    input: inputTypes,
    output: outputTypes,
  }
}

const prepareOperationsData = (
  dmmf: DMMF.Document,
  operations: string[],
  modelName: string,
  operationType: string,
  customPlurals?: Record<string, string>,
): Operation[] => {
  const modelNameLower = modelName.charAt(0).toLowerCase() + modelName.slice(1)
  const modelNamePlural = pluralize(modelNameLower, customPlurals)

  // For singular operations, if the model name is already plural, singularize it
  const modelNameSingular = COMMON_PLURALS.has(modelNameLower)
    ? singularize(modelNameLower)
    : modelNameLower

  return operations
    .map(operation => {
      const operationsOutputType = dmmf.schema.outputObjectTypes.prisma.find(
        type => type.name === operationType,
      )

      if (!operationsOutputType) throw new Error(`Operation output type not found for ${operation}`)

      const operationFieldType = operationsOutputType.fields.find(
        type => type.name === `${mapOperationToPrismaFunc(operation)}${modelName}`,
      )
      if (!operationFieldType)
        throw new Error(`Operation output type not found for ${operation}${modelName}`)

      const inputArguments = operationFieldType.args
      const returnType = operationFieldType.outputType

      let operationName = ''

      if (operation.includes('Many')) {
        operationName = `${modelNamePlural}${pascalCase(operation)}`
      } else {
        operationName = `${modelNameSingular}${pascalCase(operation)}`
      }

      let argsString = ''
      if (inputArguments.length > 0) {
        argsString = inputArguments
          .map(
            arg =>
              `${arg.name}: ${selectPreferredInputType(arg.inputTypes as any[]).type}` +
              (arg.isRequired ? '!' : ''),
          )
          .join(', ')
      }

      let returnString = ''
      if (returnType) {
        returnString = `${returnType.isList ? '[' : ''}${returnType.type}${returnType.isList ? `${operationFieldType.isNullable ? '!' : ''}]` : ''}${operationFieldType.isNullable ? '!' : ''}`
      }

      let operationData: Operation = {
        name: operationName,
        args: argsString,
        returnType: returnString,
        description: `${operation} operation for ${modelName}`,
        operationType: operation,
      }

      operationData = executeHook('onPreparedOperation', {
        ...operationData,
        _metadata: {
          operationFieldType: operationFieldType,
        },
      })

      return operationData
    })
    .filter((operation): operation is Operation => operation !== null)
}

// --- Main Orchestrator Function ---
export async function generateGraphqlModule(
  options: GenerateModuleOptions,
  config: GeneratorConfig,
): Promise<void> {
  const { model, modulePath } = options
  const configData = generatorConfig.getConfig()
  const sdlPath = path.join(modulePath, `${model.name}${configData.files.extensions.graphql}`)
  const resolverPath = path.join(modulePath, `${model.name}${configData.files.extensions.resolver}`)

  const sdlExists = await fileExists(sdlPath)
  const resolverExists = await fileExists(resolverPath)

  // Handle SDL generation
  if (sdlExists) {
    executeHook('onUpdateFile', {
      sdlPath,
      options,
      config,
    })
    await updateSdlFile(sdlPath, options, config)
  } else {
    executeHook('onCompileTemplate', {
      resolverPath,
      template: configData.files.templates.resolverTemplate,
      options,
      config,
    })
    await compileTemplateFile(sdlPath, configData.files.templates.graphqlTemplate, options, config)
  }

  // Handle resolver generation
  if (resolverExists) {
    executeHook('onUpdateFile', {
      sdlPath,
      options,
      config,
    })
    await updateResolverFile(resolverPath, options, config)
  } else {
    executeHook('onCompileTemplate', {
      resolverPath,
      template: configData.files.templates.resolverTemplate,
      options,
      config,
    })
    await compileTemplateFile(
      resolverPath,
      configData.files.templates.resolverTemplate,
      options,
      config,
    )
  }
}

async function compileTemplateFile(
  filePath: string,
  templateFilePath: string,
  options: GenerateModuleOptions,
  config: any,
): Promise<void> {
  const { model, queries, mutations } = options
  const configData = generatorConfig.getConfig()

  const modelNameLower = model.name.charAt(0).toLowerCase() + model.name.slice(1)
  const modelNamePlural = pluralize(modelNameLower, options.customPlurals)
  const modelNameSingular = COMMON_PLURALS.has(modelNameLower)
    ? singularize(modelNameLower)
    : modelNameLower

  const queriesData = prepareOperationsData(
    options.dmmf,
    queries,
    model.name,
    'Query',
    options.customPlurals,
  )

  const mutationsData = prepareOperationsData(
    options.dmmf,
    mutations,
    model.name,
    'Mutation',
    options.customPlurals,
  )

  const returnTypes = [
    ...queriesData.map(queryData => queryData.returnType),
    ...mutationsData.map(mutationData => mutationData.returnType),
  ]

  const types = await prepareTypesData(options.dmmf, model.name, queries, mutations, returnTypes)

  const templateData: HandlebarsTemplateData = {
    modelName: model.name,
    modelNameLower,
    modelNameSingular,
    modelNamePlural,
    fields: prepareFieldsData(model),
    queries: queriesData,
    mutations: mutationsData,
    hasQueries: queries.length > 0,
    hasMutations: mutations.length > 0,
    inputTypes: types.input,
    outputTypes: types.output,
    hasInputTypes: types.input.length > 0,
    hasOutputTypes: types.output.length > 0,
    camelCase: (str: string) => str.charAt(0).toLowerCase() + str.slice(1),
    pascalCase: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
    dataSourceMethod: configData.content.resolverImplementation.dataSourceMethod,
    errorMessageTemplate: configData.content.resolverImplementation.errorMessageTemplate,
  }

  const templatePath = path.join(__dirname, templateFilePath)
  const templateContent = await fs.readFile(templatePath, 'utf-8')
  const template = Handlebars.compile(templateContent)
  const renderedContent = template(templateData)

  await writeFileSafely(filePath, renderedContent)
}

async function updateSdlFile(
  filePath: string,
  options: GenerateModuleOptions,
  config: any,
): Promise<void> {
  const { model, queries, mutations, dmmf } = options
  const fileContent = await fs.readFile(filePath, 'utf-8')
  const ast = parse(fileContent)

  const newQueries = prepareOperationsData(
    options.dmmf,
    queries,
    model.name,
    'Query',
    options.customPlurals,
  )
  const newMutations = prepareOperationsData(
    options.dmmf,
    mutations,
    model.name,
    'Mutation',
    options.customPlurals,
  )
  const returnTypes = [
    ...newQueries.map(query => query.returnType.replace('[', '').replace(']', '').replace('!', '')),
    ...newMutations.map(mutation =>
      mutation.returnType.replace('[', '').replace(']', '').replace('!', ''),
    ),
  ]
  const types = await prepareTypesData(dmmf, model.name, queries, mutations, returnTypes)

  // Helper function to parse argument string into AST nodes
  const parseArguments = (argString: string) => {
    if (!argString.trim()) return []

    try {
      // Parse a dummy field to get the arguments structure
      const dummyField = `field(${argString}): String`
      const dummySchema = `type Test { ${dummyField} }`
      const dummyAst = parse(dummySchema)
      const field = (dummyAst.definitions[0] as any).fields[0]
      return field.arguments || []
    } catch (error) {
      console.warn(`Failed to parse arguments: ${argString}`)
      return []
    }
  }

  // Get existing input type names to avoid duplicates
  const existingInputTypes = new Set(
    ast.definitions
      .filter(def => def.kind === 'InputObjectTypeDefinition')
      .map(def => (def as any).name.value),
  )

  // Add missing input types to the AST
  const inputTypeDefinitions = types.input
    .filter(inputType => !existingInputTypes.has(inputType.name))
    .map(inputType => ({
      kind: 'InputObjectTypeDefinition' as const,
      name: { kind: 'Name' as const, value: inputType.name },
      fields: inputType.fields.map(field => ({
        kind: 'InputValueDefinition' as const,
        name: { kind: 'Name' as const, value: field.name },
        type: field.isRequired
          ? {
              kind: 'NonNullType' as const,
              type: {
                kind: field.type.includes('[') ? 'ListType' : ('NamedType' as const),
                type: field.type.includes('[')
                  ? {
                      kind: 'NamedType' as const,
                      name: {
                        kind: 'Name' as const,
                        value: field.type.replace(/[\[\]!]/g, ''),
                      },
                    }
                  : undefined,
                name: !field.type.includes('[')
                  ? {
                      kind: 'Name' as const,
                      value: field.type.replace(/[!]/g, ''),
                    }
                  : undefined,
              },
            }
          : {
              kind: field.type.includes('[') ? 'ListType' : ('NamedType' as const),
              type: field.type.includes('[')
                ? {
                    kind: 'NamedType' as const,
                    name: {
                      kind: 'Name' as const,
                      value: field.type.replace(/[\[\]!]/g, ''),
                    },
                  }
                : undefined,
              name: !field.type.includes('[')
                ? {
                    kind: 'Name' as const,
                    value: field.type.replace(/[!]/g, ''),
                  }
                : undefined,
            },
      })),
    }))

  // Get existing output type names to avoid duplicates
  const existingOutputTypes = new Set(
    ast.definitions
      .filter(def => def.kind === 'ObjectTypeDefinition' && (def as any).name.value !== model.name)
      .map(def => (def as any).name.value),
  )

  // Add missing output types to the AST
  const outputTypeDefinitions = types.output
    .filter(outputType => !existingOutputTypes.has(outputType.name))
    .map(outputType => ({
      kind: 'ObjectTypeDefinition' as const,
      name: { kind: 'Name' as const, value: outputType.name },
      fields: outputType.fields.map(field => ({
        kind: 'FieldDefinition' as const,
        name: { kind: 'Name' as const, value: field.name },
        type: {
          kind: field.type.endsWith('!') ? 'NonNullType' : ('NamedType' as const),
          type: field.type.endsWith('!')
            ? {
                kind: 'NamedType' as const,
                name: {
                  kind: 'Name' as const,
                  value: field.type.replace('!', ''),
                },
              }
            : undefined,
          name: !field.type.endsWith('!')
            ? { kind: 'Name' as const, value: field.type }
            : undefined,
        },
      })),
    }))

  const modifiedAst = visit(ast, {
    Document(node) {
      // Add new input and output types at the beginning of the document (after the main type)
      const mainTypeIndex = node.definitions.findIndex(
        def => def.kind === 'ObjectTypeDefinition' && (def as any).name.value === model.name,
      )

      const insertIndex = mainTypeIndex >= 0 ? mainTypeIndex + 1 : 0
      const newDefinitions = [
        ...node.definitions.slice(0, insertIndex),
        ...inputTypeDefinitions,
        ...outputTypeDefinitions,
        ...node.definitions.slice(insertIndex),
      ]

      return { ...node, definitions: newDefinitions }
    },
    ObjectTypeDefinition(node) {
      if (node.name.value === 'Query' && newQueries.length > 0) {
        const existingQueries = new Set(node.fields?.map(f => f.name.value) || [])
        const fieldsToAdd = newQueries
          .filter(q => !existingQueries.has(q.name))
          .map(q => ({
            kind: 'FieldDefinition' as const,
            name: { kind: 'Name' as const, value: q.name },
            type: {
              kind: 'NamedType' as const,
              name: { kind: 'Name' as const, value: q.returnType },
            },
            arguments: parseArguments(q.args),
          }))

        if (fieldsToAdd.length > 0) {
          return { ...node, fields: [...(node.fields || []), ...fieldsToAdd] }
        }
      }

      if (node.name.value === 'Mutation' && newMutations.length > 0) {
        const existingMutations = new Set(node.fields?.map(f => f.name.value) || [])
        const fieldsToAdd = newMutations
          .filter(m => !existingMutations.has(m.name))
          .map(m => ({
            kind: 'FieldDefinition' as const,
            name: { kind: 'Name' as const, value: m.name },
            type: {
              kind: 'NamedType' as const,
              name: { kind: 'Name' as const, value: m.returnType },
            },
            arguments: parseArguments(m.args),
          }))

        if (fieldsToAdd.length > 0) {
          return { ...node, fields: [...(node.fields || []), ...fieldsToAdd] }
        }
      }

      return node
    },
    ObjectTypeExtension(node) {
      if (node.name.value === 'Query' && newQueries.length > 0) {
        const existingQueries = new Set(node.fields?.map(f => f.name.value) || [])
        const fieldsToAdd = newQueries
          .filter(q => !existingQueries.has(q.name))
          .map(q => ({
            kind: 'FieldDefinition' as const,
            name: { kind: 'Name' as const, value: q.name },
            type: {
              kind: 'NamedType' as const,
              name: { kind: 'Name' as const, value: q.returnType },
            },
            arguments: parseArguments(q.args),
          }))

        if (fieldsToAdd.length > 0) {
          return { ...node, fields: [...(node.fields || []), ...fieldsToAdd] }
        }
      }

      if (node.name.value === 'Mutation' && newMutations.length > 0) {
        const existingMutations = new Set(node.fields?.map(f => f.name.value) || [])
        const fieldsToAdd = newMutations
          .filter(m => !existingMutations.has(m.name))
          .map(m => ({
            kind: 'FieldDefinition' as const,
            name: { kind: 'Name' as const, value: m.name },
            type: {
              kind: 'NamedType' as const,
              name: { kind: 'Name' as const, value: m.returnType },
            },
            arguments: parseArguments(m.args),
          }))

        if (fieldsToAdd.length > 0) {
          return { ...node, fields: [...(node.fields || []), ...fieldsToAdd] }
        }
      }

      return node
    },
  })

  const modifiedContent = print(modifiedAst)

  await writeFileSafely(filePath, modifiedContent)
}

async function updateResolverFile(
  filePath: string,
  options: GenerateModuleOptions,
  config: any,
): Promise<void> {
  const { model, queries, mutations } = options
  const project = new Project()
  const sourceFile = project.addSourceFileAtPath(filePath)

  const modelNameLower = model.name.charAt(0).toLowerCase() + model.name.slice(1)

  const resolverDeclaration = sourceFile
    .getVariableDeclarations()
    .find(d => d.getName().includes('resolvers') || d.getName().includes('Resolvers'))
  if (!resolverDeclaration) return

  const resolverObject = resolverDeclaration.getInitializerIfKind(
    SyntaxKind.ObjectLiteralExpression,
  )
  if (!resolverObject) return

  const newQueries = prepareOperationsData(
    options.dmmf,
    queries,
    model.name,
    'Query',
    options.customPlurals,
  )
  const newMutations = prepareOperationsData(
    options.dmmf,
    mutations,
    model.name,
    'Mutation',
    options.customPlurals,
  )

  // Helper function to generate resolver implementation based on operation type
  const getResolverImplementation = (operationType: string, isQuery: boolean = true) => {
    const contextPath = `(await context.dataSources.prisma()).${modelNameLower}`

    switch (operationType) {
      case 'findUnique':
        return `async (_parent, args, context) => {
      return ${contextPath}.findUnique({
        where: args.where,
      });
    }`
      case 'findMany':
        return `async (_parent, args, context) => {
      return ${contextPath}.findMany({
        where: args.where,
        orderBy: args.orderBy,
        take: args.take,
        skip: args.skip,
      });
    }`
      case 'count':
        return `async (_parent, args, context) => {
      return ${contextPath}.count({
        where: args.where,
      });
    }`
      case 'aggregate':
        return `async (_parent, args, context) => {
      return ${contextPath}.aggregate({
        where: args.where,
      });
    }`
      case 'groupBy':
        return `async (_parent, args, context) => {
      return ${contextPath}.groupBy({
        by: args.by,
        where: args.where,
      });
    }`
      case 'create':
        return `async (_parent, args, context) => {
      return ${contextPath}.create({
        data: args.data,
      });
    }`
      case 'createMany':
        return `async (_parent, args, context) => {
      return ${contextPath}.createMany({
        data: args.data,
      });
    }`
      case 'update':
        return `async (_parent, args, context) => {
      return ${contextPath}.update({
        where: args.where,
        data: args.data,
      });
    }`
      case 'updateMany':
        return `async (_parent, args, context) => {
      return ${contextPath}.updateMany({
        where: args.where,
        data: args.data,
      });
    }`
      case 'upsert':
        return `async (_parent, args, context) => {
      return ${contextPath}.upsert({
        where: args.where,
        create: args.create,
        update: args.update,
      });
    }`
      case 'delete':
        return `async (_parent, args, context) => {
      return ${contextPath}.delete({
        where: args.where,
      });
    }`
      case 'deleteMany':
        return `async (_parent, args, context) => {
      return ${contextPath}.deleteMany({
        where: args.where,
      });
    }`
      default:
        return `async (_parent, args, context) => { throw new Error('${operationType} resolver not implemented'); }`
    }
  }

  // Add missing queries
  if (newQueries.length > 0) {
    let queryProperty = resolverObject.getProperty('Query')

    // If Query property doesn't exist, create it
    if (!queryProperty) {
      resolverObject.addPropertyAssignment({
        name: 'Query',
        initializer: '{}',
      })
      queryProperty = resolverObject.getProperty('Query')
    }

    if (queryProperty) {
      const queryObject = queryProperty.getChildrenOfKind(SyntaxKind.ObjectLiteralExpression)[0]
      if (queryObject) {
        const existingQueries = new Set(
          queryObject
            .getProperties()
            .map(p => p.getChildrenOfKind(SyntaxKind.Identifier)[0]?.getText())
            .filter(Boolean),
        )

        newQueries.forEach(query => {
          if (!existingQueries.has(query.name)) {
            queryObject.addPropertyAssignment({
              name: query.name,
              initializer: getResolverImplementation(query.operationType, true),
            })
          }
        })
      }
    }
  }

  // Add missing mutations
  if (newMutations.length > 0) {
    let mutationProperty = resolverObject.getProperty('Mutation')

    // If Mutation property doesn't exist, create it
    if (!mutationProperty) {
      resolverObject.addPropertyAssignment({
        name: 'Mutation',
        initializer: '{}',
      })
      mutationProperty = resolverObject.getProperty('Mutation')
    }

    if (mutationProperty) {
      const mutationObject = mutationProperty.getChildrenOfKind(
        SyntaxKind.ObjectLiteralExpression,
      )[0]
      if (mutationObject) {
        const existingMutations = new Set(
          mutationObject
            .getProperties()
            .map(p => p.getChildrenOfKind(SyntaxKind.Identifier)[0]?.getText())
            .filter(Boolean),
        )

        newMutations.forEach(mutation => {
          if (!existingMutations.has(mutation.name)) {
            mutationObject.addPropertyAssignment({
              name: mutation.name,
              initializer: getResolverImplementation(mutation.operationType, false),
            })
          }
        })
      }
    }
  }

  let modifiedContent = sourceFile.getFullText()

  modifiedContent = executeHook('onFileWrite', {
    writeLocation: sourceFile.getFilePath(),
    content: modifiedContent,
  }).content

  sourceFile.replaceWithText(modifiedContent)
  await sourceFile.save()
}

// --- New Main Entry Point ---
export async function generateGraphQLFiles(
  dmmf: DMMF.Document,
  config: {
    modelName: string
    modulePath: string
    queries: string[]
    mutations: string[]
    customPlurals?: Record<string, string>
  },
): Promise<void> {
  const model = dmmf.datamodel.models.find(m => m.name === config.modelName)
  if (!model) {
    throw new Error(`Model ${config.modelName} not found in DMMF`)
  }

  const generatorConfig: GeneratorConfig = {
    modelName: config.modelName,
    modulePath: config.modulePath,
    operations: [...config.queries, ...config.mutations],
    queries: config.queries,
    mutations: config.mutations,
    customPlurals: config.customPlurals,
  }

  const options: GenerateModuleOptions = {
    model,
    queries: config.queries,
    mutations: config.mutations,
    modulePath: config.modulePath,
    dmmf,
    customPlurals: config.customPlurals,
  }

  await generateGraphqlModule(options, generatorConfig)
}
