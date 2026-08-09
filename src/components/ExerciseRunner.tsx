import { useState } from 'react'
import type { Item, ItemId } from '@/content/types'
import type { Grade } from '@/engine/scheduler'
import { ItemView } from './items/ItemView'

type Props = {
  items: Item[]
  onGraded: (itemId: ItemId, grade: Grade) => void
  onFinished: () => void
}

export function ExerciseRunner({ items, onGraded, onFinished }: Props) {
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [guessed, setGuessed] = useState(false)

  const item = items[index]
  if (!item) return null
  const answered = correct !== null

  function next() {
    if (correct === null) return
    onGraded(item!.id, correct ? (guessed ? 'hard' : 'good') : 'again')
    setCorrect(null)
    setGuessed(false)
    if (index + 1 >= items.length) onFinished()
    else setIndex(index + 1)
  }

  return (
    <div className="flex min-h-full flex-col gap-6 p-4">
      <div role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={items.length}
        className="h-1 w-full rounded bg-border">
        <div className="h-1 rounded bg-accent"
          style={{ width: `${((index + 1) / items.length) * 100}%` }} />
      </div>

      <ItemView item={item} disabled={answered} onAnswered={setCorrect} />

      {answered && (
        <div className={`space-y-3 rounded-lg p-4 ${correct ? 'bg-ok-bg' : 'bg-bad-bg'}`}>
          <p className={`font-medium ${correct ? 'text-ok' : 'text-bad'}`}>
            {correct ? 'Correct' : 'Not quite'}
          </p>
          <p className="text-sm leading-relaxed">{item.why}</p>
          {correct && (
            <button type="button" onClick={() => setGuessed(!guessed)}
              className={`rounded-full border px-3 py-1 text-sm ${
                guessed ? 'border-accent text-accent' : 'border-border text-muted'}`}>
              {guessed ? '✓ I guessed' : 'I guessed'}
            </button>
          )}
          <button type="button" onClick={next}
            className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-bg">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
