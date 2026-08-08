/** Normalizes away accidental differences only. Grammatical differences survive. */
export function normalizeAnswer(raw: string): string {
  return raw
    .replace(/[‘’']/g, "'")
    .replace(/[“”"]/g, '"')
    .trim()
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function checkAnswer(raw: string, accepted: string[]): boolean {
  const given = normalizeAnswer(raw)
  return accepted.some((a) => normalizeAnswer(a) === given)
}
