import type { Rich } from '@/content/types'

export function RichBody({ body }: { body: Rich[] }) {
  return (
    <div className="space-y-4">
      {body.map((node, n) => {
        switch (node.kind) {
          case 'p':
            return <p key={n} className="leading-relaxed">{node.text}</p>
          case 'list':
            return (
              <ul key={n} className="list-disc space-y-1 pl-6">
                {node.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            )
          case 'table':
            return (
              <div key={n} className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>{node.head.map((h) => (
                      <th key={h} className="border-b border-border px-2 py-1 text-left">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>{node.rows.map((row, r) => (
                    <tr key={r}>{row.map((cell, c) => (
                      <td key={c} className="border-b border-border px-2 py-1">{cell}</td>
                    ))}</tr>
                  ))}</tbody>
                </table>
              </div>
            )
          case 'example':
            return (
              <div key={n} className="space-y-1 border-l-2 border-border pl-3">
                {node.good && (
                  <p aria-label="Correct example" className="text-ok">
                    <span aria-hidden="true">{'✓ '}</span>{node.good}
                  </p>
                )}
                {node.bad && (
                  <p aria-label="Incorrect example" className="text-bad">
                    <span aria-hidden="true">{'✗ '}</span>{node.bad}
                  </p>
                )}
                {node.note && <p className="text-sm text-muted">{node.note}</p>}
              </div>
            )
        }
      })}
    </div>
  )
}
