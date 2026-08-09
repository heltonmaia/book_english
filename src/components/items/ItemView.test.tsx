import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemView } from './ItemView'
import type { Item } from '@/content/types'

const gap: Item = {
  kind: 'gap', id: 'u001.g.01', phenomenon: 'zero-article',
  context: '____ neural networks are trained on large corpora.',
  answers: [''], why: 'Generic plural takes no article.',
}
const choice: Item = {
  kind: 'choice', id: 'u001.c.02', phenomenon: 'definite-article',
  prompt: 'We ran three models. ___ models differed only in depth.',
  options: ['The', 'A', '(no article)'], correct: 0, why: 'Second mention.',
}
const judge: Item = {
  kind: 'judge', id: 'u001.j.03', phenomenon: 'zero-article',
  sentence: 'The transformers have replaced recurrent models.',
  correct: false, why: 'Generic reference takes no article.',
}

test('gap: submitting an empty blank counts as the zero-article answer', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={gap} onAnswered={onAnswered} disabled={false} />)
  await userEvent.click(screen.getByRole('button', { name: 'Check' }))
  expect(onAnswered).toHaveBeenCalledWith(true)
})

test('gap: a wrong word is reported as incorrect', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={gap} onAnswered={onAnswered} disabled={false} />)
  await userEvent.type(screen.getByRole('textbox'), 'The')
  await userEvent.click(screen.getByRole('button', { name: 'Check' }))
  expect(onAnswered).toHaveBeenCalledWith(false)
})

test('gap: tells the learner that a blank answer is allowed', () => {
  render(<ItemView item={gap} onAnswered={vi.fn()} disabled={false} />)
  expect(screen.getByText(/leave blank if no word is needed/i)).toBeInTheDocument()
})

test('choice: picking the right option reports correct', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={choice} onAnswered={onAnswered} disabled={false} />)
  await userEvent.click(screen.getByRole('button', { name: 'The' }))
  expect(onAnswered).toHaveBeenCalledWith(true)
})

test('judge: the wrong verdict reports incorrect', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={judge} onAnswered={onAnswered} disabled={false} />)
  await userEvent.click(screen.getByRole('button', { name: 'Correct' }))
  expect(onAnswered).toHaveBeenCalledWith(false)
})

test('disabled items do not fire onAnswered', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={choice} onAnswered={onAnswered} disabled={true} />)
  await userEvent.click(screen.getByRole('button', { name: 'The' }))
  expect(onAnswered).not.toHaveBeenCalled()
})
