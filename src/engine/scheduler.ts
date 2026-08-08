import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs'
import type { ItemId } from '@/content/types'

export type Grade = 'again' | 'hard' | 'good'

export type StoredCard = {
  itemId: ItemId
  due: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  state: number
  lastReview: number | null
  introducedAt: number
}

const scheduler = fsrs(generatorParameters({ enable_fuzz: false }))

const RATING: Record<Grade, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
}

function toStored(card: Card, itemId: ItemId, introducedAt: number): StoredCard {
  return {
    itemId,
    introducedAt,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.getTime() : null,
  }
}

function toFsrs(c: StoredCard): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.lastReview === null ? undefined : new Date(c.lastReview),
  } as Card
}

export function newCard(itemId: ItemId, now: number): StoredCard {
  return toStored(createEmptyCard(new Date(now)), itemId, now)
}

export function gradeCard(card: StoredCard, grade: Grade, now: number): StoredCard {
  const result = scheduler.next(toFsrs(card), new Date(now), RATING[grade] as any)
  return toStored(result.card, card.itemId, card.introducedAt)
}
