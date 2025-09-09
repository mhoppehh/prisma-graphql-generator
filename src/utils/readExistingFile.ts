import { promises as fs } from 'fs'

export async function readExistingFile(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, 'utf8')
  } catch {
    return null
  }
}
