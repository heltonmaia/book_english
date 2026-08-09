import { Link, useParams } from 'react-router-dom'
import { unitById } from '@/content'
import { RichBody } from '@/components/RichBody'

export function UnitPage() {
  const { id } = useParams()
  const unit = unitById(Number(id))
  if (!unit) return <p className="p-4">Unit not found.</p>

  return (
    <article className="space-y-6 p-4 pb-28">
      <header>
        <p className="text-sm text-muted">Unit {unit.id}</p>
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
      </header>
      {unit.blocks.map((b) => (
        <section key={b.label} className="space-y-3">
          <h2 className="font-medium">
            <span className="mr-2 text-accent">{b.label}</span>{b.heading}
          </h2>
          <RichBody body={b.body} />
        </section>
      ))}
      <Link to={`/session/unit/${unit.id}`}
        className="block rounded-lg bg-accent px-4 py-3 text-center font-medium text-bg">
        Practice ({unit.items.length} items)
      </Link>
    </article>
  )
}
