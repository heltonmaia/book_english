import type { Item } from '@/content/types'
import { GapItem } from './GapItem'
import { ChoiceItem } from './ChoiceItem'
import { JudgeItem } from './JudgeItem'
import { TransformItem } from './TransformItem'
import { ErrorHuntItem } from './ErrorHuntItem'

export type ItemViewProps = {
  item: Item
  onAnswered: (correct: boolean) => void
  disabled: boolean
}

export function ItemView({ item, onAnswered, disabled }: ItemViewProps) {
  const p = { onAnswered, disabled }
  switch (item.kind) {
    case 'gap': return <GapItem item={item} {...p} />
    case 'choice': return <ChoiceItem item={item} {...p} />
    case 'judge': return <JudgeItem item={item} {...p} />
    case 'transform': return <TransformItem item={item} {...p} />
    case 'errorHunt': return <ErrorHuntItem item={item} {...p} />
  }
}
