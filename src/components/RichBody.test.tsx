import { render, screen } from '@testing-library/react'
import { RichBody } from './RichBody'

test('renders paragraphs, lists and tables', () => {
  render(<RichBody body={[
    { kind: 'p', text: 'A paragraph.' },
    { kind: 'list', items: ['evidence', 'research'] },
    { kind: 'table', head: ['Form', 'Use'], rows: [['zero', 'generic']] },
  ]} />)
  expect(screen.getByText('A paragraph.')).toBeInTheDocument()
  expect(screen.getByText('evidence')).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Form' })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: 'generic' })).toBeInTheDocument()
})

test('marks good and bad examples so they are distinguishable without color', () => {
  render(<RichBody body={[
    { kind: 'example', good: 'Networks are trained.', bad: 'The networks are trained.' },
  ]} />)
  expect(screen.getByLabelText('Correct example')).toHaveTextContent('Networks are trained.')
  expect(screen.getByLabelText('Incorrect example')).toHaveTextContent('The networks are trained.')
})
