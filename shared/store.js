/*
 *Copyright (c) 2026 TQ-Systems GmbH <license@tq-group.com>, D-82229 Seefeld, Germany. All rights reserved.
 *Author: Ronny Freyer and the Energy Manager development team
 *
 *This software is licensed under the TQ-Systems Software License Agreement Version 1.0.4 or any later version.
 *You can obtain a copy of the License Agreement in the TQS (TQ-Systems Software Licenses) folder on the following website:
 *https://www.tq-group.com/en/support/downloads/tq-software-license-conditions/
 *In case of any license issues please contact license@tq-group.com.
 */

export function createStore() {

    // Internal state
    const state = {
        language: localStorage.getItem('lang') || navigator.language?.slice(0, 2) || 'en',
        breadcrumb: null,
        teridianValues: null,
        sensorConfig: null,
        deviceStatus: null,
        apps: [],
        adapterConfigs: [],
        deviceManagementConfig: [],
        navigation: { items: [] },
        alertMessage: '',
        statusMessage: '',
        warningMessage: '',
        dangerHeaderMessage: '',
        hideAlert: null,
        forceRedirect: true,
        timezone: localStorage.getItem('timezone') || null,
        unreadMessages: 0,
        eol: false,
        invalidTime: false,
        viewMode: 'full', // "full" view is the default
        isIconbarShown: false,
    }

    // Event bus for state change
    const events = {}

    const store = {
        state,

        // Register a listener
        on(event, callback) {
            if (!events[event]) {
                events[event] = []
            }
            events[event].push(callback)
        },

        // Remove a listener
        off(event, callback) {
            if (!events[event]) return
            events[event] = events[event].filter(cb => cb !== callback)
        },

        // Emit an event with a payload
        emit(event, payload) {
            if (!events[event]) return
            events[event].forEach(cb => cb(payload))
        },

        // Register a one-time listener
        once(event, callback) {
            const wrapper = (payload) => {
              store.off(event, wrapper)
              callback(payload)
            }

            store.on(event, wrapper)
        },

        // Wait for a specific event and resolve as a Promise
        waitFor(event, { timeoutMs = 5000, predicate } = {}) {
            return new Promise((resolve, reject) => {
              let timer

              const handler = (payload) => {
                if (predicate && !predicate(payload)) return
                if (timer) clearTimeout(timer)
                store.off(event, handler)
                resolve(payload)
              };

              store.on(event, handler)

              timer = setTimeout(() => {
                store.off(event, handler)
                reject(new Error(`Timeout waiting for "${event}" after ${timeoutMs}ms`))
              }, timeoutMs)
            })
          },

        // RPC over event bus (matched via correlationId)
        rpc(baseTopic, payload = {}, { timeoutMs = 5000 } = {}) {
            if (typeof baseTopic !== 'string' || !/^[^:]+::[^:]+$/.test(baseTopic)) {
              throw new Error(`rpc(): expected "app::method", got "${String(baseTopic)}"`)
            }

            const topicReq = `request::${baseTopic}`
            const topicRes = `response::${baseTopic}`

            const correlationId = (globalThis.crypto?.randomUUID?.())
              || `${Date.now()}_${Math.random().toString(16).slice(2)}`

            return new Promise((resolve, reject) => {
              let timer

              const onRes = (msg = {}) => {
                if (msg.correlationId !== correlationId) return
                if (timer) clearTimeout(timer)
                store.off(topicRes, onRes)

                if (msg.error) {
                  const err = new Error(msg.error.message || 'RPC error')
                  Object.assign(err, msg.error)
                  reject(err)
                } else {
                  resolve(msg)
                }
              }

              store.on(topicRes, onRes)

              timer = setTimeout(() => {
                store.off(topicRes, onRes)
                reject(new Error(`Timeout after ${timeoutMs}ms for ${baseTopic}`))
              }, timeoutMs)

              store.emit(topicReq, { ...payload, correlationId, meta: { ts: Date.now() } })
            })
        },

        // Register a RPC handler for a given topic in the form <app>::<method>
        registerRpcMethod(appAndMethod, handler) {
            if (typeof appAndMethod !== 'string' || !/^[^:]+::[^:]+$/.test(appAndMethod)) {
              throw new Error(`registerRpcMethod(): expected "app::method", got "${String(appAndMethod)}"`)
            }

            // Build internal request/response topics
            const req = `request::${appAndMethod}`
            const res = `response::${appAndMethod}`

            const listener = async (msg = {}) => {
              const { correlationId } = msg
              try {
                const { correlationId: _ci, meta: _meta, ...payload } = msg
                const result = await handler(payload)

                 // Emit success response
                store.emit(res, {
                  correlationId,
                  ...(result ?? {}),
                  meta: { ts: Date.now() },
                })
              } catch (err) {
                // Emit error response
                store.emit(res, {
                  correlationId,
                  error: { message: err?.message || 'RPC error' },
                  meta: { ts: Date.now() },
                })
              }
            }

            store.on(req, listener)

            return () => store.off(req, listener)
        },

        // Change the state and notify via an event
        commit(mutation, payload) {
            if (typeof store.mutations[mutation] === 'function') {
                store.mutations[mutation](store.state, payload)
                store.emit(mutation + ':done', payload)
            }
        },

        // Execute actions (for asynchronous processes)
        dispatch(action, payload) {
            if (typeof store.actions[action] === 'function') {
                store.actions[action]({ commit: store.commit.bind(store), state: store.state }, payload)
            }
        },

        // Mutations (for synchronous state changes)
        mutations: {
            setLanguage(state, lang) {
                state.language = lang
                localStorage.setItem('lang', lang)
            },
            setIconbarShown(state, value) {
                state.isIconbarShown = value
            },
            updateBreadcrumbWithRoutes(state, routes) {
                state.breadcrumb = routes
            },
            updateTeridianValues(state, teridianValues) {
                state.teridianValues = teridianValues
            },
            updateSensorConfig(state, sensorConfig) {
                state.sensorConfig = sensorConfig
            },
            updateDeviceStatus(state, deviceStatus) {
                state.deviceStatus = deviceStatus
            },
            addApp(state, app) {
                state.apps.push(app)
                state.apps.sort(compareApps)
            },
            addAdapterConfig(state, config) {
                state.adapterConfigs.push(config)
            },
            addDeviceManagementConfig(state, config) {
                state.deviceManagementConfig.push(config)
            },
            setNavigation(state, nav) {
                state.navigation = nav
            },
            httpError(state, response) {
                state.alertMessage = response
            },
            requestOk(state, response) {
                state.statusMessage = response
            },
            requestWarning(state, response) {
                state.warningMessage = response
            },
            hideErrorAlert(state, toggle) {
                state.hideAlert = toggle
            },
            forceRedirect(state, toggle) {
                state.forceRedirect = toggle
            },
            updateTimezone(state, timezone) {
                state.timezone = timezone
                localStorage.setItem('timezone', timezone)
            },
            updateUnreadMessages(state, msgNr) {
                state.unreadMessages = msgNr
            },
            setEOL(state, toggle) {
                state.eol = toggle
            },
            setTimeInvalid(state, toggle) {
                state.invalidTime = toggle
            },
            updateViewMode(state, mode) {
                if (state.viewMode !== mode && (mode === 'apponly' || mode === 'full')) {
                    state.viewMode = mode
                }
            },
            setDangerHeader(state, dangerHeaderMessage) {
                state.dangerHeaderMessage = dangerHeaderMessage
            },
        },

        // Actions (for asynchronous state changes)
        actions: {
            updateNavigation({ commit }, nav) {
                commit('setNavigation', nav)
            },
        },

        // init method to initialize the store with options
        init(options) {
            if (options && typeof options === 'object') {
                for (let key in options) {
                    if (options.hasOwnProperty(key) && store.state.hasOwnProperty(key)) {
                        store.state[key] = options[key]
                    }
                }
            }
            store.emit('init', store.state)
        },
    }

    const rawGetters = {
        getLanguage:       (s) => s.language,
        getSidebarNav:     (s) => s.navigation.items.filter(item => !item.meta || (item.meta.position !== 'profile' && item.meta.position !== 'widget')),
        getProfileNav:     (s) => s.navigation.items.filter(item => item.meta && item.meta.position === 'profile'),
        isViewmodeApponly: (s) => s.viewMode === 'apponly',
        isViewmodeFull:    (s) => s.viewMode === 'full',
    }

    const getters = {}
    for (const [key, fn] of Object.entries(rawGetters)) {
    Object.defineProperty(getters, key, {
        get: () => fn(state),
        enumerable: true,
    })
    }
    store.getters = getters

    // Async module coordination
    const pendingModules = new Set()

    store.on('module:async', (promise) => {
        const safe = promise.catch(() => {})
        pendingModules.add(promise)
        safe.finally(() => pendingModules.delete(promise))
    })

    // Wait for all pending module promises with timeout protection.
    // Uses allSettled so a single failing module doesn't block the rest.
    store.awaitModules = ({ timeoutMs = 5000 } = {}) => {
        if (pendingModules.size === 0) return Promise.resolve()

        let timer
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`awaitModules: timeout after ${timeoutMs}ms`)), timeoutMs)
        })

        return Promise.race([
            Promise.allSettled([...pendingModules]).then((results) => {
                clearTimeout(timer)
                results.forEach((r, i) => {
                    if (r.status === 'rejected') {
                        console.warn(`module:async[${i}] failed:`, r.reason)
                    }
                })
                return results
            }),
            timeout
        ])
    }

    return store
}

function compareApps(app1, app2) {
    app1 = app1 || { order: 1 }
    app2 = app2 || { order: 1 }
    const numorder = (app1.order || 50) - (app2.order || 50)
    if (numorder !== 0) {
        return numorder
    } else {
        return +(app1.identifier > app2.identifier) - +(app1.identifier < app2.identifier)
    }
}

// Create the singleton store instance
if (!window.__emStoreInstance) {
  window.__emStoreInstance = createStore()
}

// Export the singleton instance so it can be used across the entire application
export default window.__emStoreInstance
