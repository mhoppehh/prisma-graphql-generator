import { GeneratorOptions } from '@prisma/generator-helper'

// Import the original options
import rawOptions from './generated/options'

// Helper to convert string kind to FieldKind enum
const fieldKind = (kind: string) => {
  switch (kind) {
    case 'scalar':
      return 'scalar'
    case 'object':
      return 'object'
    case 'enum':
      return 'enum'
    default:
      return 'scalar'
  }
}

// Helper to convert string index type to IndexType enum
const indexType = (type: string) => {
  switch (type) {
    case 'unique':
      return 'unique'
    case 'index':
      return 'index'
    case 'primary':
      return 'primary'
    case 'fulltext':
      return 'fulltext'
    default:
      return 'index'
  }
}

// Patch the DMMF models to use FieldKind and IndexType enums
const patchedOptions: GeneratorOptions = {
  ...rawOptions,
  generator: {
    ...rawOptions.generator,
    binaryTargets: (rawOptions.generator.binaryTargets || []).map(
      (target: any) => ({
        ...target,
        native: Boolean(target?.native),
      }),
    ),
  },
  dmmf: {
    ...rawOptions.dmmf,
    datamodel: {
      ...rawOptions.dmmf.datamodel,
      models: rawOptions.dmmf.datamodel.models.map((model: any) => ({
        ...model,
        fields: model.fields.map((field: any) => ({
          ...field,
          kind: fieldKind(field.kind),
        })),
      })),
      indexes: (rawOptions.dmmf.datamodel.indexes || []).map((idx: any) => ({
        ...idx,
        type: indexType(idx.type),
      })),
    },
    mappings: {
      ...rawOptions.dmmf.mappings,
      modelOperations: rawOptions.dmmf.mappings.modelOperations.map(
        (op: any) => {
          const patchedOp = { ...op }
          if ('createOne' in patchedOp) {
            patchedOp.create = patchedOp.createOne
            delete patchedOp.createOne
          }
          if ('deleteOne' in patchedOp) {
            patchedOp.delete = patchedOp.deleteOne
            delete patchedOp.deleteOne
          }
          if ('updateOne' in patchedOp) {
            patchedOp.update = patchedOp.updateOne
            delete patchedOp.updateOne
          }
          if ('upsertOne' in patchedOp) {
            patchedOp.upsert = patchedOp.upsertOne
            delete patchedOp.upsertOne
          }
          return patchedOp
        },
      ),
    },
  },
} as any

export default patchedOptions
