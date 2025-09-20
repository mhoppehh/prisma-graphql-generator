# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial npm package setup
- CI/CD pipeline with GitHub Actions
- Automated dependency management with Dependabot
- Security scanning and code quality checks

### Changed

- Package name updated to `prisma-graphql-module-generator`
- Enhanced package.json with proper metadata, keywords, and scripts
- Updated build and release processes

### Fixed

- TypeScript declaration files properly exported

## [0.1.0] - 2025-09-19

### Added

- Initial release of Prisma GraphQL Generator
- Automatic GraphQL schema generation from Prisma models
- TypeScript resolver generation with type safety
- Extensible plugin system with built-in plugins:
  - Logging plugin for debugging and monitoring
  - Formatting plugin with Prettier integration
  - Validation plugin for schema validation
  - Field transformation plugin for custom mappings
- Handlebars template system for customizable output
- Environment-based configuration support
- Custom pluralization and naming conventions
- CLI tool for schema generation
- Comprehensive test suite with high coverage
- Detailed documentation with examples

### Features

- **Schema Generation**: Converts Prisma models to GraphQL types, inputs, queries, and mutations
- **Type Safety**: Full TypeScript support with proper type definitions
- **Plugin Architecture**: Extensible system for custom functionality
- **Template System**: Customizable Handlebars templates
- **Configuration**: Flexible JSON, environment variable, and TypeScript configuration
- **CLI Integration**: Easy command-line interface for generation

### Supported

- Node.js >= 18.0
- Prisma >= 5.0.0
- TypeScript >= 5.0
- GraphQL >= 16.0

---

## Release Notes Format

Each release follows this format:

### Added

- New features and capabilities

### Changed

- Changes in existing functionality

### Deprecated

- Features that will be removed in future versions

### Removed

- Features removed in this version

### Fixed

- Bug fixes

### Security

- Security improvements and vulnerability fixes
