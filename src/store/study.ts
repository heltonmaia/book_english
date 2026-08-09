import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { ItemId } from '@/content/types'
import { gradeCard, newCard, type Grade, type StoredCard } from '@/engine/scheduler'
import { buildReviewQueue, newItemsRemainingToday } from '@/engine/queue'
import { parseProgress, serializeProgress } from '@/engine/progress'
import { DEFAULT_SETTINGS, openStore, type Settings, type Store } from './db'

/** Spec §5: nudge a backup after this many sessions without an export. */
export const EXPORT_REMINDER_AFTER = 20

export type StudyState = {
  cards: Record<ItemId, StoredCard>
  settings: Settings
  sessionsSinceExport: number
  persistent: boolean
  ready: boolean
  hydrate(): Promise<void>
  introduce(itemIds: ItemId[], now: number): Promise<void>
  answer(itemId: ItemId, grade: Grade, now: number): Promise<void>
  setSettings(patch: Partial<Settings>): Promise<void>
  completeSession(): Promise<void>
  exportProgress(now: number): string
  importProgress(json: string): Promise<void>
}

type Opener = () => Promise<{ store: Store; persistent: boolean }>

export function createStudyStore(opener: Opener = openStore) {
  let store: Store | null = null

  return createStore<StudyState>((set, get) => ({
    cards: {},
    settings: { ...DEFAULT_SETTINGS },
    sessionsSinceExport: 0,
    persistent: false,
    ready: false,

    async hydrate() {
      const opened = await opener()
      store = opened.store
      const [cards, settings, sessionsSinceExport] = await Promise.all([
        store.getCards(), store.getSettings(), store.getSessionsSinceExport(),
      ])
      set({
        cards: Object.fromEntries(cards.map((c) => [c.itemId, c])),
        settings,
        sessionsSinceExport,
        persistent: opened.persistent,
        ready: true,
      })
    },

    async introduce(itemIds, now) {
      const existing = get().cards
      const fresh = itemIds.filter((id) => !existing[id]).map((id) => newCard(id, now))
      if (fresh.length === 0) return
      for (const c of fresh) await store?.putCard(c)
      set({ cards: { ...existing, ...Object.fromEntries(fresh.map((c) => [c.itemId, c])) } })
    },

    async answer(itemId, grade, now) {
      const current = get().cards[itemId] ?? newCard(itemId, now)
      const next = gradeCard(current, grade, now)
      await store?.putCard(next)
      set({ cards: { ...get().cards, [itemId]: next } })
    },

    async setSettings(patch) {
      const settings = { ...get().settings, ...patch }
      await store?.putSettings(settings)
      set({ settings })
    },

    async completeSession() {
      const next = get().sessionsSinceExport + 1
      await store?.putSessionsSinceExport(next)
      set({ sessionsSinceExport: next })
    },

    exportProgress(now) {
      const json = serializeProgress(Object.values(get().cards), get().settings, now)
      void store?.putSessionsSinceExport(0)
      set({ sessionsSinceExport: 0 })
      return json
    },

    async importProgress(json) {
      const file = parseProgress(json) // throws before anything is touched
      await store?.replaceAll(file.cards, file.settings)
      set({
        cards: Object.fromEntries(file.cards.map((c) => [c.itemId, c])),
        settings: file.settings,
        sessionsSinceExport: 0,
      })
    },
  }))
}

export const studyStore = createStudyStore()
export function useStudy<T>(selector: (s: StudyState) => T): T {
  return useStore(studyStore, selector)
}

// Pure selectors — kept out of the store so they stay trivially testable.
export function reviewQueue(state: StudyState, known: Set<ItemId>, now: number): ItemId[] {
  return buildReviewQueue(Object.values(state.cards), known, now)
}
export function newRemaining(state: StudyState, now: number): number {
  return newItemsRemainingToday(Object.values(state.cards), now, state.settings.newPerDay)
}
