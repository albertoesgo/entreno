import { useEffect, useRef, useState } from 'react'
import type { ExerciseBlock, GymTemplate, Session } from '../lib/types'
import { actions, useStore, type Scope } from '../lib/store'
import { BLOCK_LABEL, exDef, history, restFor } from '../lib/program'
import { addDays, DAY_SHORT, fmtDay, todayIso, weekday, weekStart } from '../lib/dates'
import { fmtNum, fmtPace, fmtTime, num, parseTime } from '../lib/format'
import { KIND, accent } from '../components/SessionCard'
import { ICheck, IClose, IMore, IPlus, ISwap, ITimer, ITrash } from '../components/Icons'
import { ExercisePicker, Popup, ScopePopup } from '../components/Pickers'

export function SessionView({ id, onClose }: { id: string; onClose: () => void }) {
  const st = useStore()
  const s = st.sessions.find((x) => x.id === id)
  const [finishing, setFinishing] = useState(false)
  const [moving, setMoving] = useState(false)
  const [rpe, setRpe] = useState<number | undefined>(s?.rpe)
  const [mins, setMins] = useState(String(s?.minutes ?? 90))
  const [km, setKm] = useState(s?.runLog?.distanceKm ? fmtNum(s.runLog.distanceKm, 2) : '')
  const [time, setTime] = useState(s?.runLog?.timeSec ? fmtTime(s.runLog.timeSec) : '')
  const [restEnd, setRestEnd] = useState<number | null>(null)

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
  const totalSets = s.exercises?.reduce((a, b) => a + b.sets, 0) ?? 0
  const doneSets = s.exercises?.reduce((a, b) => a + b.log.filter((l) => l.done).length, 0) ?? 0

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
              {meta.reduced ? ' · suave' : meta.boost ? ' · +carga' : ''}
            </span>
          )}
        </div>

        <div className="eyebrow accent">{KIND[s.kind].label}</div>
        <h1 className="title-xl">{s.title}</h1>
        <div className="muted sub">
          {fmtDay(s.date)}
          {s.kind === 'gym' && ` · ~${s.minutes}'`}
          {s.movedFrom && ' · recolocada'}
          {s.customized && ' · personalizada'}
          {s.status === 'missed' && ' · no hecha'}
          {s.status === 'skipped' && ' · saltada'}
        </div>

        {s.kind === 'gym' && totalSets > 0 && (
          <div className="session-progress">
            <div className="bar">
              <div style={{ width: `${(doneSets / totalSets) * 100}%` }} />
            </div>
            <span className="tnum small muted">
              {doneSets}/{totalSets} series
            </span>
          </div>
        )}

        {current && planned && (
          <div className="action-row">
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
          <div className="action-row">
            <button className="btn sm ghost" onClick={() => (actions.restore(s.id), onClose())}>
              {s.fixed ? 'Restaurar' : 'Recolocar'}
            </button>
            {!s.fixed && (
              <button className="btn sm ghost" onClick={() => setMoving(true)}>
                Elegir día
              </button>
            )}
          </div>
        )}

        <div className="section">
          {s.kind === 'gym' && <GymBody s={s} onRest={(sec) => setRestEnd(Date.now() + sec * 1000)} />}
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
            {restEnd && !finishing && <RestTimer end={restEnd} onAdd={(sec) => setRestEnd(restEnd + sec * 1000)} onDone={() => setRestEnd(null)} />}
            {finishing ? (
              <>
                <div className="small muted">¿Cómo de dura ha sido? (RPE: 10 = imposible más)</div>
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
            ) : s.date > today ? (
              <button className="btn ghost" onClick={() => actions.move(s.id, today)}>
                Hacerla hoy
              </button>
            ) : (
              <button className="btn" onClick={() => setFinishing(true)}>
                Terminar sesión
              </button>
            )}
          </div>
        </div>
      )}

      {moving && (
        <Popup title="Mover a…" onClose={() => setMoving(false)}>
          <p className="muted small">El resto de la semana se reajusta alrededor.</p>
          <div className="day-grid" style={accent(s.kind)}>
            {moveDays.map((d) => (
              <button
                key={d}
                className={d === s.date ? 'on' : ''}
                onClick={() => {
                  actions.move(s.id, d)
                  setMoving(false)
                }}
              >
                <small>{DAY_SHORT[weekday(d)]}</small>
                {Number(d.slice(8))}
              </button>
            ))}
          </div>
        </Popup>
      )}
    </div>
  )
}

// ── Descanso ─────────────────────────────────────────────────────────────

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.5)
    navigator.vibrate?.(200)
  } catch {
    /* sin audio */
  }
}

