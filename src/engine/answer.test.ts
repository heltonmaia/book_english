import { checkAnswer, normalizeAnswer } from './answer'

describe('normalizeAnswer', () => {
  test('trims and lowercases', () => {
    expect(normalizeAnswer('  The  ')).toBe('the')
  })
  test('collapses internal whitespace', () => {
    expect(normalizeAnswer('has   been   shown')).toBe('has been shown')
  })
  test('treats curly and straight apostrophes as the same', () => {
    // Test with curly apostrophe (U+2019) vs straight (U+0027)
    const curly = String.fromCharCode(100, 111, 110, 0x2019, 116)  // don't with curly
    const straight = String.fromCharCode(100, 111, 110, 0x0027, 116)  // don't with straight
    expect(normalizeAnswer(curly)).toBe(normalizeAnswer(straight))
  })
  test('strips a single trailing period', () => {
    expect(normalizeAnswer('Networks are trained.')).toBe('networks are trained')
  })
  test('strips whitespace left behind by a stripped trailing period', () => {
    expect(normalizeAnswer('evidence .')).toBe('evidence')
  })
})

describe('checkAnswer', () => {
  test('accepts an exact match', () => {
    expect(checkAnswer('the', ['the'])).toBe(true)
  })
  test('accepts a case and spacing variant', () => {
    expect(checkAnswer('  The ', ['the'])).toBe(true)
  })
  test('accepts any listed alternative', () => {
    expect(checkAnswer('a', ['an', 'a'])).toBe(true)
  })
  test('rejects a grammatical difference', () => {
    expect(checkAnswer('the', [''])).toBe(false)
    expect(checkAnswer('an', ['a'])).toBe(false)
  })
  test('rejects a contraction not listed among the answers', () => {
    const straight = String.fromCharCode(100, 111, 110, 0x0027, 116)
    expect(checkAnswer(straight, ['do not'])).toBe(false)
  })
  test('accepts a contraction when the author listed both', () => {
    const straight = String.fromCharCode(100, 111, 110, 0x0027, 116)
    expect(checkAnswer(straight, ['do not', straight])).toBe(true)
  })

  // The zero-article case: blank input is a real answer, not "no answer".
  test('accepts an empty submission when the empty string is accepted', () => {
    expect(checkAnswer('', [''])).toBe(true)
    expect(checkAnswer('   ', [''])).toBe(true)
  })
  test('rejects an empty submission when a word is required', () => {
    expect(checkAnswer('', ['the'])).toBe(false)
  })
})
