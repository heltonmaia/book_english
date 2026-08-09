import type { Item } from '@/content/types'

type Props = { item: Extract<Item, { kind: 'judge' }>; onAnswered: (c: boolean) => void; disabled: boolean }

export function JudgeItem({ item, onAnswered, disabled }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Is this sentence correct?</p>
      <p className="text-lg leading-relaxed">{item.sentence}</p>
      <div className="grid grid-cols-2 gap-2">
        {([['Correct', true], ['Wrong', false]] as const).map(([label, verdict]) => (
          <button key={label} type="button" disabled={disabled}
            onClick={() => !disabled && onAnswered(verdict === item.correct)}
            className="rounded-lg border border-border bg-surface px-4 py-3 disabled:opacity-50 can-hover:hover:border-accent">
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
