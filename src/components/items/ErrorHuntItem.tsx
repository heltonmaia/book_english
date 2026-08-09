import type { Item } from '@/content/types'

type Props = { item: Extract<Item, { kind: 'errorHunt' }>; onAnswered: (c: boolean) => void; disabled: boolean }

/** Tokenizes on word boundaries so the learner taps the offending word. */
export function ErrorHuntItem({ item, onAnswered, disabled }: Props) {
  const [start, end] = item.span
  const tokens: { text: string; at: number }[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(item.text)) !== null) tokens.push({ text: m[0], at: m.index })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Tap the word that is wrong.</p>
      <p className="text-lg leading-relaxed">
        {tokens.map((t) => (
          <button key={t.at} type="button" disabled={disabled}
            onClick={() => !disabled && onAnswered(t.at >= start && t.at < end)}
            className="mr-1 rounded px-1 disabled:opacity-50 can-hover:hover:bg-accent/20">
            {t.text}
          </button>
        ))}
      </p>
    </div>
  )
}
