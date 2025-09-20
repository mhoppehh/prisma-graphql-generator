import { formatFile } from '../../utils/formatFile'

jest.mock('prettier', () => ({
  resolveConfig: jest.fn(),
  format: jest.fn(),
}))

const prettier = require('prettier')

describe('formatFile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('formats code when config is found', async () => {
    prettier.resolveConfig.mockResolvedValue({ parser: 'typescript' })
    prettier.format.mockReturnValue('const x = 1;')

    const result = await formatFile('const x=1')

    expect(prettier.resolveConfig).toHaveBeenCalledWith(process.cwd())
    expect(prettier.format).toHaveBeenCalledWith('const x=1', { parser: 'typescript' })
    expect(result).toBe('const x = 1;')
  })

  it('returns original content when no config found', async () => {
    prettier.resolveConfig.mockResolvedValue(null)

    const result = await formatFile('const x=1')

    expect(prettier.resolveConfig).toHaveBeenCalledWith(process.cwd())
    expect(prettier.format).not.toHaveBeenCalled()
    expect(result).toBe('const x=1')
  })

  it('rejects when prettier config fails', async () => {
    prettier.resolveConfig.mockRejectedValue(new Error('Config error'))

    await expect(formatFile('const x=1')).rejects.toThrow('Config error')
  })

  it('rejects when prettier format fails', async () => {
    prettier.resolveConfig.mockResolvedValue({ parser: 'typescript' })
    prettier.format.mockImplementation(() => {
      throw new Error('Syntax error')
    })

    await expect(formatFile('const =')).rejects.toThrow('Syntax error')
  })
})
