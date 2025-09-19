# Prisma GraphQL Generator

[![npm version](https://badge.fury.io/js/prisma-graphql-module-generator.svg)](https://badge.fury.io/js/prisma-graphql-module-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=18.0-green.svg)](https://nodejs.org/)
[![CI](https://github.com/mhoppehh/prisma-graphql-module-generator/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/mhoppehh/prisma-graphql-module-generator/actions)
[![codecov](https://codecov.io/gh/mhoppehh/prisma-graphql-module-generator/branch/master/graph/badge.svg)](https://codecov.io/gh/mhoppehh/prisma-graphql-module-generator)
[![npm downloads](https://img.shields.io/npm/dm/prisma-graphql-module-generator.svg)](https://npmjs.org/package/prisma-graphql-module-generator)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A powerful and extensible Prisma generator that creates GraphQL schemas and TypeScript resolvers from your Prisma data models. This tool bridges the gap between your database schema and GraphQL API, providing type-safe, customizable code generation with a robust plugin system.

## 🌟 Features

- **🔄 Automatic GraphQL Schema Generation**: Convert Prisma models to GraphQL types, inputs, queries, and mutations
- **📝 TypeScript Resolver Generation**: Generate type-safe resolvers with proper Prisma client integration
- **🔌 Extensible Plugin System**: Built-in plugins for logging, formatting, validation, and field transformations
- **⚙️ Highly Configurable**: Flexible configuration via JSON files, environment variables, or TypeScript configs
- **🎨 Handlebars Templates**: Customizable output templates for both GraphQL schemas and resolvers
- **🔍 Smart Type Mapping**: Automatic conversion between Prisma and GraphQL types
- **📦 Custom Pluralization**: Support for custom plural forms and naming conventions
- **🛡️ Environment-Based Generation**: Configure different outputs based on environment variables

## 📦 Installation

```bash
npm install prisma-graphql-module-generator
# or
yarn add prisma-graphql-module-generator
# or
pnpm add prisma-graphql-module-generator
```

**Peer Dependencies:**
This package requires Prisma to be installed in your project:

```bash
npm install prisma @prisma/client
```

## 🚀 Quick Start

### 1. Add Generator to Prisma Schema

Add the generator to your `prisma/schema.prisma` file:

```prisma
generator graphql_typedef {
  provider = "prisma-graphql-module-generator"
  output   = "./generated"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  content  String?
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
```

### 2. Set Environment Variables

Configure the generator behavior using environment variables:

```bash
# Required: Specify which model and operations to generate
export GENERATOR_MODEL="User"
export GENERATOR_MODULE_PATH="user"
export GENERATOR_QUERIES="findUser,findUsers,countUsers"
export GENERATOR_MUTATIONS="createUser,updateUser,deleteUser"

# Optional: Custom pluralization
export GENERATOR_CUSTOM_PLURALS="user:users,post:posts"
```

### 3. Generate GraphQL Files

```bash
npx prisma generate
```

This will generate:

- `./generated/user.graphql` - GraphQL schema definitions
- `./generated/user.resolver.ts` - TypeScript resolvers

## 📚 Configuration

### Configuration Methods

The generator supports multiple configuration methods (in order of priority):

1. **Environment Variables** (highest priority)
2. **JSON Configuration Files**
3. **TypeScript Configuration Files**
4. **Default Values** (lowest priority)

### JSON Configuration

Create a `generator.config.json` file in your project root:

```json
{
  "generator": {
    "prettyName": "Prisma GraphQL Generator",
    "defaultOutput": "../generated"
  },
  "files": {
    "extensions": {
      "graphql": ".graphql",
      "resolver": ".ts"
    },
    "templates": {
      "graphqlTemplate": "templates/handlebars/module.graphql.hbs",
      "resolverTemplate": "templates/handlebars/module.resolver.ts.hbs"
    }
  },
  "typeMappings": {
    "prismaToGraphQL": {
      "Int": "Int",
      "String": "String",
      "Boolean": "Boolean",
      "DateTime": "DateTime",
      "Json": "JSON"
    }
  },
  "plugins": [
    {
      "name": "logging",
      "config": {}
    },
    {
      "name": "formatting",
      "config": {}
    }
  ]
}
```

### Environment Variables

| Variable                   | Description                         | Example                          |
| -------------------------- | ----------------------------------- | -------------------------------- |
| `GENERATOR_MODEL`          | Target Prisma model name            | `User`                           |
| `GENERATOR_MODULE_PATH`    | Output module path                  | `user`                           |
| `GENERATOR_QUERIES`        | Comma-separated query operations    | `findUser,findUsers`             |
| `GENERATOR_MUTATIONS`      | Comma-separated mutation operations | `createUser,updateUser`          |
| `GENERATOR_CUSTOM_PLURALS` | Custom pluralization rules          | `user:users,category:categories` |
| `GENERATOR_PRESET_USED`    | Configuration preset to use         | `default`                        |

## 🔌 Plugin System

The generator features a powerful plugin system for extending functionality.

### Built-in Plugins

- **Logging Plugin**: Provides detailed generation logs
- **Formatting Plugin**: Automatically formats generated code
- **Validation Plugin**: Validates generated schemas
- **Field Transform Plugin**: Transforms field names and types

### Creating Custom Plugins

```typescript
import { Plugin } from 'prisma-generator-graphql-test'

export const myCustomPlugin: Plugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  description: 'My custom plugin',

  hooks: {
    onGenerationFinished: async payload => {
      console.log('Generation completed for:', payload.modelName)
    },
    onModuleNotFound: async payload => {
      console.log('Module not found:', payload.modulePath)
    },
  },

  initialize: async pluginManager => {
    console.log('Plugin initialized')
  },

  cleanup: async () => {
    console.log('Plugin cleaned up')
  },
}
```

## 🎨 Templates

### GraphQL Schema Template

The generator uses Handlebars templates for flexible output generation:

```handlebars
{{#if hasInputTypes}}
  {{#each inputTypes}}
    input
    {{name}}
    {
    {{#each fields}}
      {{name}}:
      {{type}}{{#if required}}!{{/if}}
    {{/each}}
    }
  {{/each}}
{{/if}}

{{#if hasQueries}}
  extend type Query {
  {{#each queries}}
    {{name}}{{#if args}}({{args}}){{/if}}:
    {{returnType}}
  {{/each}}
  }
{{/if}}
```

### Resolver Template

```handlebars
export const resolvers{{pascalCase modelName}} = {
{{#if hasQueries}}
  Query: {
{{#each queries}}
    {{name}}: async (_parent, args, context) => {
      return (await {{../dataSourceMethod}}).{{../modelNameLower}}.{{operationType}}(args);
    },
{{/each}}
  },
{{/if}}
}
```

## 🛠️ Development

### Prerequisites

- Node.js >= 18.0
- pnpm (recommended) or npm/yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/mhoppehh/prisma-graphql-module-generator.git
cd prisma-graphql-module-generator

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### Project Structure

```
prisma-graphql-module-generator/
├── src/
│   ├── bin.ts                 # CLI entry point
│   ├── generator.ts           # Main generator logic
│   ├── helpers.ts             # Helper functions
│   ├── constants.ts           # Constants and defaults
│   ├── config/                # Configuration system
│   │   ├── config.ts         # Configuration loader
│   │   ├── config.default.ts # Default configuration
│   │   └── config.utils.ts   # Configuration utilities
│   ├── plugins/               # Plugin system
│   │   ├── manager.ts        # Plugin manager
│   │   ├── loader.ts         # Plugin loader
│   │   └── builtin/          # Built-in plugins
│   ├── templates/             # Handlebars templates
│   │   └── handlebars/
│   ├── types/                 # TypeScript type definitions
│   └── utils/                 # Utility functions
├── docs/                      # Documentation
├── examples/                  # Usage examples
├── tests/                     # Test files
└── prisma/                    # Example Prisma schema
```

### Available Scripts

- `pnpm build` - Build the TypeScript project
- `pnpm dev` - Start development mode with watch
- `pnpm test` - Run the test suite
- `pnpm start` - Run the compiled generator
- `pnpm type-check` - Run TypeScript type checking

## 🧪 Testing

The project includes comprehensive tests using Jest:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

Test categories:

- **Unit Tests**: Individual function and component testing
- **Integration Tests**: End-to-end generation testing
- **Cartesian Tests**: Comprehensive scenario testing
- **Snapshot Tests**: Output verification testing

## 📖 Examples

### Basic Usage

```bash
# Set environment variables
export GENERATOR_MODEL="Post"
export GENERATOR_MODULE_PATH="post"
export GENERATOR_QUERIES="findPost,findPosts"
export GENERATOR_MUTATIONS="createPost,updatePost,deletePost"

# Generate GraphQL files
npx prisma generate
```

### Advanced Configuration

```typescript
// generator.config.ts
import { GeneratorConfig } from 'prisma-generator-graphql-test'

const config: GeneratorConfig = {
  generator: {
    prettyName: 'My Blog GraphQL Generator',
    defaultOutput: './src/generated',
  },
  files: {
    extensions: {
      graphql: '.gql',
      resolver: '.resolvers.ts',
    },
  },
  content: {
    resolverImplementation: {
      dataSourceMethod: 'context.dataSources.prisma()',
      errorMessageTemplate: 'Resolver {operationName} not implemented',
    },
  },
  plugins: [
    { name: 'logging', config: { level: 'debug' } },
    { name: 'formatting', config: { prettier: true } },
  ],
}

export default config
```

## 📊 Performance & Benchmarks

The generator has been optimized for performance and can handle large schemas efficiently:

- **Small projects** (1-10 models): ~100ms generation time
- **Medium projects** (10-50 models): ~500ms generation time
- **Large projects** (50+ models): ~2s generation time

## 🔧 Troubleshooting

### Common Issues

**Problem**: Generator not found

```bash
Error: Generator "graphql_typedef" not found
```

**Solution**: Make sure the package is installed and the provider name matches exactly.

**Problem**: TypeScript compilation errors
**Solution**: Ensure your TypeScript version is compatible (>=5.0) and check your `tsconfig.json` configuration.

**Problem**: Custom templates not loading
**Solution**: Verify the template paths are correct and the files exist in your project structure.

### Debug Mode

Enable debug logging:

```json
{
  "plugins": [
    {
      "name": "logging",
      "config": {
        "logLevel": "debug"
      }
    }
  ]
}
```

## 📈 Roadmap

- [ ] Support for GraphQL Federation
- [ ] Enhanced subscription support
- [ ] Real-time schema updates
- [ ] Visual schema explorer
- [ ] Performance monitoring dashboard
- [ ] Custom scalar type support
- [ ] Advanced caching strategies

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/mhoppehh/prisma-graphql-module-generator.git
   cd prisma-graphql-module-generator
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run tests**

   ```bash
   pnpm test
   ```

4. **Build the project**
   ```bash
   pnpm build
   ```

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Make your changes and add tests
4. Run the test suite: `pnpm test`
5. Run linting: `pnpm lint`
6. Format code: `pnpm format`
7. Commit your changes: `git commit -am 'feat: add some feature'`
8. Push to the branch: `git push origin feature/my-new-feature`
9. Submit a pull request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `test:` test-related changes
- `chore:` maintenance tasks

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## 🆘 Support

- 📖 [Documentation](https://github.com/mhoppehh/prisma-graphql-module-generator#readme)
- 🐛 [Issue Tracker](https://github.com/mhoppehh/prisma-graphql-module-generator/issues)
- 💬 [Discussions](https://github.com/mhoppehh/prisma-graphql-module-generator/discussions)
- 📧 [Email Support](mailto:support@prisma-graphql-module-generator.com)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Prisma](https://prisma.io) for the excellent database toolkit
- [GraphQL](https://graphql.org) for the query language and runtime
- [Handlebars](https://handlebarsjs.com) for the templating system
- The open-source community for inspiration and contributions

---

<div align="center">
  <p>Made with ❤️ by the Prisma GraphQL Generator team</p>
  <p>
    <a href="https://github.com/mhoppehh/prisma-graphql-module-generator">GitHub</a> •
    <a href="https://npmjs.com/package/prisma-graphql-module-generator">NPM</a> •
    <a href="CHANGELOG.md">Changelog</a> •
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</div>
- All contributors who have helped improve this project

## 📞 Support

- 📖 [Documentation](./docs/CONFIGURATION.md)
- 🐛 [Issue Tracker](https://github.com/mhoppehh/prisma-graphql-module-generator/issues)
- 💬 [Discussions](https://github.com/mhoppehh/prisma-graphql-module-generator/discussions)

---

Made with ❤️ by the Prisma GraphQL Generator team
