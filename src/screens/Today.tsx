import { useState } from 'react'
import { actions, currentWeek, gymSessionFor, useStore } from '../lib/store'
import { addDays, DAY_SHORT, diffDays, fmtDay, monthName, parse, todayIso } from '../lib/dates'
import { BLOCK_LABEL } from '../lib/program'
import { num } from '../lib/format'
import { SessionCard, KIND } from '../components/SessionCard'
import { IShuffle } from '../components/Icons'

export function Today({ open, goWeek, atGym }: { open: (id: string) => void; goWeek: () => void; atGym: boolean }) {
  const st = useStore()
  const today = todayIso()
  const { start, meta, sessions } = currentWeek(st, today)
  const todays = sessions.filter((s) => s.date === today && s.status !== 'skipped')
  const upcoming = st.sessions.filter((s) => s.date > today && s.status === 'planned').slice(0, 3)
  const weeksLeft = Math.max(0, Math.ceil(diffDays(today, st.profile.goalDate) / 7))

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">{fmtDay(today)}</div>
          <h1>Hoy</h1>
        </div>
        <span className="pill" style={{ '--c': 'var(--run)' } as React.CSSProperties}>
          <span className="dot" />
          {weeksLeft} sem hasta {monthName(st.profile.goalDate)}
        </span>
      </div>

      <button className="strip" onClick={goWeek} style={{ width: '100%' }} aria-label="Ver semana">
        {Array.from({ length: 7 }, (_, d) => {
          const date = addDays(start, d)
          const list = sessions.filter((s) => s.date === date && s.status !== 'skipped')
          return (
            <div key={d} className={`strip-day ${date === today ? 'today' : ''} ${date < today ? 'past' : ''}`}>
              <span className="l">{DAY_SHORT[d]}</span>
              <span className="n">{parse(date).getDate()}</span>
              <span className="dots">
                {list.map((s) => (
                  <i key={s.id} className={s.status} style={{ '--c': KIND[s.kind].color } as React.CSSProperties} />
                ))}
              </span>
            </div>
          )
        })}
      </button>

      {atGym && <GymBanner open={open} />}

      {meta && !meta.checkin && <Checkin />}

      <div className="section">
        <div className="section-head">
          <span className="section-title">Sesiones de hoy</span>
          {meta && (
            <span className="small muted">
              Bloque {meta.block}/4 · {BLOCK_LABEL[meta.block]}
            </span>
          )}
        </div>
        <div className="stack">
          {todays.length ? (
            todays.map((s) => <SessionCard key={s.id} s={s} onOpen={open} size="big" />)
          ) : (
            <div className="card rest">
              <div className="eyebrow">Descanso</div>
              <div className="big-word" style={{ marginTop: 6 }}>
                Recupera
              </div>
              <p className="muted small" style={{ marginTop: 6 }}>
                10' de movilidad de cadera y tobillo, camina y duerme bien. Mañana rindes más.
              </p>
            </div>
          )}
        </div>
      </div>

      {meta && meta.changes.length > 0 && (
        <div className="section">
          <div className="section-head">
            <span className="section-title">Reajustes de la semana</span>
          </div>
          <div className="card changes">
            {meta.changes
              .slice(-4)
              .reverse()
              .map((c, i) => (
                <div key={i} className="change">
                  <IShuffle />
                  <span>{c.text}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="section">
          <div className="section-head">
            <span className="section-title">Próximas</span>
          </div>
          <div className="stack">
            {upcoming.map((s) => (
              <div key={s.id}>
                <div className="small muted" style={{ margin: '0 0 6px 4px' }}>
                  {fmtDay(s.date)}
                </div>
                <SessionCard s={s} onOpen={open} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function Checkin() {
  const st = useStore()
  const [fatigue, setFatigue] = useState<number | null>(null)
  const [kg, setKg] = useState('')
  const labels = ['Fresco', 'Bien', 'Normal', 'Cargado', 'Reventado']
  return (
    <div className="section">
      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <div>
          <div className="eyebrow">Check-in semanal</div>
          <div style={{ fontWeight: 650, fontSize: 18, marginTop: 4 }}>¿Cómo llegas a esta semana?</div>
        </div>
        <div className="seg" style={{ '--c': 'var(--jump)' } as React.CSSProperties}>
          {labels.map((l, i) => (
            <button key={l} className={fatigue === i + 1 ? 'on' : ''} onClick={() => setFatigue(i + 1)}>
              {l}
            </button>
          ))}
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <input
            className="input"
            inputMode="decimal"
            placeholder={`Peso (${String(st.profile.weightKg).replace('.', ',')} kg)`}
            value={kg}
            onChange={(e) => setKg(e.target.value)}
          />
          <button className="btn" style={{ flex: '0 0 auto', width: 'auto' }} disabled={!fatigue} onClick={() => actions.checkin(fatigue!, num(kg))}>
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

function GymBanner({ open }: { open: (id: string) => void }) {
  const st = useStore()
  const today = todayIso()
  const hit = gymSessionFor(st, today)
  const doneToday = st.sessions.some((s) => s.date === today && s.kind === 'gym' && s.status === 'done')
  return (
    <div className="section">
      <div className="card gym-banner">
        <div className="eyebrow" style={{ color: 'var(--gym)' }}>
          Estás en el gimnasio
        </div>
        {hit ? (
          <>
            <div style={{ fontWeight: 650, fontSize: 18, marginTop: 4 }}>
              {hit.isToday ? `Toca ${hit.session.title}` : `Hoy no tocaba gym: ¿adelantas ${hit.session.title}?`}
            </div>
            <button
              className="btn"
              style={{ marginTop: 14, background: 'var(--gym)' }}
              onClick={() => {
                if (!hit.isToday) actions.move(hit.session.id, today)
                open(hit.session.id)
              }}
            >
              {hit.isToday ? 'Registrar rutina' : 'Hacerla hoy'}
            </button>
          </>
        ) : (
          <div className="muted small" style={{ marginTop: 4 }}>
            {doneToday ? 'Rutina de hoy registrada. Buen trabajo.' : 'No te queda gimnasio esta semana: descansa o haz movilidad.'}
          </div>
        )}
      </div>
    </div>
  )
}
