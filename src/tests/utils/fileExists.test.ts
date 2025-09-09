import { promises as fs } from 'fs'
import * as pathModule from 'path'

import {
  fileExists,
  modelToFileName,
  checkExistingFiles,
} from '../../utils/fileExists'

describe('fileExists Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return true for existing file', async () => {
    jest.spyOn(fs, 'access').mockResolvedValueOnce(undefined)
    await expect(fileExists('/path/to/existing')).resolves.toBe(true)
  })

  it('should return false for non-existing file', async () => {
    jest.spyOn(fs, 'access').mockRejectedValueOnce(new Error('not found'))
    await expect(fileExists('/path/to/missing')).resolves.toBe(false)
  })

  it('should handle edge case: empty path', async () => {
    jest.spyOn(fs, 'access').mockRejectedValueOnce(new Error('not found'))
    await expect(fileExists('')).resolves.toBe(false)
  })
})

describe('modelToFileName', () => {
  it('should convert PascalCase to camelCase', () => {
    expect(modelToFileName('User')).toBe('user')
    expect(modelToFileName('BlogPost')).toBe('blogPost')
  })
  it('should convert snake_case to camelCase', () => {
    expect(modelToFileName('blog_post')).toBe('blogPost')
    expect(modelToFileName('user_profile')).toBe('userProfile')
  })
  it('should handle edge cases', () => {
    expect(modelToFileName('')).toBe('')
    expect(modelToFileName('_Leading')).toBe('leading')
  })
})

describe('checkExistingFiles', () => {
  it('should return file info for existing files', async () => {
    jest.spyOn(fs, 'access').mockResolvedValue(undefined)
    jest.spyOn(fs, 'readFile').mockResolvedValue('file content')
    const info = await checkExistingFiles('/modules', 'User')
    expect(info.sdl.exists).toBe(true)
    expect(info.resolvers.exists).toBe(true)
    expect(info.sdl.content).toBe('file content')
    expect(info.resolvers.content).toBe('file content')
  })

  it('should handle missing files gracefully', async () => {
    jest.spyOn(fs, 'access').mockRejectedValue(new Error('not found'))
    jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('not found'))
    const info = await checkExistingFiles('/modules', 'User')
    expect(info.sdl.exists).toBe(false)
    expect(info.resolvers.exists).toBe(false)
    expect(info.sdl.content).toBeUndefined()
    expect(info.resolvers.content).toBeUndefined()
  })
})
