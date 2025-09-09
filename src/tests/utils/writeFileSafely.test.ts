import fs from 'fs'
import path from 'path'

import { writeFileSafely } from '../../utils/writeFileSafely'

describe('writeFileSafely Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should write file safely', () => {
    jest.spyOn(path, 'dirname').mockReturnValue('/dir')
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined)
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)
    expect(() => writeFileSafely('/dir/file.txt', 'content')).not.toThrow()
    expect(fs.mkdirSync).toHaveBeenCalledWith('/dir', { recursive: true })
    expect(fs.writeFileSync).toHaveBeenCalledWith('/dir/file.txt', 'content')
  })

  it('should create directory if it does not exist', () => {
    jest.spyOn(path, 'dirname').mockReturnValue('/newdir')
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined)
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)
    expect(() => writeFileSafely('/newdir/file.txt', 'data')).not.toThrow()
    expect(fs.mkdirSync).toHaveBeenCalledWith('/newdir', { recursive: true })
  })

  // it('should handle write errors gracefully', () => {
  //   jest.spyOn(path, 'dirname').mockReturnValue('/errdir')
  //   jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined)
  //   jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
  //     throw new Error('write error')
  //   })
  //   const call = () => writeFileSafely('/errdir/file.txt', 'fail')
  //   expect(call).toThrow('write error')
  // })
})
