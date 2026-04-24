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
import { resolve } from 'path'
import license from 'rollup-plugin-license'
import copy from 'rollup-plugin-copy'
import sbom from 'rollup-plugin-sbom'

function stripLicenseFromHtml() {
  return {
    name: 'strip-license-from-html',
    transformIndexHtml(html) {
      return html.replace(/<!--[\s\S]*?-->/g, '')
    },
  }
}

export default defineConfig(({ mode }) => {
  // Detect if we're running from frontend/ or project root
  const cwd = process.cwd()
  const frontendRoot = cwd.endsWith('frontend') ? cwd : resolve(cwd, 'frontend')
  const env = loadEnv(mode, frontendRoot, '')
  const branding = env.VITE_BUILD_VARIANT || 'default'

  const brandingRoot = resolve(frontendRoot, `brandings/${branding}`)
  const licenseFile = resolve(frontendRoot, `dist/${branding}/ThirdPartyNotice.txt`)
  const sbomFile = resolve(frontendRoot, `dist/${branding}/cyclonedx/bom.json`)

  return {
    root: brandingRoot,
    plugins: [
      vue(),
      stripLicenseFromHtml(),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true
        }
      }
    },
    build: {
      emptyOutDir: true,
      outDir: resolve(frontendRoot, `dist/${branding}`),
      assetsInlineLimit: 0,

      rollupOptions: {
        external: ['vue'],
        output: {
          entryFileNames: 'static/js/[name]-[hash].js',
          chunkFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: assetInfo => {
            const name = assetInfo.name || ''
            if (/\.(woff2?|ttf|otf|eot)$/.test(name)) {
              return 'static/fonts/[name][extname]'
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(name)) {
              return 'static/img/[name][extname]'
            }
            return 'static/assets/[name][extname]'
          },
          manualChunks: {
            'vue-router': ['vue-router']
          }
        },
        plugins: [
          copy({
            targets: [
              { src: resolve(frontendRoot, `brandings/${branding}/static/*`), dest: resolve(frontendRoot, `dist/${branding}/static`) },
              { src: resolve(frontendRoot, 'node_modules/@tq-systems/em-ui-core/shared/store.js'), dest: resolve(frontendRoot, `dist/${branding}/static/shared`) },
              {
                src: resolve(frontendRoot, 'node_modules/vue/dist/vue.esm-browser.prod.js'),
                dest: resolve(frontendRoot, `dist/${branding}/static/shared`),
                rename: 'vue.js'
              }
            ],
            dereference: true,
            hook: 'writeBundle'
          }),
          license({
            thirdParty: {
              output: licenseFile,
              includePrivate: false,
              allow: '(MIT OR Apache-2.0 OR BSD-2-Clause OR BSD-3-Clause)'
            }
          }),
          sbom({
            autodetect: false,
            outFormats: ['json'],
            output: sbomFile,
          }),
        ]
      },
    },
    resolve: {
      dedupe: ['vue-router'],
      alias: {
        '@branding': brandingRoot,
        '@branding-default': resolve(frontendRoot, 'brandings/default'),
        '@lang': resolve(frontendRoot, `brandings/${branding}/lang`),
        'static': resolve(frontendRoot, `brandings/${branding}/static`),
      },
      preserveSymlinks: false,
    }
  }
})
