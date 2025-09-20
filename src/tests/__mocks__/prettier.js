module.exports = {
  format: (content, options) => content,
  resolveConfig: () => Promise.resolve(null),
  default: {
    format: (content, options) => content,
    resolveConfig: () => Promise.resolve(null),
  },
}
