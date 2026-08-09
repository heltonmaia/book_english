import { useState } from 'react'
import type { Item } from '@/content/types'
import { checkAnswer } from '@/engine/answer'

type Props = { item: Extract<Item, { kind: 'transform' }>; onAnswered: (c: boolean) => void; disabled: boolean }

export function TransformItem({ item, onAnswered, disabled }: Props) {
  const [value, setValue] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    onAnswered(checkAnswer(value, item.answers))
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">{item.instruction}</p>
      <p className="text-lg leading-relaxed">{item.source}</p>
      <textarea aria-label="Your answer" value={value} disabled={disabled} rows={3}
        autoCapitalize="off" autoCorrect="off" spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface p-3 outline-none focus:border-accent" />
      <button type="submit" disabled={disabled}
        className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-bg disabled:opacity-50">
        Check
      </button>
    </form>
  )
}
