import { promises as fs } from 'fs'

import { readExistingFile } from '../../utils/readExistingFile'

describe('readExistingFile Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should read existing file content', async () => {
    jest.spyOn(fs, 'readFile').mockResolvedValueOnce('file content')
    await expect(readExistingFile('/path/to/file')).resolves.toBe(
      'file content',
    )
  })

  it('should handle missing file', async () => {
    jest.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('not found'))
    await expect(readExistingFile('/path/to/missing')).resolves.toBeNull()
  })

  it('should handle edge case: empty path', async () => {
    jest.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('not found'))
    await expect(readExistingFile('')).resolves.toBeNull()
  })
})
