/*
 *Copyright (c) 2026 TQ-Systems GmbH <license@tq-group.com>, D-82229 Seefeld, Germany. All rights reserved.
 *Author: Ronny Freyer and the Energy Manager development team
 *
 *This software is licensed under the TQ-Systems Software License Agreement Version 1.0.4 or any later version.
 *You can obtain a copy of the License Agreement in the TQS (TQ-Systems Software Licenses) folder on the following website:
 *https://www.tq-group.com/en/support/downloads/tq-software-license-conditions/
 *In case of any license issues please contact license@tq-group.com.
 */

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, extname } from 'path'
import fs from 'fs/promises'
import { viteStaticCopy } from 'vite-plugin-static-copy'

function getContentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.js': return 'application/javascript';
    case '.json': return 'application/json';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

function serveApps(frontendRoot) {
  return {
    name: 'serve-apps',
    configureServer(server) {
      server.middlewares.use('/apps', async (req, res, next) => {
        try {
          const filePath = resolve(frontendRoot, 'apps', req.url.slice(1))
          const content = await fs.readFile(filePath)
          const contentType = getContentType(filePath)
          res.setHeader('Content-Type', contentType)
          res.end(content)
        } catch (err) {
          next()
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  // Detect if we're running from frontend/ or project root
  const cwd = process.cwd()
  const frontendRoot = cwd.endsWith('frontend') ? cwd : resolve(cwd, 'frontend')

  const env = loadEnv(mode, frontendRoot, '')
  const branding = env.VITE_BRANDING || 'default'
  const target = env.VITE_TARGET || 'http://localhost'

  const brandingRoot = resolve(frontendRoot, `brandings/${branding}`)

  return {
    root: brandingRoot,
    plugins: [
      vue(),
      serveApps(frontendRoot),
      viteStaticCopy({
        targets: [
          {
            src: resolve(frontendRoot, 'node_modules/@tq-systems/em-ui-core/shared/store.js'),
            dest: 'static/shared'
          },
          {
            src: resolve(frontendRoot, 'node_modules/vue/dist/vue.esm-browser.prod.js'),
            dest: 'static/shared',
            rename: 'vue.js'
          }
        ]
      })

    ],
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true
        }
      }
    },
    resolve: {
      dedupe: ['vue-router'],
      alias: {
        '@branding': resolve(frontendRoot, `brandings/${branding}`),
        '@branding-default': resolve(frontendRoot, 'brandings/default'),
        '@lang': resolve(frontendRoot, `brandings/${branding}/lang`),
        'static': resolve(frontendRoot, `brandings/${branding}/static`),
      },
      preserveSymlinks: false,
    },
    server: {
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
          secure: false,
          ws: true,
          headers: { origin: target },
        },
      },
    }
  }
})