function RestTimer({ end, onAdd, onDone }: { end: number; onAdd: (sec: number) => void; onDone: () => void }) {
  const [now, setNow] = useState(Date.now())
  const fired = useRef(false)
  useEffect(() => {
    fired.current = false
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [end])
  const left = Math.max(0, Math.ceil((end - now) / 1000))
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true
      beep()
      const t = setTimeout(onDone, 2500)
      return () => clearTimeout(t)
    }
  }, [left, onDone])
  return (
    <div className={`rest-timer ${left === 0 ? "go" : ""}`}>
      <ITimer />
      <span className="tnum">{left === 0 ? '¡A por la siguiente!' : `Descanso ${fmtTime(left)}`}</span>
      {left > 0 && (
        <>
          <button onClick={() => onAdd(15)}>+15"</button>
          <button onClick={onDone}>Saltar</button>
        </>
      )}
    </div>
  )
}

// ── Gimnasio ─────────────────────────────────────────────────────────────

type Pending = { kind: 'swap'; index: number; newId?: string } | { kind: 'remove'; index: number } | { kind: 'add'; newId?: string } | null

function GymBody({ s, onRest }: { s: Session; onRest: (sec: number) => void }) {
  const st = useStore()
  const blocks = s.exercises ?? []
  const locked = s.status === 'skipped' || s.status === 'missed'
  const routine = s.template && s.template in st.templates ? st.templates[s.template as GymTemplate].title : undefined
  const [menu, setMenu] = useState<number | null>(null)
  const [pending, setPending] = useState<Pending>(null)

  const setSet = (bi: number, li: number, patch: { kg?: number | null; reps?: number | null }) =>
    actions.patch(s.id, (x) => {
      const b = x.exercises![bi]
      Object.assign(b.log[li], patch)
      // El peso se propaga a las series siguientes que aún no has hecho
      if (patch.kg !== undefined) for (let i = li + 1; i < b.log.length; i++) if (!b.log[i].done) b.log[i].kg = patch.kg
    })

  const toggle = (bi: number, li: number) => {
    const b = blocks[bi]
    const willBeDone = !b.log[li].done
    actions.patch(s.id, (x) => {
      const xb = x.exercises![bi]
      const l = xb.log[li]
      l.done = !l.done
      if (l.done && l.reps == null) l.reps = xb.targetReps
    })
    if (willBeDone && s.status === 'planned') onRest(restFor(exDef(st, b.id), b.repMax))
  }

  const applyScope = (scope: Scope) => {
    if (!pending) return
    if (pending.kind === 'swap' && pending.newId) actions.swapExercise(s.id, pending.index, pending.newId, scope)
    if (pending.kind === 'remove') actions.removeExercise(s.id, pending.index, scope)
    if (pending.kind === 'add' && pending.newId) actions.addExercise(s.id, pending.newId, 3, scope)
    setPending(null)
  }

  return (
    <div>
      {s.status === 'planned' && blocks.some((b) => b.targetKg == null && exDef(st, b.id).load === 'kg') && (
        <div className="callout small">Primera vez con algún ejercicio: elige un peso con el que te queden ~2 reps en reserva. A partir de ahí, la app ajusta sola.</div>
      )}
      {blocks.map((b, bi) => (
        <Exercise
          key={`${b.id}-${bi}`}
          s={s}
          b={b}
          locked={locked}
          onSet={(li, p) => setSet(bi, li, p)}
          onToggle={(li) => toggle(bi, li)}
          onMenu={() => setMenu(bi)}
        />
      ))}
      {!locked && (
        <button className="row-btn" onClick={() => setPending({ kind: 'add' })}>
          <IPlus /> Añadir ejercicio
        </button>
      )}

      {menu != null && blocks[menu] && (
        <Popup title={exDef(st, blocks[menu].id).name} onClose={() => setMenu(null)}>
          <button
            className="choice icon"
            onClick={() => {
              setPending({ kind: 'swap', index: menu })
              setMenu(null)
            }}
          >
            <ISwap />
            <span>
              <b>Cambiar ejercicio</b>
              <span>Máquina ocupada, molestia o prefieres otro.</span>
            </span>
          </button>
          <div className="sets-edit">
            <span>Series de hoy</span>
            <div className="stepper">
              <button onClick={() => actions.changeSets(s.id, menu, -1)} disabled={blocks[menu].sets <= 1}>
                −
              </button>
              <span className="tnum">{blocks[menu].sets}</span>
              <button onClick={() => actions.changeSets(s.id, menu, 1)} disabled={blocks[menu].sets >= 8}>
                +
              </button>
            </div>
          </div>
          <button
            className="choice icon danger"
            onClick={() => {
              setPending({ kind: 'remove', index: menu })
              setMenu(null)
            }}
          >
            <ITrash />
            <span>
              <b>Quitar ejercicio</b>
              <span>Solo hoy o de la rutina.</span>
            </span>
          </button>
        </Popup>
      )}

      {pending && (pending.kind === 'swap' || pending.kind === 'add') && !pending.newId && (
        <ExercisePicker
          current={pending.kind === 'swap' ? blocks[pending.index]?.id : undefined}
          title={pending.kind === 'swap' ? `Cambiar ${exDef(st, blocks[pending.index]?.id).name.toLowerCase()}` : 'Añadir ejercicio'}
          onPick={(newId) => setPending({ ...pending, newId })}
          onClose={() => setPending(null)}
        />
      )}
      {pending && (pending.kind === 'remove' || pending.newId) && (
        <ScopePopup
          text={pending.kind === 'remove' ? '¿Quitar solo hoy?' : pending.kind === 'swap' ? `¿Cambiar a ${exDef(st, pending.newId!).name}?` : `¿Añadir ${exDef(st, pending.newId!).name}?`}
          routine={routine}
          onPick={applyScope}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  )
}

function lastTime(s: Session, b: ExerciseBlock, st: ReturnType<typeof useStore>): string | null {
  const h = history(st, b.id, s.date, s.id)[0]
  if (!h) return null
  const done = h.log.filter((l) => l.done)
  if (!done.length) return null
  const def = exDef(st, b.id)
  if (def.load === 'plyo') return `${done.length} series`
  const kgs = [...new Set(done.map((l) => l.kg).filter((k) => k != null))]
  const reps = done.map((l) => l.reps ?? 0).join('·')
  if (def.load === 'bw' || !kgs.length) return `${reps} reps`
  const kgTxt = kgs.length === 1 ? `${fmtNum(kgs[0]!)} kg` : `${fmtNum(Math.min(...(kgs as number[])))}–${fmtNum(Math.max(...(kgs as number[])))} kg`
  return `${def.load === 'bw+' && kgs[0] === 0 ? 'peso corporal' : kgTxt} × ${reps}`
}

function Exercise({
  s,
  b,
  locked,
  onSet,
  onToggle,
  onMenu,
}: {
  s: Session
  b: ExerciseBlock
  locked: boolean
  onSet: (li: number, p: { kg?: number | null; reps?: number | null }) => void
  onToggle: (li: number) => void
  onMenu: () => void
}) {
  const st = useStore()
  const def = exDef(st, b.id)
  const withKg = def.load === 'kg' || def.load === 'bw+'
  const range = b.repMin === b.repMax ? `${b.repMin}` : `${b.repMin}–${b.repMax}`
  let target = `${b.sets} × ${b.targetReps}`
  if (def.load === 'kg') target += b.targetKg != null ? ` · ${fmtNum(b.targetKg)} kg` : ''
  if (def.load === 'bw+' && b.targetKg) target += ` · +${fmtNum(b.targetKg)} kg`
  const last = lastTime(s, b, st)
  const allDone = b.log.length > 0 && b.log.every((l) => l.done)

  return (
    <div className={`ex ${allDone ? 'complete' : ''}`}>
      <div className="ex-head">
        <div className="ex-title">
          <div className="ex-name">{def.name}</div>
          <div className="ex-target">
            {target}
            {def.load === 'kg' && b.targetKg == null && <span className="tag-soft">elige peso</span>}
          </div>
        </div>
        {!locked && (
          <button className="icon-btn sm" onClick={onMenu} aria-label="Opciones del ejercicio">
            <IMore />
          </button>
        )}
      </div>
      <div className="ex-cue">
        {def.load === 'plyo' ? 'Pliometría' : `Rango ${range} reps`}
        {b.deload ? ' · descarga' : ''}
        {last && <> · <span className="last">Última vez: {last}</span></>}
      </div>
      {def.cue && <div className="ex-cue dim">{def.cue}</div>}
      <div className="sets">
        {b.log.map((l, li) => (
          <div key={li} className={`set ${l.done ? 'on' : ''} ${withKg ? '' : 'nokg'}`}>
            <span className="set-n">{li + 1}</span>
            {withKg && <NumIn value={l.kg} placeholder="—" suffix="kg" disabled={locked} onChange={(v) => onSet(li, { kg: v })} />}
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
            Si corres 4,5 km o más a mejor ritmo que tu 5K, la app actualiza todos tus ritmos.
          </p>
        </div>
      )}
    </div>
  )
}
