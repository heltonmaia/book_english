import { gradeCard, newCard } from './scheduler'

const T0 = 1_754_600_000_000 // fixed epoch ms; no Date.now() in tests

describe('newCard', () => {
  test('is due immediately and has no review history', () => {
    const c = newCard('u001.generic-plural.01', T0)
    expect(c.itemId).toBe('u001.generic-plural.01')
    expect(c.due).toBeLessThanOrEqual(T0)
    expect(c.reps).toBe(0)
    expect(c.lapses).toBe(0)
    expect(c.introducedAt).toBe(T0)
    expect(c.lastReview).toBeNull()
  })
})

describe('gradeCard', () => {
  test('good pushes the due date into the future and records the review', () => {
    const next = gradeCard(newCard('x.y.01', T0), 'good', T0)
    expect(next.due).toBeGreaterThan(T0)
    expect(next.reps).toBe(1)
    expect(next.lastReview).toBe(T0)
  })

  test('again keeps the card due within the same day', () => {
    const next = gradeCard(newCard('x.y.01', T0), 'again', T0)
    expect(next.due - T0).toBeLessThan(24 * 60 * 60 * 1000)
  })

  test('hard schedules sooner than good on the same card', () => {
    const base = gradeCard(newCard('x.y.01', T0), 'good', T0)
    const hard = gradeCard(base, 'hard', base.due)
    const good = gradeCard(base, 'good', base.due)
    expect(hard.due).toBeLessThan(good.due)
  })

  test('again increments lapses on a card that was already learned', () => {
    const learned = gradeCard(gradeCard(newCard('x.y.01', T0), 'good', T0), 'good', T0 + 86_400_000)
    const lapsed = gradeCard(learned, 'again', learned.due)
    expect(lapsed.lapses).toBeGreaterThan(learned.lapses)
  })

  test('preserves itemId and introducedAt across grading', () => {
    const c = newCard('u001.judge.04', T0)
    const next = gradeCard(c, 'good', T0)
    expect(next.itemId).toBe('u001.judge.04')
    expect(next.introducedAt).toBe(T0)
  })

  test('the returned card is serializable (no Date instances)', () => {
    const next = gradeCard(newCard('x.y.01', T0), 'good', T0)
    for (const v of Object.values(next)) expect((v as unknown) instanceof Date).toBe(false)
    expect(() => JSON.stringify(next)).not.toThrow()
  })
})
