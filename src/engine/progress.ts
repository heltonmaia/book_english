import type { StoredCard } from './scheduler'
import { DEFAULT_SETTINGS, type Settings } from '@/store/db'

export type ProgressFile = {
  version: 1
  exportedAt: number
  cards: StoredCard[]
  settings: Settings
}

const NUMERIC_FIELDS = [
  'due', 'stability', 'difficulty', 'elapsedDays', 'scheduledDays',
  'learningSteps', 'reps', 'lapses', 'state', 'introducedAt',
] as const

export function serializeProgress(
  cards: StoredCard[], settings: Settings, exportedAt: number,
): string {
  const file: ProgressFile = { version: 1, exportedAt, cards, settings }
  return JSON.stringify(file, null, 2)
}

/** Validates the whole file before returning. Never applies partially. */
export function parseProgress(json: string): ProgressFile {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('This file is not a progress file.')
  const o = raw as Record<string, unknown>

  if (o.version !== 1) throw new Error('Unsupported progress file version.')
  if (typeof o.exportedAt !== 'number') throw new Error('Progress file has no export timestamp.')
  if (!Array.isArray(o.cards)) throw new Error('Progress file has no cards array.')

  const cards = o.cards.map((c, n) => {
    if (typeof c !== 'object' || c === null) throw new Error(`Card ${n} is not an object.`)
    const card = c as Record<string, unknown>
    if (typeof card.itemId !== 'string' || card.itemId.length === 0) {
      throw new Error(`Card ${n} has no itemId.`)
    }
    for (const f of NUMERIC_FIELDS) {
      if (typeof card[f] !== 'number' || !Number.isFinite(card[f])) {
        throw new Error(`Card ${n} (${card.itemId}) has an invalid "${f}".`)
      }
    }
    if (card.lastReview !== null && typeof card.lastReview !== 'number') {
      throw new Error(`Card ${n} (${card.itemId}) has an invalid "lastReview".`)
    }
    return card as unknown as StoredCard
  })

  const s = o.settings
  if (typeof s !== 'object' || s === null) throw new Error('Progress file has no settings.')
  const settings = s as Record<string, unknown>
  if (typeof settings.newPerDay !== 'number' || !Number.isFinite(settings.newPerDay)) {
    throw new Error('Progress file settings have an invalid "newPerDay".')
  }
  if (!['system', 'light', 'dark'].includes(String(settings.theme))) {
    throw new Error('Progress file settings have an invalid "theme".')
  }

  return {
    version: 1,
    exportedAt: o.exportedAt,
    cards,
    settings: { ...DEFAULT_SETTINGS, ...(settings as unknown as Settings) },
  }
}
