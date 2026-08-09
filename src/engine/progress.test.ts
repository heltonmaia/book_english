import { parseProgress, serializeProgress } from './progress'
import { newCard } from './scheduler'
import { DEFAULT_SETTINGS } from '@/store/db'

const T0 = 1_754_600_000_000

test('round-trips cards and settings', () => {
  const cards = [newCard('a.b.01', T0), newCard('a.b.02', T0)]
  const parsed = parseProgress(serializeProgress(cards, DEFAULT_SETTINGS, T0))
  expect(parsed.cards).toEqual(cards)
  expect(parsed.settings).toEqual(DEFAULT_SETTINGS)
  expect(parsed.exportedAt).toBe(T0)
  expect(parsed.version).toBe(1)
})

test('rejects malformed JSON', () => {
  expect(() => parseProgress('{ not json')).toThrow(/not valid JSON/i)
})

test('rejects an unknown file version', () => {
  const bad = JSON.stringify({ version: 99, exportedAt: T0, cards: [], settings: DEFAULT_SETTINGS })
  expect(() => parseProgress(bad)).toThrow(/version/i)
})

test('rejects a file whose cards are not an array', () => {
  const bad = JSON.stringify({ version: 1, exportedAt: T0, cards: {}, settings: DEFAULT_SETTINGS })
  expect(() => parseProgress(bad)).toThrow(/cards/i)
})

test('rejects a card missing required numeric fields', () => {
  const bad = JSON.stringify({
    version: 1, exportedAt: T0, settings: DEFAULT_SETTINGS,
    cards: [{ itemId: 'a.b.01', due: 'soon' }],
  })
  expect(() => parseProgress(bad)).toThrow(/card/i)
})

test('rejects settings with a non-numeric newPerDay', () => {
  const bad = JSON.stringify({
    version: 1, exportedAt: T0, cards: [],
    settings: { newPerDay: 'lots', theme: 'system' },
  })
  expect(() => parseProgress(bad)).toThrow(/settings/i)
})
