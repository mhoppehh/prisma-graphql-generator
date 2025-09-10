// Mock for prettier to avoid ES module issues in tests
module.exports = {
  format: (content, options) => content,
  resolveConfig: () => Promise.resolve(null),
  default: {
    format: (content, options) => content,
    resolveConfig: () => Promise.resolve(null)
  }
}
