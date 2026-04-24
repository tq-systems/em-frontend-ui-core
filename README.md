# @tq-systems/em-ui-core

Core UI build toolchain and app initialization for TQ Energy Manager UI Container.

**This is a library package** - It publishes source files and build configurations. Consumer projects use these to build their applications.

## Changelog
All notable changes to this project will be documented in the changelog
source file `CHANGELOG.md.in`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Structure
```
.
├── config                      # Vite build configurations
│   ├── vite.buildProd.js      # Production build configuration
│   └── vite.dev.js            # Development server configuration
├── core                        # Core application logic
│   ├── main.base.js           # Base initialization for container app
│   └── utils/                 # Core utility functions
│       ├── i18n.js           # Translation merging utilities
│       ├── listeners.js      # Window event listeners
│       └── modules.js        # Dynamic module loading
├── package.json               # Package metadata and dependencies
├── README.md
└── shared                      # Shared utilities
    └── store.js               # Global state management store
```

## Purpose
The `@tq-systems/em-ui-core` package provides:
- **Base application initialization** - Core Vue app setup with router and i18n
- **Vite build configurations** - Development and production build configs for all brandings
- **Shared state management** - Global store for application state
- **Build tooling** - Complete build toolchain with Vite and Rollup
- **Core utilities** - Module loading, translation merging, event listeners

## Requirements

### Peer Dependencies (Consumer Must Provide)
The consumer project must have these installed:
- `vue` ^3.5.13
- `vue-router` ^4.5.0
- `vue-i18n` ^11.1.12

**Note:** Build tools are devDependencies because they're only needed during the build process. The consumer project must also have Vite and build plugins in their devDependencies to execute the build.

## Installation

Install the package:
```bash
yarn add @tq-systems/em-ui-core
```

Also install required build tools as dev dependencies:
```bash
yarn add -D vite rollup @vitejs/plugin-vue \
  rollup-plugin-copy rollup-plugin-license rollup-plugin-sbom \
  sass-embedded vite-plugin-static-copy
```

## Usage

### Building Your Project
Build commands should be run from your project's frontend directory:

```bash
# From project root
make yarn-install    # Install dependencies
make yarn-release    # Build all variants

# Or from frontend directory
cd frontend
VITE_BUILD_VARIANT=default yarn exec vite build --config node_modules/@tq-systems/em-ui-core/config/vite.buildProd.js
```

### Development

#### Environment Variables
Build configurations support the following environment variables:
- `VITE_BUILD_VARIANT` (production) - Default: `'default'`
- `VITE_BRANDING` (development) - Default: `'default'`
- `VITE_TARGET` (development) - Default: `'http://localhost'`

Examples:
```bash
# Production build
VITE_BUILD_VARIANT=default yarn exec vite build --config node_modules/@tq-systems/em-ui-core/config/vite.buildProd.js

# Development server
VITE_BRANDING=default VITE_TARGET=http://10.0.0.1 yarn exec vite --config node_modules/@tq-systems/em-ui-core/config/vite.dev.js
```

#### Build Output
Production builds output to `frontend/dist/{branding}/` and include:
- Bundled JavaScript and CSS assets
- Third-party license notices
- SBOM (Software Bill of Materials) in CycloneDX format

## Project Structure Requirements
When using this package, your project should have the following structure:
```
project-root/
├── frontend/
│   ├── package.json              # Must include @tq-systems/em-ui-core + build tools
│   ├── brandings/
│   │   ├── default/              # At least default branding required
│   │   │   ├── main.js          # Entry point using initializeContainerApp
│   │   │   ├── index.html
│   │   │   ├── config.json
│   │   │   ├── app/             # Vue components
│   │   │   ├── lang/            # Translations
│   │   │   └── static/          # Static assets
│   │   └── [other-brandings]/
│   └── apps/                     # Dynamic microfrontend apps
└── Makefile                      # Optional build scripts
```

## Importing in Your Code

### Initialize Container App
```javascript
import { initializeContainerApp } from '@tq-systems/em-ui-core/main.base.js'
import App from './app/App.vue'
import config from './config.json'

function createRoutes({ emRoutes, config }) {
  // Define your routes
  return [ /* routes */ ]
}

initializeContainerApp({ App, createRoutes, config })
```

### Use Shared Store
```javascript
import store from '@tq-systems/em-ui-core/store'

// Access state
console.log(store.state.language)

// Commit mutations
store.commit('setLanguage', 'de')
```

## License

This software is licensed under the TQ-Systems Product Software License Agreement Version 1.0.3.

See the [LICENSE](LICENSE) file for full license terms.
