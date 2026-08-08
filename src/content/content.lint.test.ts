import { expect, test } from 'vitest'
import { UNITS, allItems } from './index'
import { BLANK } from './types'
import { PART_IDS, PHENOMENA } from './taxonomy'

test('corpus is not empty', () => {
  expect(UNITS.length).toBeGreaterThan(0)
})

test('unit ids and slugs are unique', () => {
  const ids = UNITS.map((u) => u.id)
  const slugs = UNITS.map((u) => u.slug)
  expect(ids.filter((id, n) => ids.indexOf(id) !== n), 'duplicate unit ids').toEqual([])
  expect(slugs.filter((s, n) => slugs.indexOf(s) !== n), 'duplicate unit slugs').toEqual([])
})

test('every unit declares a known part and at least one block and item', () => {
  for (const u of UNITS) {
    expect(PART_IDS, `unknown part on unit ${u.id}`).toContain(u.part)
    expect(u.blocks.length, `unit ${u.id} has no blocks`).toBeGreaterThan(0)
    expect(u.items.length, `unit ${u.id} has no items`).toBeGreaterThan(0)
  }
})

test('item ids are unique across the whole corpus', () => {
  const ids = allItems().map((i) => i.id)
  const dupes = ids.filter((id, n) => ids.indexOf(id) !== n)
  expect(dupes).toEqual([])
})

test('every item has a non-empty why and a known phenomenon', () => {
  for (const i of allItems()) {
    expect(i.why.trim().length, `empty why on ${i.id}`).toBeGreaterThan(0)
    expect(PHENOMENA, `unknown phenomenon on ${i.id}`).toContain(i.phenomenon)
  }
})

// A unit's declared `phenomena` must cover what its items actually test.
// Nothing else catches an incomplete list: the check above only validates each
// item against the GLOBAL taxonomy, never against its own unit's declaration.
// The Progress screen groups accuracy by phenomenon, so a unit that under-declares
// silently drops itself out of its own statistics.
test('every unit declares the phenomena its items test', () => {
  for (const u of UNITS) {
    const tested = [...new Set(u.items.map((i) => i.phenomenon))]
    const undeclared = tested.filter((p) => !u.phenomena.includes(p))
    expect(undeclared, `unit ${u.id} tests phenomena it does not declare`).toEqual([])
  }
})

test('gap items have exactly one blank and at least one accepted answer', () => {
  for (const i of allItems()) {
    if (i.kind !== 'gap') continue
    expect(i.context.split(BLANK).length - 1, `blank count on ${i.id}`).toBe(1)
    expect(i.answers.length, `no answers on ${i.id}`).toBeGreaterThan(0)
  }
})

test('transform items have at least one accepted answer', () => {
  for (const i of allItems()) {
    if (i.kind !== 'transform') continue
    expect(i.answers.length, `no answers on ${i.id}`).toBeGreaterThan(0)
  }
})

test('choice items have in-range correct index and at least two options', () => {
  for (const i of allItems()) {
    if (i.kind !== 'choice') continue
    expect(i.options.length, `too few options on ${i.id}`).toBeGreaterThanOrEqual(2)
    expect(i.correct, `negative correct index on ${i.id}`).toBeGreaterThanOrEqual(0)
    expect(i.correct, `correct index out of range on ${i.id}`).toBeLessThan(i.options.length)
  }
})

test('errorHunt spans fall inside the text', () => {
  for (const i of allItems()) {
    if (i.kind !== 'errorHunt') continue
    const [a, b] = i.span
    expect(a, `negative span start on ${i.id}`).toBeGreaterThanOrEqual(0)
    expect(b, `empty or inverted span on ${i.id}`).toBeGreaterThan(a)
    expect(b, `span runs past the text on ${i.id}`).toBeLessThanOrEqual(i.text.length)
  }
})

test('item ids follow the u<NNN>.<slug>.<NN> convention', () => {
  for (const i of allItems()) {
    expect(i.id, `malformed id ${i.id}`).toMatch(/^u\d{3}\.[a-z0-9-]+\.\d{2}$/)
  }
})

// Spec §4: ~10 items per unit, at least 2 judge and 2 gap. `judge` is fast on
// touch and diagnostic for fossilization; `gap` forces production. A unit made
// only of multiple choice would be recognition practice, which is what this
// whole design is built to avoid.
test('every unit has a workable item mix', () => {
  for (const u of UNITS) {
    const count = (kind: string) => u.items.filter((i) => i.kind === kind).length
    expect(u.items.length, `unit ${u.id} has too few items`).toBeGreaterThanOrEqual(8)
    expect(count('judge'), `unit ${u.id} needs at least 2 judge items`).toBeGreaterThanOrEqual(2)
    expect(count('gap'), `unit ${u.id} needs at least 2 gap items`).toBeGreaterThanOrEqual(2)
  }
})
