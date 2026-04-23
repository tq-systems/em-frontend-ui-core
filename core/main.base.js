/*
 *Copyright (c) 2026 TQ-Systems GmbH <license@tq-group.com>, D-82229 Seefeld, Germany. All rights reserved.
 *Author: Ronny Freyer and the Energy Manager development team
 *
 *This software is licensed under the TQ-Systems Software License Agreement Version 1.0.4 or any later version.
 *You can obtain a copy of the License Agreement in the TQS (TQ-Systems Software Licenses) folder on the following website:
 *https://www.tq-group.com/en/support/downloads/tq-software-license-conditions/
 *In case of any license issues please contact license@tq-group.com.
 */

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import store from '../shared/store.js'
import { addWindowListener } from './utils/listeners.js'
import { loadModules } from './utils/modules.js'
import { mergeTranslations, setLanguageLabels } from './utils/i18n.js'
import { messages, labels, numberFormats, datetimeFormats } from '@lang/language'

const defaultLoader = (path) => import(/* @vite-ignore */ `/apps/${path}`)

export async function initializeContainerApp({ App, createRoutes, config, loader = defaultLoader }) {
  if (!App) throw new Error('initializeContainerApp: App is required')
  if (typeof createRoutes !== 'function') throw new Error('initializeContainerApp: createRoutes must be a function')
  if (!config) throw new Error('initializeContainerApp: config is required')

  // Globals
  window.EmRoutes = window.EmRoutes || []
  window.i18nBaseConfig = { legacy: false, fallbackLocale: 'en', numberFormats, datetimeFormats }

  // Load translations and apps
  const [langs, apps] = await Promise.all([
    fetch('/apps/langs.json').then((r) => r.json()),
    fetch('/apps/apps.json').then((r) => r.json()),
  ])

  await loadModules(langs, loader)
  mergeTranslations(messages)
  setLanguageLabels(labels)
  await loadModules(apps, loader)

  // Wait for async module registrations
  await store.awaitModules().catch((err) => {
      console.warn(err.message)
  })

  // Routes
  const routes = createRoutes({ emRoutes: window.EmRoutes, config })

  // Router + i18n
  const router = createRouter({ history: createWebHistory(), routes })
  const i18n = createI18n({
    ...window.i18nBaseConfig,
    locale: store.state.language,
    messages: window.EMTranslations,
  })

  addWindowListener('navigate', ({ detail: { path } }) => {
    if (router.resolve(path).matched.length) router.push(path)
  })
  store.on('setLanguage:done', (lang) => {
    i18n.global.locale.value = lang
  })

  // Mount
  const app = createApp(App).use(i18n).use(router)

  // Wait for router to be ready before mounting
  await router.isReady()

  app.mount('#app')
  document.title = i18n.global.t('meta.title')
}
