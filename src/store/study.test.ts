import { createStudyStore, newRemaining, reviewQueue } from './study'
import { memoryStore } from './db'

const T0 = 1_754_600_000_000
const DAY = 86_400_000

test('hydrate marks the store ready and reports persistence', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  expect(s.getState().ready).toBe(true)
  expect(s.getState().persistent).toBe(true)
})

test('hydrate surfaces a non-persistent store instead of hiding it', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: false }))
  await s.getState().hydrate()
  expect(s.getState().persistent).toBe(false)
})

test('introduce creates cards due immediately', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  await s.getState().introduce(['u001.generic-plural.01'], T0)
  expect(reviewQueue(s.getState(), new Set(['u001.generic-plural.01']), T0))
    .toEqual(['u001.generic-plural.01'])
})

test('introduce is idempotent and does not reset an existing card', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  await s.getState().introduce(['a.b.01'], T0)
  await s.getState().answer('a.b.01', 'good', T0)
  const after = s.getState().cards['a.b.01']!
  await s.getState().introduce(['a.b.01'], T0 + DAY)
  expect(s.getState().cards['a.b.01']).toEqual(after)
})

test('answer advances the card and persists it', async () => {
  const store = memoryStore()
  const s = createStudyStore(async () => ({ store, persistent: true }))
  await s.getState().hydrate()
  await s.getState().introduce(['a.b.01'], T0)
  await s.getState().answer('a.b.01', 'good', T0)
  expect(s.getState().cards['a.b.01']!.reps).toBe(1)
  expect((await store.getCards())[0]!.reps).toBe(1)
})

test('newRemaining reflects the configured cap', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  await s.getState().setSettings({ newPerDay: 3 })
  await s.getState().introduce(['a.b.01', 'a.b.02'], T0)
  expect(newRemaining(s.getState(), T0)).toBe(1)
})

test('completeSession counts toward the export reminder and exporting resets it', async () => {
  const store = memoryStore()
  const s = createStudyStore(async () => ({ store, persistent: true }))
  await s.getState().hydrate()
  await s.getState().completeSession()
  await s.getState().completeSession()
  expect(s.getState().sessionsSinceExport).toBe(2)
  expect(await store.getSessionsSinceExport()).toBe(2)

  s.getState().exportProgress(T0)
  expect(s.getState().sessionsSinceExport).toBe(0)
})

test('the session counter survives a reload', async () => {
  const store = memoryStore()
  const first = createStudyStore(async () => ({ store, persistent: true }))
  await first.getState().hydrate()
  await first.getState().completeSession()

  const second = createStudyStore(async () => ({ store, persistent: true }))
  await second.getState().hydrate()
  expect(second.getState().sessionsSinceExport).toBe(1)
})

test('importProgress replaces state wholesale and rejects a bad file untouched', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  await s.getState().introduce(['a.b.01'], T0)
  const exported = s.getState().exportProgress(T0)

  await s.getState().introduce(['c.d.02'], T0)
  expect(Object.keys(s.getState().cards)).toHaveLength(2)

  await s.getState().importProgress(exported)
  expect(Object.keys(s.getState().cards)).toEqual(['a.b.01'])

  await expect(s.getState().importProgress('{ nope')).rejects.toThrow()
  expect(Object.keys(s.getState().cards)).toEqual(['a.b.01'])
})
