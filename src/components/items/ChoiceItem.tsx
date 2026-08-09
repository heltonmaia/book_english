import type { Item } from '@/content/types'

type Props = { item: Extract<Item, { kind: 'choice' }>; onAnswered: (c: boolean) => void; disabled: boolean }

export function ChoiceItem({ item, onAnswered, disabled }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-lg leading-relaxed">{item.prompt}</p>
      <div className="grid gap-2">
        {item.options.map((opt, n) => (
          <button key={opt} type="button" disabled={disabled}
            onClick={() => !disabled && onAnswered(n === item.correct)}
            className="rounded-lg border border-border bg-surface px-4 py-3 text-left disabled:opacity-50 can-hover:hover:border-accent">
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
