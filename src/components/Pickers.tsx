import { useMemo, useState, type ReactNode } from 'react'
import type { ExerciseDef, Load } from '../lib/types'
import { actions, useStore } from '../lib/store'
import { GROUPS, allExercises, exDef } from '../lib/program'
import { IClose, IPlus, ISearch } from './Icons'

/** Hoja inferior genérica. */
export function Popup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-head">
          <h3>{title}</h3>
          <button className="icon-btn sm" onClick={onClose} aria-label="Cerrar">
            <IClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Menos">
        −
      </button>
      <span className="tnum">
        {value}
        {suffix && <small>{suffix}</small>}
      </span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Más">
        +
      </button>
    </div>
  )
}

/** ¿Solo hoy o también en la rutina? */
export function ScopePopup({ text, routine, onPick, onClose }: { text: string; routine?: string; onPick: (scope: 'session' | 'always') => void; onClose: () => void }) {
  return (
    <Popup title={text} onClose={onClose}>
      <button className="choice" onClick={() => onPick('session')}>
        <b>Solo hoy</b>
        <span>La rutina sigue igual para las próximas sesiones.</span>
      </button>
      {routine && (
        <button className="choice" onClick={() => onPick('always')}>
          <b>Siempre</b>
          <span>Se guarda en «{routine}» y el plan se recalcula.</span>
        </button>
      )}
    </Popup>
  )
}

/** Buscador de ejercicios: alternativas del mismo grupo primero, luego toda la biblioteca. */
export function ExercisePicker({ current, title, onPick, onClose }: { current?: string; title: string; onPick: (id: string) => void; onClose: () => void }) {
  const st = useStore()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const group = current ? exDef(st, current).group : null

  const lists = useMemo(() => {
    const all = allExercises(st).filter((e) => e.id !== current)
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const match = all.filter((e) => !q || norm(e.name).includes(norm(q)) || norm(GROUPS[e.group] ?? '').includes(norm(q)))
    const byGroup: Record<string, ExerciseDef[]> = {}
    for (const e of match) (byGroup[e.group] ??= []).push(e)
    return { alts: group ? (byGroup[group] ?? []) : [], byGroup }
  }, [st, q, current, group])

  if (creating) return <CreateExercise initialName={q} initialGroup={group ?? 'otro'} onCreated={onPick} onBack={() => setCreating(false)} />

  return (
    <div className="sheet picker">
      <div className="sheet-inner">
        <div className="sheet-bar">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <IClose />
          </button>
        </div>
        <label className="search">
          <ISearch />
          <input placeholder="Buscar ejercicio o grupo" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>

        <button className="row-btn accent-row" onClick={() => setCreating(true)}>
          <IPlus /> Crear ejercicio{q ? ` «${q}»` : ''}
        </button>

        {lists.alts.length > 0 && (
          <div className="section">
            <div className="section-title">Alternativas · {GROUPS[group!]}</div>
            <div className="list">
              {lists.alts.map((e) => (
                <ExRow key={e.id} e={e} onPick={onPick} />
              ))}
            </div>
          </div>
        )}
        {Object.entries(GROUPS)
          .filter(([g]) => g !== group && lists.byGroup[g]?.length)
          .map(([g, label]) => (
            <div className="section" key={g}>
              <div className="section-title">{label}</div>
              <div className="list">
                {lists.byGroup[g].map((e) => (
                  <ExRow key={e.id} e={e} onPick={onPick} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

const LOAD_LABEL: Record<Load, string> = { kg: 'Con peso', 'bw+': 'Peso corporal + lastre', bw: 'Peso corporal', plyo: 'Salto' }

function ExRow({ e, onPick }: { e: ExerciseDef; onPick: (id: string) => void }) {
  return (
    <button className="list-row" onClick={() => onPick(e.id)}>
      <span className="grow">
        <b>{e.name}</b>
        <small>
          {e.load === 'plyo' ? 'Salto · sin peso' : `${e.repMin}–${e.repMax} reps · ${LOAD_LABEL[e.load]}`}
          {e.custom ? ' · tuyo' : ''}
        </small>
      </span>
      <IPlus />
    </button>
  )
}

function CreateExercise({ initialName, initialGroup, onCreated, onBack }: { initialName: string; initialGroup: string; onCreated: (id: string) => void; onBack: () => void }) {
  const [name, setName] = useState(initialName)
  const [group, setGroup] = useState(initialGroup)
  const [load, setLoad] = useState<Load>('kg')
  const [repMin, setRepMin] = useState(8)
  const [repMax, setRepMax] = useState(12)
  const inc = load === 'kg' ? (group === 'rodilla' || group === 'cadera' ? 5 : 2.5) : load === 'bw+' ? 2.5 : 0

  return (
    <div className="sheet picker">
      <div className="sheet-inner">
        <div className="sheet-bar">
          <h2 className="sheet-title">Nuevo ejercicio</h2>
          <button className="icon-btn" onClick={onBack} aria-label="Volver">
            <IClose />
          </button>
        </div>
        <div className="form">
          <label className="field">
            <span>Nombre</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Sentadilla en multipower" autoFocus />
          </label>
          <div className="field">
            <span>Grupo</span>
            <div className="seg">
              {Object.entries(GROUPS).map(([g, l]) => (
                <button key={g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Tipo</span>
            <div className="seg">
              {(Object.keys(LOAD_LABEL) as Load[]).map((l) => (
                <button key={l} className={load === l ? 'on' : ''} onClick={() => setLoad(l)}>
                  {LOAD_LABEL[l]}
                </button>
              ))}
            </div>
          </div>
          {load !== 'plyo' && (
            <div className="grid2">
              <div className="field">
                <span>Reps mínimas</span>
                <Stepper value={repMin} min={1} max={repMax} onChange={setRepMin} />
              </div>
              <div className="field">
                <span>Reps máximas</span>
                <Stepper value={repMax} min={repMin} max={30} onChange={setRepMax} />
              </div>
            </div>
          )}
          <p className="muted small">
            {load === 'plyo'
              ? 'Sin peso: la app sube series con cada ciclo.'
              : `Cuando completes ${repMax} reps en todas las series, subirá ${inc ? `${String(inc).replace('.', ',')} kg` : 'la dificultad'}.`}
          </p>
          <button
            className="btn"
            disabled={!name.trim()}
            onClick={() => onCreated(actions.createExercise({ name: name.trim(), group, load, repMin: load === 'plyo' ? 3 : repMin, repMax: load === 'plyo' ? 3 : repMax, inc }))}
          >
            Crear y usar
          </button>
        </div>
      </div>
    </div>
  )
}
