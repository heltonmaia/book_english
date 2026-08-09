import { buildReviewQueue, introducedToday, newItemsRemainingToday, orphanIds } from './queue'
import { newCard, type StoredCard } from './scheduler'

const T0 = 1_754_600_000_000
const DAY = 86_400_000
const card = (itemId: string, over: Partial<StoredCard> = {}): StoredCard =>
  ({ ...newCard(itemId, T0), ...over })

const known = (...ids: string[]) => new Set(ids)

describe('buildReviewQueue', () => {
  test('includes only cards due at or before now', () => {
    const cards = [
      card('a.b.01', { due: T0 - DAY }),
      card('a.b.02', { due: T0 + DAY }),
    ]
    expect(buildReviewQueue(cards, known('a.b.01', 'a.b.02'), T0)).toEqual(['a.b.01'])
  })

  test('sorts by due date, oldest first', () => {
    const cards = [
      card('a.b.02', { due: T0 - DAY }),
      card('a.b.01', { due: T0 - 3 * DAY }),
    ]
    expect(buildReviewQueue(cards, known('a.b.01', 'a.b.02'), T0)).toEqual(['a.b.01', 'a.b.02'])
  })

  test('drops orphans whose item no longer exists in the corpus', () => {
    const cards = [card('gone.x.01', { due: T0 - DAY }), card('a.b.01', { due: T0 - DAY })]
    expect(buildReviewQueue(cards, known('a.b.01'), T0)).toEqual(['a.b.01'])
  })
})

describe('introducedToday', () => {
  test('counts cards introduced since local midnight', () => {
    const cards = [
      card('a.b.01', { introducedAt: T0 }),
      card('a.b.02', { introducedAt: T0 - 3 * DAY }),
    ]
    expect(introducedToday(cards, T0)).toBe(1)
  })
})

describe('newItemsRemainingToday', () => {
  test('subtracts what was already introduced today', () => {
    const cards = [card('a.b.01', { introducedAt: T0 }), card('a.b.02', { introducedAt: T0 })]
    expect(newItemsRemainingToday(cards, T0, 12)).toBe(10)
  })
  test('never goes below zero when the cap was lowered', () => {
    const cards = [card('a.b.01', { introducedAt: T0 }), card('a.b.02', { introducedAt: T0 })]
    expect(newItemsRemainingToday(cards, T0, 1)).toBe(0)
  })
})

describe('orphanIds', () => {
  test('reports cards whose item is gone from the corpus', () => {
    expect(orphanIds([card('gone.x.01'), card('a.b.01')], known('a.b.01'))).toEqual(['gone.x.01'])
  })
})
