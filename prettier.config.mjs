export default {
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'avoid',
  bracketSpacing: true,
  bracketSameLine: false,
  jsxBracketSameLine: false,
  semi: false,
  useTabs: false,
  tabWidth: 2,
  endOfLine: 'auto',
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200,
      },
    },
  ],
}
