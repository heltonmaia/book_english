import type { PartId, Phenomenon } from './taxonomy'

/** Hand-written, position-independent. Format: u<NNN>.<short-slug>.<NN> */
export type ItemId = string

export type Rich =
  | { kind: 'p'; text: string }
  | { kind: 'example'; good?: string; bad?: string; note?: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }

export type Block = { label: string; heading: string; body: Rich[] }

type ItemBase = { id: ItemId; why: string; phenomenon: Phenomenon }

export type Item =
  /** `context` must contain exactly one `____` blank marker. */
  | (ItemBase & { kind: 'gap'; context: string; answers: string[] })
  | (ItemBase & { kind: 'choice'; prompt: string; options: string[]; correct: number })
  | (ItemBase & { kind: 'judge'; sentence: string; correct: boolean })
  | (ItemBase & { kind: 'transform'; source: string; instruction: string; answers: string[] })
  | (ItemBase & { kind: 'errorHunt'; text: string; span: [number, number]; fix: string })

export type Unit = {
  id: number
  slug: string
  title: string
  part: PartId
  /** Display badge only — never feeds engine logic. */
  level: 'review' | 'core' | 'advanced'
  phenomena: Phenomenon[]
  blocks: Block[]
  items: Item[]
}

export const BLANK = '____'
