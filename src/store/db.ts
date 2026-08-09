import { openDB, type IDBPDatabase } from 'idb'
import type { StoredCard } from '@/engine/scheduler'

export type Settings = { newPerDay: number; theme: 'system' | 'light' | 'dark' }
export const DEFAULT_SETTINGS: Settings = { newPerDay: 12, theme: 'system' }

export type Store = {
  getCards(): Promise<StoredCard[]>
  putCard(card: StoredCard): Promise<void>
  getSettings(): Promise<Settings>
  putSettings(s: Settings): Promise<void>
  /** Sessions finished since the last export — drives the backup reminder. */
  getSessionsSinceExport(): Promise<number>
  putSessionsSinceExport(n: number): Promise<void>
  replaceAll(cards: StoredCard[], s: Settings): Promise<void>
}

const DB_NAME = 'book-english'
const CARDS = 'cards'
const META = 'meta'

export function memoryStore(): Store {
  const cards = new Map<string, StoredCard>()
  let settings: Settings = { ...DEFAULT_SETTINGS }
  let sessions = 0
  return {
    async getCards() { return [...cards.values()] },
    async putCard(c) { cards.set(c.itemId, c) },
    async getSettings() { return { ...settings } },
    async putSettings(s) { settings = { ...s } },
    async getSessionsSinceExport() { return sessions },
    async putSessionsSinceExport(n) { sessions = n },
    async replaceAll(next, s) {
      cards.clear()
      for (const c of next) cards.set(c.itemId, c)
      settings = { ...s }
      sessions = 0
    },
  }
}

function idbStore(db: IDBPDatabase): Store {
  return {
    async getCards() { return (await db.getAll(CARDS)) as StoredCard[] },
    async putCard(c) { await db.put(CARDS, c) },
    async getSettings() {
      return ((await db.get(META, 'settings')) as Settings) ?? { ...DEFAULT_SETTINGS }
    },
    async putSettings(s) { await db.put(META, s, 'settings') },
    async getSessionsSinceExport() {
      return ((await db.get(META, 'sessionsSinceExport')) as number) ?? 0
    },
    async putSessionsSinceExport(n) { await db.put(META, n, 'sessionsSinceExport') },
    async replaceAll(next, s) {
      const tx = db.transaction([CARDS, META], 'readwrite')
      await tx.objectStore(CARDS).clear()
      for (const c of next) await tx.objectStore(CARDS).put(c)
      await tx.objectStore(META).put(s, 'settings')
      await tx.objectStore(META).put(0, 'sessionsSinceExport')
      await tx.done
    },
  }
}

/**
 * Never throws. When IndexedDB is unavailable (Safari private mode, quota,
 * blocked storage) the caller gets a working in-memory store and
 * `persistent: false`, which the UI must surface — silently pretending to
 * save is the one behavior we refuse.
 */
export async function openStore(): Promise<{ store: Store; persistent: boolean }> {
  try {
    if (typeof indexedDB === 'undefined') return { store: memoryStore(), persistent: false }
    const db = await openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(CARDS)) {
          database.createObjectStore(CARDS, { keyPath: 'itemId' })
        }
        if (!database.objectStoreNames.contains(META)) database.createObjectStore(META)
      },
    })
    return { store: idbStore(db), persistent: true }
  } catch {
    return { store: memoryStore(), persistent: false }
  }
}
