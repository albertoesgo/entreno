import { useState } from 'react'
import type { ExerciseBlock, Session } from '../lib/types'
import { actions, useStore } from '../lib/store'
import { EXERCISES, BLOCK_LABEL } from '../lib/program'
import { addDays, DAY_SHORT, fmtDay, todayIso, weekday, weekStart } from '../lib/dates'
import { fmtNum, fmtPace, fmtTime, num, parseTime } from '../lib/format'
import { KIND, accent } from '../components/SessionCard'
import { ICheck, IClose } from '../components/Icons'

export function SessionView({ id, onClose }: { id: string; onClose: () => void }) {
  const st = useStore()
  const s = st.sessions.find((x) => x.id === id)
  const [finishing, setFinishing] = useState(false)
  const [moving, setMoving] = useState(false)
  const [rpe, setRpe] = useState<number | undefined>(s?.rpe)
  const [mins, setMins] = useState(String(s?.minutes ?? 90))
  const [km, setKm] = useState(s?.runLog?.distanceKm ? fmtNum(s.runLog.distanceKm, 2) : '')
  const [time, setTime] = useState(s?.runLog?.timeSec ? fmtTime(s.runLog.timeSec) : '')

  if (!s) return null
  const today = todayIso()
  const start = weekStart(today)
  const current = s.date >= start
  const meta = st.weeks[weekStart(s.date)]
  const planned = s.status === 'planned'

  const kmN = num(km)
  const timeN = parseTime(time)
  const livePace = kmN && timeN ? timeN / kmN : null

  const save = () => {
    actions.finish(s.id, {
      rpe,
      minutes: s.kind === 'basket' || s.kind === 'match' ? (num(mins) ?? s.minutes) : undefined,
      runLog: s.kind === 'run' && kmN && timeN ? { distanceKm: kmN, timeSec: timeN } : undefined,
    })
    onClose()
  }

  const canFinish = s.kind !== 'run' || (kmN && timeN)
  const moveDays = Array.from({ length: 7 }, (_, d) => addDays(start, d)).filter((d) => d >= today)

  return (
    <div className="sheet" style={accent(s.kind)}>
      <div className="sheet-inner">
        <div className="sheet-bar">
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <IClose />
          </button>
          {meta && (
            <span className="pill">
              Bloque {meta.block}/4 · {BLOCK_LABEL[meta.block]}
            </span>
          )}
        </div>

        <div className="eyebrow accent">{KIND[s.kind].label}</div>
        <h1 style={{ marginTop: 6 }}>{s.title}</h1>
        <div className="muted" style={{ marginTop: 6 }}>
          {fmtDay(s.date)}
          {s.movedFrom && ' · recolocada'}
          {s.status === 'missed' && ' · no hecha'}
          {s.status === 'skipped' && ' · saltada'}
        </div>

        {current && planned && (
          <div className="fab-row">
            <button className="btn sm ghost" onClick={() => setMoving(true)}>
              Mover
            </button>
            {s.date === today && !s.fixed && (
              <button className="btn sm ghost" onClick={() => (actions.notToday(s.id), onClose())}>
                Hoy no puedo
              </button>
            )}
            <button className="btn sm ghost" onClick={() => (actions.skip(s.id), onClose())}>
              {s.fixed ? 'No hay' : 'Saltar'}
            </button>
          </div>
        )}
        {current && (s.status === 'missed' || s.status === 'skipped') && (
          <div className="fab-row">
            <button className="btn sm ghost" onClick={() => (actions.restore(s.id), onClose())}>
              {s.fixed ? 'Restaurar' : 'Intentar recolocar'}
            </button>
            {!s.fixed && (
              <button className="btn sm ghost" onClick={() => setMoving(true)}>
                Elegir día
              </button>
            )}
          </div>
        )}

        <div className="section">
          {s.kind === 'gym' && <GymBody s={s} />}
          {s.kind === 'run' && (
            <RunBody s={s} km={km} setKm={setKm} time={time} setTime={setTime} livePace={livePace} editable={s.status !== 'skipped'} />
          )}
          {(s.kind === 'basket' || s.kind === 'match') && (
            <div className="card">
              <label className="field">
                <span>Duración (min)</span>
                <input className="input" inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} />
              </label>
              <p className="muted small" style={{ marginTop: 12 }}>
                {s.kind === 'match'
                  ? 'Antes del partido: activación y 3–4 saltos máximos. Después: 10 min de movilidad.'
                  : 'Tu entreno cuenta como carga de pierna y salto: el plan lo tiene en cuenta.'}
              </p>
            </div>
          )}
        </div>

        {s.manual && (
          <div className="section">
            <button className="btn line danger" onClick={() => (actions.remove(s.id), onClose())}>
              Eliminar
            </button>
          </div>
        )}
      </div>

      {s.status !== 'skipped' && (
        <div className="sheet-foot">
          <div>
            {finishing ? (
              <>
                <div className="small muted">¿Cómo de duro? (RPE)</div>
                <div className="rpe">
                  {[5, 6, 7, 8, 9, 10].map((n) => (
                    <button key={n} className={rpe === n ? 'on' : ''} onClick={() => setRpe(n)}>
                      {n}
                    </button>
                  ))}
                </div>
                <button className="btn" onClick={save} disabled={!canFinish}>
                  Guardar
                </button>
              </>
            ) : s.status === 'done' ? (
              <div className="row">
                <button className="btn ghost" onClick={() => setFinishing(true)}>
                  Editar registro
                </button>
                {current && (
                  <button className="btn line" onClick={() => actions.reopen(s.id)}>
                    Desmarcar
                  </button>
                )}
              </div>
            ) : (
              <button className="btn" onClick={() => setFinishing(true)} disabled={s.date > today}>
                {s.date > today ? `Programada para el ${fmtDay(s.date).toLowerCase()}` : 'Terminar sesión'}
              </button>
            )}
          </div>
        </div>
      )}

      {moving && (
        <div className="overlay" onClick={() => setMoving(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h3>Mover a…</h3>
            <p className="muted small" style={{ marginTop: -8 }}>
              El resto de la semana se reajusta alrededor.
            </p>
            <div className="seg" style={accent(s.kind)}>
              {moveDays.map((d) => (
                <button
                  key={d}
                  className={d === s.date ? 'on' : ''}
                  onClick={() => {
                    actions.move(s.id, d)
                    setMoving(false)
                  }}
                >
                  {DAY_SHORT[weekday(d)]} {Number(d.slice(8))}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Gimnasio ─────────────────────────────────────────────────────────────

function GymBody({ s }: { s: Session }) {
  const blocks = s.exercises ?? []
  const locked = s.status === 'skipped' || s.status === 'missed'

  const setSet = (bi: number, li: number, patch: { kg?: number | null; reps?: number | null }) =>
    actions.patch(s.id, (x) => {
      const b = x.exercises![bi]
      Object.assign(b.log[li], patch)
      // El peso se propaga a las series siguientes que aún no has hecho
      if (patch.kg !== undefined) for (let i = li + 1; i < b.log.length; i++) if (!b.log[i].done) b.log[i].kg = patch.kg
    })

  const toggle = (bi: number, li: number) =>
    actions.patch(s.id, (x) => {
      const b = x.exercises![bi]
      const l = b.log[li]
      l.done = !l.done
      if (l.done && l.reps == null) l.reps = b.targetReps
    })

  return (
    <div>
      {s.status === 'planned' && blocks.some((b) => b.targetKg == null && EXERCISES[b.id].load === 'kg') && (
        <div className="card small muted" style={{ marginBottom: 8 }}>
          Primera vez con algún ejercicio: elige un peso con el que te queden ~2 reps en reserva. A partir de ahí, la app ajusta sola.
        </div>
      )}
      {blocks.map((b, bi) => (
        <Exercise key={bi} b={b} locked={locked} onSet={(li, p) => setSet(bi, li, p)} onToggle={(li) => toggle(bi, li)} />
      ))}
    </div>
  )
}

function Exercise({
  b,
  locked,
  onSet,
  onToggle,
}: {
  b: ExerciseBlock
  locked: boolean
  onSet: (li: number, p: { kg?: number | null; reps?: number | null }) => void
  onToggle: (li: number) => void
}) {
  const def = EXERCISES[b.id]
  const withKg = def.load === 'kg' || def.load === 'bw+'
  const range = b.repMin === b.repMax ? `${b.repMin}` : `${b.repMin}–${b.repMax}`
  let target = `${b.sets} × ${b.targetReps}`
  if (def.load === 'kg') target += b.targetKg != null ? ` · ${fmtNum(b.targetKg)} kg` : ' · elige peso'
  if (def.load === 'bw+' && b.targetKg) target += ` · +${fmtNum(b.targetKg)} kg`

  return (
    <div className="ex">
      <div className="ex-head">
        <div className="ex-name">{def.name}</div>
        <div className="ex-target">{target}</div>
      </div>
      <div className="ex-cue">
        {def.load === 'plyo' ? 'Pliometría' : `Rango ${range} reps`}
        {b.deload ? ' · descarga' : ''}
        {def.cue ? ` · ${def.cue}` : ''}
      </div>
      <div className="sets">
        {b.log.map((l, li) => (
          <div key={li} className={`set ${l.done ? 'on' : ''} ${def.load === 'plyo' ? 'plyo' : ''} ${def.load === 'bw' ? 'bw' : ''}`}>
            <span className="set-n">{li + 1}</span>
            {withKg && <NumIn value={l.kg} placeholder="kg" suffix="kg" disabled={locked} onChange={(v) => onSet(li, { kg: v })} />}
            {def.load === 'plyo' ? (
              <span className="set-txt">{b.targetReps} saltos</span>
            ) : (
              <NumIn value={l.reps} placeholder={String(b.targetReps)} suffix="reps" disabled={locked} onChange={(v) => onSet(li, { reps: v })} />
            )}
            <button className="tick" disabled={locked} onClick={() => onToggle(li)} aria-label="Serie hecha">
              <ICheck />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function NumIn({
  value,
  placeholder,
  suffix,
  disabled,
  onChange,
}: {
  value: number | null
  placeholder: string
  suffix: string
  disabled?: boolean
  onChange: (v: number | null) => void
}) {
  const [text, setText] = useState(value == null ? '' : fmtNum(value))
  const [focus, setFocus] = useState(false)
  const shown = focus ? text : value == null ? '' : fmtNum(value)
  return (
    <label className="set-in">
      <input
        className="input"
        inputMode="decimal"
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={(e) => {
          setText(value == null ? '' : fmtNum(value))
          setFocus(true)
          e.target.select()
        }}
        onBlur={() => {
          setFocus(false)
          onChange(text.trim() === '' ? null : num(text))
        }}
        onChange={(e) => setText(e.target.value)}
      />
      <em>{suffix}</em>
    </label>
  )
}

// ── Carrera ──────────────────────────────────────────────────────────────

function RunBody({
  s,
  km,
  setKm,
  time,
  setTime,
  livePace,
  editable,
}: {
  s: Session
  km: string
  setKm: (v: string) => void
  time: string
  setTime: (v: string) => void
  livePace: number | null
  editable: boolean
}) {
  const target = s.run?.targetPace
  return (
    <div className="stack">
      {s.run && s.run.type !== 'free' && (
        <div className="card">
          <div className="eyebrow">Ritmo objetivo</div>
          <div className="bignum" style={{ marginTop: 8, color: 'var(--c)' }}>
            {target ? fmtPace(target) : '—'}
            <small>/km</small>
          </div>
          <p style={{ marginTop: 12 }}>{s.run.detail}</p>
        </div>
      )}
      {editable && (
        <div className="card">
          <div className="grid2">
            <label className="field">
              <span>Distancia (km)</span>
              <input className="input" inputMode="decimal" placeholder="5" value={km} onChange={(e) => setKm(e.target.value)} />
            </label>
            <label className="field">
              <span>Tiempo (mm:ss)</span>
              <input className="input" inputMode="text" placeholder="31:40" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          {livePace && (
            <div className="kpi" style={{ marginTop: 14 }}>
              <span className="muted small">Tu ritmo</span>
              <span className="v">
                {fmtPace(livePace)}
                <small>/km</small>
              </span>
            </div>
          )}
          <p className="muted small" style={{ marginTop: 12 }}>
            Si corres 4,5 km o más más rápido que tu ritmo de 5K, la app actualiza todos tus ritmos.
          </p>
        </div>
      )}
    </div>
  )
}
