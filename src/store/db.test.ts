import { DEFAULT_SETTINGS, memoryStore, openStore } from './db'
import { newCard } from '@/engine/scheduler'

const T0 = 1_754_600_000_000

describe('memoryStore', () => {
  test('round-trips cards', async () => {
    const s = memoryStore()
    await s.putCard(newCard('a.b.01', T0))
    const all = await s.getCards()
    expect(all).toHaveLength(1)
    expect(all[0]!.itemId).toBe('a.b.01')
  })

  test('putCard overwrites by itemId rather than appending', async () => {
    const s = memoryStore()
    await s.putCard(newCard('a.b.01', T0))
    await s.putCard({ ...newCard('a.b.01', T0), reps: 5 })
    const all = await s.getCards()
    expect(all).toHaveLength(1)
    expect(all[0]!.reps).toBe(5)
  })

  test('settings default until written', async () => {
    const s = memoryStore()
    expect(await s.getSettings()).toEqual(DEFAULT_SETTINGS)
    await s.putSettings({ ...DEFAULT_SETTINGS, newPerDay: 5 })
    expect((await s.getSettings()).newPerDay).toBe(5)
  })

  test('replaceAll wipes previous cards', async () => {
    const s = memoryStore()
    await s.putCard(newCard('a.b.01', T0))
    await s.replaceAll([newCard('c.d.02', T0)], DEFAULT_SETTINGS)
    const all = await s.getCards()
    expect(all.map((c) => c.itemId)).toEqual(['c.d.02'])
  })

  test('session counter starts at zero, persists, and resets on replaceAll', async () => {
    const s = memoryStore()
    expect(await s.getSessionsSinceExport()).toBe(0)
    await s.putSessionsSinceExport(7)
    expect(await s.getSessionsSinceExport()).toBe(7)
    await s.replaceAll([], DEFAULT_SETTINGS)
    expect(await s.getSessionsSinceExport()).toBe(0)
  })
})

describe('openStore', () => {
  test('falls back to a memory store and reports non-persistent when indexedDB is missing', async () => {
    const original = globalThis.indexedDB
    // @ts-expect-error - simulating a browser without IndexedDB
    delete globalThis.indexedDB
    try {
      const { store, persistent } = await openStore()
      expect(persistent).toBe(false)
      await store.putCard(newCard('a.b.01', T0))
      expect(await store.getCards()).toHaveLength(1)
    } finally {
      globalThis.indexedDB = original
    }
  })
})
