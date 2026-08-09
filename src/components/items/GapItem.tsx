import { useState } from 'react'
import { BLANK, type Item } from '@/content/types'
import { checkAnswer } from '@/engine/answer'

type Props = { item: Extract<Item, { kind: 'gap' }>; onAnswered: (c: boolean) => void; disabled: boolean }

export function GapItem({ item, onAnswered, disabled }: Props) {
  const [value, setValue] = useState('')
  const [before, after] = item.context.split(BLANK)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    onAnswered(checkAnswer(value, item.answers))
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-lg leading-relaxed">
        {before}
        <input
          aria-label="Your answer"
          value={value}
          disabled={disabled}
          autoCapitalize="off" autoCorrect="off" spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          className="mx-1 w-32 border-b-2 border-accent bg-transparent px-1 text-center outline-none"
        />
        {after}
      </p>
      <p className="text-sm text-muted">Leave blank if no word is needed.</p>
      <button type="submit" disabled={disabled}
        className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-bg disabled:opacity-50">
        Check
      </button>
    </form>
  )
}
