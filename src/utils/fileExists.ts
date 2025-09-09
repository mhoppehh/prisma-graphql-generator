import { promises as fs } from 'fs'
import * as pathModule from 'path'

export interface FileInfo {
  exists: boolean
  path: string
  content?: string
}

export interface ExistingFilesInfo {
  sdl: FileInfo
  resolvers: FileInfo
}

// Convert model name to proper file/folder naming (User -> user, Blog_Post -> blogPost)
export const modelToFileName = (modelName: string): string => {
  // Convert snake_case and PascalCase to camelCase
  return modelName
    .replace(/_([a-zA-Z])/g, (_, c) => c.toUpperCase())
    .replace(/^([A-Z])/, (_, c) => c.toLowerCase())
}

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export const checkExistingFiles = async (
  modulePath: string,
  modelName: string,
): Promise<ExistingFilesInfo> => {
  const fileBase = modelToFileName(modelName)
  const folder = pathModule.join(modulePath, fileBase)
  const sdlPath = pathModule.join(folder, `${fileBase}.graphql`)
  const resolverPath = pathModule.join(folder, `${fileBase}.ts`)
  const sdlExists = await fileExists(sdlPath)
  const resolverExists = await fileExists(resolverPath)
  let sdlContent: string | undefined
  let resolverContent: string | undefined
  if (sdlExists) {
    try {
      sdlContent = await fs.readFile(sdlPath, 'utf8')
    } catch {}
  }
  if (resolverExists) {
    try {
      resolverContent = await fs.readFile(resolverPath, 'utf8')
    } catch {}
  }
  return {
    sdl: { exists: sdlExists, path: sdlPath, content: sdlContent },
    resolvers: {
      exists: resolverExists,
      path: resolverPath,
      content: resolverContent,
    },
  }
}
