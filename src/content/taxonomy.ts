export const PART_IDS = [
  'noun-phrase', 'tense-aspect', 'modality-hedging', 'verb-patterns',
  'clause-architecture', 'voice-information', 'adverbials-punctuation',
  'numbers-data', 'spoken-professional', 'confusables',
] as const
export type PartId = (typeof PART_IDS)[number]

export const PART_TITLES: Record<PartId, string> = {
  'noun-phrase': 'The Noun Phrase',
  'tense-aspect': 'Tense and Aspect',
  'modality-hedging': 'Modality and Hedging',
  'verb-patterns': 'Verb Patterns and Complementation',
  'clause-architecture': 'Clause Architecture',
  'voice-information': 'Voice, Information Structure and Style',
  'adverbials-punctuation': 'Adverbials, Connectors and Punctuation',
  'numbers-data': 'Numbers, Data and Results',
  'spoken-professional': 'Spoken Professional English',
  'confusables': 'Confusables and False Friends',
}

// Grows as parts are written. Phase 1 covers only Part 1.
export const PHENOMENA = [
  'zero-article', 'definite-article', 'indefinite-article', 'generic-reference',
  'uncountable-nouns', 'quantifiers', 'noun-noun-modifiers', 'np-agreement',
  'article-with-acronyms',
] as const
export type Phenomenon = (typeof PHENOMENA)[number]
