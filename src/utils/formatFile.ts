import prettier from 'prettier'

export const formatFile = (content: string): Promise<string> => {
  return new Promise((res, rej) =>
    prettier.resolveConfig(process.cwd()).then(options => {
      if (!options) {
        res(content)
        return
      }

      try {
        const formatted = prettier.format(content, {
          ...options,
          parser: 'typescript',
        })

        res(formatted)
      } catch (error) {
        rej(error)
      }
    }).catch(error => {
      rej(error)
    }),
  )
}
