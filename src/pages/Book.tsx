import { Link } from 'react-router-dom'
import { UNITS } from '@/content'
import { PART_TITLES } from '@/content/taxonomy'

export function Book() {
  const parts = [...new Set(UNITS.map((u) => u.part))]
  return (
    <div className="space-y-6 p-4 pb-28">
      <h1 className="text-2xl font-semibold">Book</h1>
      {parts.map((part) => (
        <section key={part} className="space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-muted">{PART_TITLES[part]}</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {UNITS.filter((u) => u.part === part).map((u) => (
              <li key={u.id}>
                <Link to={`/unit/${u.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-8 text-sm text-muted">{u.id}</span>
                  <span className="flex-1">{u.title}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                    {u.level}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
