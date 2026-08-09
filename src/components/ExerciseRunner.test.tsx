import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExerciseRunner } from './ExerciseRunner'
import type { Item } from '@/content/types'

const items: Item[] = [
  { kind: 'judge', id: 'a.b.01', phenomenon: 'zero-article',
    sentence: 'Transformers have replaced recurrent models.', correct: true,
    why: 'Generic plural: no article.' },
  { kind: 'judge', id: 'a.b.02', phenomenon: 'zero-article',
    sentence: 'The evidence are limited.', correct: false,
    why: 'Uncountable noun takes a singular verb.' },
]

test('a correct answer grades good and offers the guess downgrade', async () => {
  const onGraded = vi.fn()
  render(<ExerciseRunner items={items} onGraded={onGraded} onFinished={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Correct' }))
  expect(screen.getByText('Generic plural: no article.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /i guessed/i })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(onGraded).toHaveBeenCalledWith('a.b.01', 'good')
})

test('marking "I guessed" downgrades the grade to hard', async () => {
  const onGraded = vi.fn()
  render(<ExerciseRunner items={items} onGraded={onGraded} onFinished={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Correct' }))
  await userEvent.click(screen.getByRole('button', { name: /i guessed/i }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(onGraded).toHaveBeenCalledWith('a.b.01', 'hard')
})

test('a wrong answer grades again and hides the guess option', async () => {
  const onGraded = vi.fn()
  render(<ExerciseRunner items={items} onGraded={onGraded} onFinished={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Wrong' }))
  expect(screen.queryByRole('button', { name: /i guessed/i })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(onGraded).toHaveBeenCalledWith('a.b.01', 'again')
})

test('advances through every item and then finishes', async () => {
  const onFinished = vi.fn()
  render(<ExerciseRunner items={items} onGraded={vi.fn()} onFinished={onFinished} />)
  await userEvent.click(screen.getByRole('button', { name: 'Correct' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText('The evidence are limited.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Wrong' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(onFinished).toHaveBeenCalled()
})

test('reports session progress', () => {
  render(<ExerciseRunner items={items} onGraded={vi.fn()} onFinished={vi.fn()} />)
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2')
})
