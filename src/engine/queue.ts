import type { ItemId } from '@/content/types'
import type { StoredCard } from './scheduler'

/** Local midnight for the day containing `now`. */
export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function orphanIds(cards: StoredCard[], known: Set<ItemId>): ItemId[] {
  return cards.filter((c) => !known.has(c.itemId)).map((c) => c.itemId)
}

export function buildReviewQueue(
  cards: StoredCard[], known: Set<ItemId>, now: number,
): ItemId[] {
  return cards
    .filter((c) => known.has(c.itemId) && c.due <= now)
    .sort((a, b) => a.due - b.due)
    .map((c) => c.itemId)
}

export function introducedToday(cards: StoredCard[], now: number): number {
  const midnight = startOfDay(now)
  return cards.filter((c) => c.introducedAt >= midnight).length
}

export function newItemsRemainingToday(
  cards: StoredCard[], now: number, cap: number,
): number {
  return Math.max(0, cap - introducedToday(cards, now))
}
