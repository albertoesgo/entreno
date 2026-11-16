import { useState } from 'react'
import { actions, useStore } from '../lib/store'
import { weekSessions, compliance } from '../lib/engine'
import { addDays, DAY_SHORT, fmtRange, parse, todayIso, weekStart } from '../lib/dates'
import { BLOCK_LABEL } from '../lib/program'
import { fmtNum } from '../lib/format'
import { SessionCard, accent } from '../components/SessionCard'
import { IChevL, IChevR, IPlus } from '../components/Icons'

export function Week({ open }: { open: (id: string) => void }) {
  const st = useStore()
  const today = todayIso()
  const current = weekStart(today)
  const [start, setStart] = useState(current)
  const [adding, setAdding] = useState(false)
  const first = Object.keys(st.weeks).sort()[0] ?? current
  const meta = st.weeks[start]
  const sessions = weekSessions(st, start)
  const active = sessions.filter((s) => s.status === 'planned' || s.status === 'done')
  const done = sessions.filter((s) => s.status === 'done')
  const hours = active.reduce((a, s) => a + s.minutes, 0) / 60
  const comp = compliance(sessions)
  const flexTotal = sessions.filter((s) => (s.kind === 'gym' || s.kind === 'run') && !s.manual && s.status !== 'skipped').length

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">{meta ? `Bloque ${meta.block}/4 · ${BLOCK_LABEL[meta.block]}${meta.reduced ? ' · suave' : ''}` : 'Semana'}</div>
          <h1>{fmtRange(start)}</h1>
        </div>
        <div className="week-nav">
          <button className="icon-btn" disabled={start <= first} onClick={() => setStart(addDays(start, -7))} aria-label="Semana anterior">
            <IChevL />
          </button>
          <button className="icon-btn" disabled={start >= current} onClick={() => setStart(addDays(start, 7))} aria-label="Semana siguiente">
            <IChevR />
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="v">
            {done.length}/{active.length + sessions.filter((s) => s.status === 'missed').length}
          </div>
          <div className="k">sesiones</div>
        </div>
        <div className="stat">
          <div className="v">{fmtNum(hours)} h</div>
          <div className="k">volumen</div>
        </div>
        <div className="stat">
          <div className="v">{comp == null || !flexTotal ? '—' : `${Math.round(comp * 100)}%`}</div>
          <div className="k">gym + carrera</div>
        </div>
      </div>

      {start === current && meta && (
        <div className="mode">
          {(
            [
              ['normal', 'Normal'],
              ['reduced', 'Suave'],
              ['boost', '+ Carga'],
            ] as const
          ).map(([m, label]) => {
            const on = m === 'reduced' ? !!meta.reduced : m === 'boost' ? !!meta.boost : !meta.reduced && !meta.boost
            return (
              <button key={m} className={on ? 'on' : ''} onClick={() => !on && actions.setWeekMode(m)}>
                {label}
              </button>
            )
          })}
        </div>
      )}

      <div className="section stack">
        {Array.from({ length: 7 }, (_, d) => {
          const date = addDays(start, d)
          const list = sessions.filter((s) => s.date === date)
          return (
            <div key={d} className={`day-row ${date === today ? 'today' : ''}`}>
              <div className="day-label">
                <div className="l">{DAY_SHORT[d]}</div>
                <div className="n">{parse(date).getDate()}</div>
              </div>
              <div className="chips">
                {list.length ? (
                  list.map((s) => <SessionCard key={s.id} s={s} onOpen={open} size="sm" />)
                ) : (
                  <div className="day-empty">Descanso</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {start === current && (
        <div className="section">
          <button className="btn ghost" onClick={() => setAdding(true)}>
            <IPlus /> Añadir partido, entreno o carrera
          </button>
        </div>
      )}

      {adding && <AddSheet start={start} onClose={() => setAdding(false)} onCreated={open} />}
    </>
  )
}

function AddSheet({ start, onClose, onCreated }: { start: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [kind, setKind] = useState<'match' | 'basket' | 'run'>('match')
  const today = todayIso()
  const [date, setDate] = useState(today)
  const opts = [
    { k: 'match' as const, label: 'Partido' },
    { k: 'basket' as const, label: 'Entreno basket' },
    { k: 'run' as const, label: 'Carrera libre' },
  ]
  return (
    <div className="overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <h3>Añadir a la semana</h3>
        <div className="seg" style={accent(kind)}>
          {opts.map((o) => (
            <button key={o.k} className={kind === o.k ? 'on' : ''} onClick={() => setKind(o.k)}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="day-grid" style={accent(kind)}>
          {Array.from({ length: 7 }, (_, d) => addDays(start, d)).map((d, i) => (
            <button key={d} className={date === d ? 'on' : ''} onClick={() => setDate(d)}>
              <small>{DAY_SHORT[i]}</small>
              {parse(d).getDate()}
            </button>
          ))}
        </div>
        <p className="muted small">
          {kind === 'match'
            ? 'Si cae en día de entreno, lo sustituye. El gimnasio y las carreras se recolocan para llegar frescos.'
            : kind === 'run'
              ? 'Para registrar una carrera fuera del plan.'
              : 'Un entreno extra de basket: el plan descuenta carga alrededor.'}
        </p>
        <button
          className="btn"
          onClick={() => {
            const id = actions.add(kind, date)
            onClose()
            if (kind === 'run' && date <= today) onCreated(id)
          }}
        >
          Añadir
        </button>
      </div>
    </div>
  )
}
