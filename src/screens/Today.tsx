import { useState, type CSSProperties } from 'react'
import { actions, currentWeek, gymSessionFor, useStore } from '../lib/store'
import { addDays, DAY_SHORT, diffDays, fmtDay, monthName, parse, todayIso } from '../lib/dates'
import { BLOCK_LABEL } from '../lib/program'
import { num } from '../lib/format'
import { SessionCard, KIND } from '../components/SessionCard'
import { IShuffle, ISpark } from '../components/Icons'

const css = (o: Record<string, string>) => o as CSSProperties

export function Today({ open, goWeek, atGym, ask }: { open: (id: string) => void; goWeek: () => void; atGym: boolean; ask: (q: string) => void }) {
  const st = useStore()
  const today = todayIso()
  const { start, meta, sessions } = currentWeek(st, today)
  const todays = sessions.filter((s) => s.date === today && s.status !== 'skipped')
  const upcoming = st.sessions.filter((s) => s.date > today && s.status === 'planned').slice(0, 3)
  const weeksLeft = Math.max(0, Math.ceil(diffDays(today, st.profile.goalDate) / 7))
  const active = sessions.filter((s) => s.status === 'planned' || s.status === 'done' || s.status === 'missed')
  const done = sessions.filter((s) => s.status === 'done').length
  const pct = active.length ? done / active.length : 0
  const pending = todays.filter((s) => s.status === 'planned')

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">{fmtDay(today)}</div>
          <h1>Hoy</h1>
        </div>
        <span className="pill" style={css({ '--c': 'var(--run)' })}>
          <span className="dot" />
          {weeksLeft} sem · {monthName(st.profile.goalDate)}
        </span>
      </div>

      <button className="hero" onClick={goWeek} aria-label="Ver semana">
        <div className="hero-top">
          <Ring pct={pct} label={`${done}/${active.length}`} />
          <div className="hero-txt">
            <div className="eyebrow">Semana {meta ? `· ${BLOCK_LABEL[meta.block]}` : ''}</div>
            <div className="hero-title">
              {pct >= 1 ? 'Semana completada' : pending.length ? `Hoy: ${pending.map((s) => s.title).join(' + ')}` : 'Hoy toca descansar'}
            </div>
            <div className="small muted">
              {meta?.reduced ? 'Modo suave activo' : meta?.boost ? 'Modo +carga activo' : `Bloque ${meta?.block ?? 1} de 4`}
            </div>
          </div>
        </div>
        <div className="strip">
          {Array.from({ length: 7 }, (_, d) => {
            const date = addDays(start, d)
            const list = sessions.filter((s) => s.date === date && s.status !== 'skipped')
            return (
              <div key={d} className={`strip-day ${date === today ? 'today' : ''} ${date < today ? 'past' : ''}`}>
                <span className="l">{DAY_SHORT[d]}</span>
                <span className="n">{parse(date).getDate()}</span>
                <span className="dots">
                  {list.map((s) => (
                    <i key={s.id} className={s.status} style={css({ '--c': KIND[s.kind].color })} />
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      </button>

      {atGym && <GymBanner open={open} />}

      {meta && !meta.checkin && <Checkin />}

      <div className="section">
        <div className="section-head">
          <span className="section-title">Sesiones de hoy</span>
        </div>
        <div className="stack">
          {todays.length ? (
            todays.map((s) => <SessionCard key={s.id} s={s} onOpen={open} size="big" />)
          ) : (
            <div className="card rest">
              <div className="eyebrow">Descanso</div>
              <div className="big-word">Recupera</div>
              <p className="muted small">10' de movilidad de cadera y tobillo, camina y duerme bien. Mañana rindes más.</p>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <span className="section-title">Pregunta al coach</span>
        </div>
        <div className="chips-scroll inline">
          {['Hoy solo tengo 40 minutos', 'Estoy cansado, ¿qué hago hoy?', '¿Qué como antes del partido?', 'Me molesta algo, adapta la sesión'].map((q) => (
            <button key={q} onClick={() => ask(q)}>
              <ISpark /> {q}
            </button>
          ))}
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
                <div className="small muted day-cap">{fmtDay(s.date)}</div>
                <SessionCard s={s} onOpen={open} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="ring">
      <svg viewBox="0 0 64 64" width="64" height="64">
        <defs>
          <linearGradient id="ringg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--gym)" />
            <stop offset="1" stopColor="var(--run)" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} stroke="var(--s3)" strokeWidth="6" fill="none" />
        {pct > 0 && <circle
          cx="32"
          cy="32"
          r={r}
          stroke="url(#ringg)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * Math.min(1, pct)} ${c}`}
          transform="rotate(-90 32 32)"
        />}
      </svg>
      <span className="tnum">{label}</span>
    </div>
  )
}

function Checkin() {
  const st = useStore()
  const [fatigue, setFatigue] = useState<number | null>(null)
  const [kg, setKg] = useState('')
  const labels = ['Fresco', 'Bien', 'Normal', 'Cargado', 'Fundido']
  return (
    <div className="section">
      <div className="card checkin">
        <div>
          <div className="eyebrow">Check-in semanal</div>
          <div className="card-title">¿Cómo llegas a esta semana?</div>
        </div>
        <div className="scale">
          {labels.map((l, i) => (
            <button key={l} className={fatigue === i + 1 ? 'on' : ''} onClick={() => setFatigue(i + 1)}>
              <b>{i + 1}</b>
              <small>{l}</small>
            </button>
          ))}
        </div>
        <p className="small muted">
          {fatigue == null
            ? 'Si llegas cargado, el plan afloja; si llegas fresco, aprieta un poco.'
            : fatigue >= 4
              ? 'Esta semana irá en modo suave.'
              : fatigue === 1
                ? 'Añadiremos una serie a los básicos.'
                : 'Plan normal.'}
        </p>
        <div className="inline-add">
          <input
            className="input"
            inputMode="decimal"
            placeholder={`Peso hoy · último ${String(st.profile.weightKg).replace('.', ',')} kg`}
            value={kg}
            onChange={(e) => setKg(e.target.value)}
          />
          <button className="btn sm" disabled={!fatigue} onClick={() => actions.checkin(fatigue!, num(kg))}>
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
            <div className="card-title">{hit.isToday ? `Toca ${hit.session.title}` : `Hoy no tocaba gym: ¿adelantas ${hit.session.title}?`}</div>
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
