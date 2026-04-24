import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from './store.js'

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: vi.fn((key) => localStorageMock.store[key] ?? null),
    setItem: vi.fn((key, val) => { localStorageMock.store[key] = val }),
    clear() { this.store = {}; this.getItem.mockClear(); this.setItem.mockClear() },
}
vi.stubGlobal('localStorage', localStorageMock)

describe('Store', () => {
    let store

    beforeEach(() => {
        localStorageMock.clear()
        store = createStore()
    })

    // ── Event Bus ────────────────────────────────────────────────

    describe('Event Bus', () => {
        it('on/emit delivers payload to listener', () => {
            const cb = vi.fn()
            store.on('test', cb)
            store.emit('test', 'hello')
            expect(cb).toHaveBeenCalledWith('hello')
        })

        it('off removes listener', () => {
            const cb = vi.fn()
            store.on('test', cb)
            store.off('test', cb)
            store.emit('test', 'hello')
            expect(cb).not.toHaveBeenCalled()
        })

        it('emit with no listeners does not throw', () => {
            expect(() => store.emit('nonexistent', 'data')).not.toThrow()
        })

        it('once fires only once', () => {
            const cb = vi.fn()
            store.once('test', cb)
            store.emit('test', 'first')
            store.emit('test', 'second')
            expect(cb).toHaveBeenCalledTimes(1)
            expect(cb).toHaveBeenCalledWith('first')
        })
    })

    // ── Commit / Mutations ───────────────────────────────────────

    describe('Commit', () => {
        it('commit applies mutation and emits done event', () => {
            const cb = vi.fn()
            store.on('setLanguage:done', cb)
            store.commit('setLanguage', 'de')
            expect(store.state.language).toBe('de')
            expect(cb).toHaveBeenCalledWith('de')
        })

        it('commit with unknown mutation does nothing', () => {
            expect(() => store.commit('nonexistent', 'data')).not.toThrow()
        })

        it('addApp sorts by order', () => {
            store.commit('addApp', { identifier: 'b', order: 20 })
            store.commit('addApp', { identifier: 'a', order: 10 })
            expect(store.state.apps[0].identifier).toBe('a')
            expect(store.state.apps[1].identifier).toBe('b')
        })

        it('addApp sorts alphabetically when same order', () => {
            store.commit('addApp', { identifier: 'zebra', order: 10 })
            store.commit('addApp', { identifier: 'alpha', order: 10 })
            expect(store.state.apps[0].identifier).toBe('alpha')
        })

        it('addApp handles apps without order property', () => {
            store.commit('addApp', { identifier: 'no-order' })
            store.commit('addApp', { identifier: 'with-order', order: 10 })
            expect(store.state.apps[0].identifier).toBe('with-order')
            expect(store.state.apps[1].identifier).toBe('no-order') // default order 50
        })
    })

    // ── Specific Mutations ───────────────────────────────────────

    describe('Specific Mutations', () => {
        it('setLanguage updates state and localStorage', () => {
            store.commit('setLanguage', 'de')
            expect(store.state.language).toBe('de')
            expect(localStorageMock.setItem).toHaveBeenCalledWith('lang', 'de')
        })

        it('updateTimezone updates state and localStorage', () => {
            store.commit('updateTimezone', 'Europe/Berlin')
            expect(store.state.timezone).toBe('Europe/Berlin')
            expect(localStorageMock.setItem).toHaveBeenCalledWith('timezone', 'Europe/Berlin')
        })

        it('updateViewMode only accepts valid modes', () => {
            store.commit('updateViewMode', 'apponly')
            expect(store.state.viewMode).toBe('apponly')

            store.commit('updateViewMode', 'invalid-mode')
            expect(store.state.viewMode).toBe('apponly') // unchanged

            store.commit('updateViewMode', 'full')
            expect(store.state.viewMode).toBe('full')
        })

        it('updateViewMode ignores same mode', () => {
            expect(store.state.viewMode).toBe('full')
            store.commit('updateViewMode', 'full')
            expect(store.state.viewMode).toBe('full')
        })
    })

    // ── Dispatch / Actions ───────────────────────────────────────

    describe('Dispatch', () => {
        it('dispatch calls action with commit and state', () => {
            const cb = vi.fn()
            store.on('setNavigation:done', cb)
            store.dispatch('updateNavigation', { items: [{ id: 1 }] })
            expect(store.state.navigation).toEqual({ items: [{ id: 1 }] })
        })

        it('dispatch with unknown action does nothing', () => {
            expect(() => store.dispatch('nonexistent', 'data')).not.toThrow()
        })
    })

    // ── Getters ──────────────────────────────────────────────────

    describe('Getters', () => {
        it('getLanguage returns current language', () => {
            store.commit('setLanguage', 'fr')
            expect(store.getters.getLanguage).toBe('fr')
        })

        it('isViewmodeApponly / isViewmodeFull reflect state', () => {
            expect(store.getters.isViewmodeFull).toBe(true)
            expect(store.getters.isViewmodeApponly).toBe(false)
            store.commit('updateViewMode', 'apponly')
            expect(store.getters.isViewmodeApponly).toBe(true)
            expect(store.getters.isViewmodeFull).toBe(false)
        })

        it('getSidebarNav filters out profile and widget items', () => {
            store.commit('setNavigation', {
                items: [
                    { id: 1, title: 'Home' },
                    { id: 2, title: 'Settings', meta: { position: 'sidebar' } },
                    { id: 3, title: 'Profile', meta: { position: 'profile' } },
                    { id: 4, title: 'Widget', meta: { position: 'widget' } },
                ]
            })

            const sidebar = store.getters.getSidebarNav
            expect(sidebar).toHaveLength(2)
            expect(sidebar[0].id).toBe(1)
            expect(sidebar[1].id).toBe(2)
        })

        it('getProfileNav returns only profile items', () => {
            store.commit('setNavigation', {
                items: [
                    { id: 1, title: 'Home' },
                    { id: 2, title: 'Profile', meta: { position: 'profile' } },
                    { id: 3, title: 'Account', meta: { position: 'profile' } },
                    { id: 4, title: 'Widget', meta: { position: 'widget' } },
                ]
            })

            const profile = store.getters.getProfileNav
            expect(profile).toHaveLength(2)
            expect(profile[0].id).toBe(2)
            expect(profile[1].id).toBe(3)
        })
    })

    // ── Initial State Fallbacks ──────────────────────────────────

    describe('Initial State Fallbacks', () => {
        it('initializes language from localStorage if available', () => {
            localStorageMock.store['lang'] = 'fr'
            const newStore = createStore()
            expect(newStore.state.language).toBe('fr')
        })

        it('initializes timezone from localStorage if available', () => {
            localStorageMock.store['timezone'] = 'Asia/Tokyo'
            const newStore = createStore()
            expect(newStore.state.timezone).toBe('Asia/Tokyo')
        })

        it('falls back to en when no localStorage and no navigator language', () => {
            const origNav = navigator.language
            Object.defineProperty(navigator, 'language', { value: undefined, configurable: true })
            const newStore = createStore()
            expect(newStore.state.language).toBe('en')
            Object.defineProperty(navigator, 'language', { value: origNav, configurable: true })
        })
    })

    // ── waitFor ──────────────────────────────────────────────────

    describe('waitFor', () => {
        it('resolves when event is emitted', async () => {
            const promise = store.waitFor('test:done')
            store.emit('test:done', 'payload')
            await expect(promise).resolves.toBe('payload')
        })

        it('rejects on timeout', async () => {
            const promise = store.waitFor('never', { timeoutMs: 50 })
            await expect(promise).rejects.toThrow('Timeout')
        })

        it('respects predicate', async () => {
            const promise = store.waitFor('test:done', {
                predicate: (p) => p === 'correct',
            })
            store.emit('test:done', 'wrong')
            store.emit('test:done', 'correct')
            await expect(promise).resolves.toBe('correct')
        })
    })

    // ── RPC ──────────────────────────────────────────────────────

    describe('RPC', () => {
        it('rpc resolves with handler response', async () => {
            store.registerRpcMethod('app::method', (payload) => {
                return { result: payload.value * 2 }
            })
            const res = await store.rpc('app::method', { value: 21 })
            expect(res.result).toBe(42)
        })

        it('rpc rejects on handler error', async () => {
            store.registerRpcMethod('app::fail', () => {
                throw new Error('boom')
            })
            await expect(store.rpc('app::fail')).rejects.toThrow('boom')
        })

        it('rpc rejects on timeout', async () => {
            await expect(
                store.rpc('app::nobody', {}, { timeoutMs: 50 })
            ).rejects.toThrow('Timeout')
        })

        it('rpc rejects on invalid topic format', () => {
            expect(() => store.rpc('invalid')).toThrow('expected "app::method"')
        })

        it('registerRpcMethod returns unsubscribe function', async () => {
            const unsub = store.registerRpcMethod('app::temp', () => ({ ok: true }))
            unsub()
            await expect(
                store.rpc('app::temp', {}, { timeoutMs: 50 })
            ).rejects.toThrow('Timeout')
        })
    })

    // ── awaitModules ─────────────────────────────────────────────

    describe('awaitModules', () => {
        it('resolves immediately when no modules pending', async () => {
            await expect(store.awaitModules()).resolves.toBeUndefined()
        })

        it('waits for a single module promise', async () => {
            const order = []
            store.emit('module:async',
                new Promise((resolve) => setTimeout(() => {
                    order.push('module')
                    resolve()
                }, 50))
            )
            await store.awaitModules()
            order.push('done')
            expect(order).toEqual(['module', 'done'])
        })

        it('waits for multiple module promises', async () => {
            let resolved = 0
            store.emit('module:async', new Promise((r) => setTimeout(() => { resolved++; r() }, 30)))
            store.emit('module:async', new Promise((r) => setTimeout(() => { resolved++; r() }, 60)))
            await store.awaitModules()
            expect(resolved).toBe(2)
        })

        it('does not block on a single rejected module (allSettled)', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            store.emit('module:async', new Promise((resolve) => setTimeout(resolve, 10)))
            store.emit('module:async', new Promise((_, reject) => setTimeout(() => reject(new Error('fail')), 10)))
            const results = await store.awaitModules()
            expect(results).toHaveLength(2)
            expect(results[0].status).toBe('fulfilled')
            expect(results[1].status).toBe('rejected')
            expect(spy).toHaveBeenCalledOnce()
            spy.mockRestore()
        })

        it('rejects on timeout when a module hangs', async () => {
            store.emit('module:async', new Promise(() => {})) // never resolves
            await expect(
                store.awaitModules({ timeoutMs: 50 })
            ).rejects.toThrow('timeout after 50ms')
        })

        it('cleans up resolved promises from Set', async () => {
            store.emit('module:async', Promise.resolve())
            await store.awaitModules()
            // Second call should resolve immediately (Set is empty)
            await expect(store.awaitModules()).resolves.toBeUndefined()
        })
    })

    // ── init ─────────────────────────────────────────────────────

    describe('init', () => {
        it('merges known keys into state', () => {
            store.init({ language: 'ja', eol: true })
            expect(store.state.language).toBe('ja')
            expect(store.state.eol).toBe(true)
        })

        it('ignores unknown keys', () => {
            store.init({ unknownKey: 'value' })
            expect(store.state.unknownKey).toBeUndefined()
        })

        it('emits init event', () => {
            const cb = vi.fn()
            store.on('init', cb)
            store.init({})
            expect(cb).toHaveBeenCalledWith(store.state)
        })
    })
})