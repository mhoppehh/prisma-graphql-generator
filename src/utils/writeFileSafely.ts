import fs from 'fs'
import path from 'path'
import { executeHook } from '../plugins'

export const writeFileSafely = async (writeLocation: string, content: string) => {
  fs.mkdirSync(path.dirname(writeLocation), {
    recursive: true,
  })

  content = executeHook('onFileWrite', {
    writeLocation,
    content,
  }).content
  fs.writeFileSync(writeLocation, content)
}
