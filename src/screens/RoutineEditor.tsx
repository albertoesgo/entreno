import { useState } from 'react'
import type { GymTemplate, GymTemplateDef } from '../lib/types'
import { actions, useStore } from '../lib/store'
import { DEFAULT_TEMPLATES, GROUPS, exDef } from '../lib/program'
import { IClose, IDown, IPlus, ISwap, ITrash, IUp } from '../components/Icons'
import { ExercisePicker, Stepper } from '../components/Pickers'

export function RoutineEditor({ t, onClose }: { t: GymTemplate; onClose: () => void }) {
  const st = useStore()
  const [draft, setDraft] = useState<GymTemplateDef>(() => structuredClone(st.templates[t]))
  const [open, setOpen] = useState<number | null>(null)
  const [picking, setPicking] = useState<{ index?: number } | null>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(st.templates[t])

  const set = (fn: (d: GymTemplateDef) => void) =>
    setDraft((prev) => {
      const d = structuredClone(prev)
      fn(d)
      return d
    })

  return (
    <div className="sheet" style={{ '--c': 'var(--gym)' } as React.CSSProperties}>
      <div className="sheet-inner">
        <div className="sheet-bar">
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <IClose />
          </button>
          <button className="btn sm line" onClick={() => setDraft(structuredClone(DEFAULT_TEMPLATES[t]))}>
            Restablecer
          </button>
        </div>
        <div className="eyebrow accent">Rutina {t}</div>
        <input className="title-input" value={draft.title} onChange={(e) => set((d) => (d.title = e.target.value))} aria-label="Nombre de la rutina" />
        <p className="muted sub">Los cambios se aplican a las próximas sesiones; el motor recalcula pesos y series con tu historial.</p>

        <div className="section list">
          {draft.items.map((it, i) => {
            const def = exDef(st, it.id)
            const repMin = it.repMin ?? def.repMin
            const repMax = it.repMax ?? def.repMax
            const isOpen = open === i
            return (
              <div key={`${it.id}-${i}`} className={`edit-row ${isOpen ? 'open' : ''}`}>
                <button className="list-row" onClick={() => setOpen(isOpen ? null : i)}>
                  <span className="order tnum">{i + 1}</span>
                  <span className="grow">
                    <b>{def.name}</b>
                    <small>
                      {it.sets} series · {def.load === 'plyo' ? 'pliometría' : `${repMin}–${repMax} reps · ${GROUPS[def.group] ?? ''}`}
                    </small>
                  </span>
                </button>
                {isOpen && (
                  <div className="edit-body">
                    <div className="edit-grid">
                      <div className="field">
                        <span>Series</span>
                        <Stepper value={it.sets} min={1} max={6} onChange={(v) => set((d) => (d.items[i].sets = v))} />
                      </div>
                      {def.load !== 'plyo' && (
                        <>
                          <div className="field">
                            <span>Mín.</span>
                            <Stepper value={repMin} min={1} max={repMax} onChange={(v) => set((d) => ((d.items[i].repMin = v), (d.items[i].repMax = repMax)))} />
                          </div>
                          <div className="field">
                            <span>Máx.</span>
                            <Stepper value={repMax} min={repMin} max={30} onChange={(v) => set((d) => ((d.items[i].repMax = v), (d.items[i].repMin = repMin)))} />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="tool-row">
                      <button disabled={i === 0} onClick={() => (set((d) => d.items.splice(i - 1, 0, ...d.items.splice(i, 1))), setOpen(i - 1))} aria-label="Subir">
                        <IUp />
                      </button>
                      <button disabled={i === draft.items.length - 1} onClick={() => (set((d) => d.items.splice(i + 1, 0, ...d.items.splice(i, 1))), setOpen(i + 1))} aria-label="Bajar">
                        <IDown />
                      </button>
                      <button onClick={() => setPicking({ index: i })}>
                        <ISwap /> Cambiar
                      </button>
                      <button className="danger" onClick={() => (set((d) => d.items.splice(i, 1)), setOpen(null))}>
                        <ITrash /> Quitar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <button className="row-btn" onClick={() => setPicking({})}>
            <IPlus /> Añadir ejercicio
          </button>
        </div>
      </div>

      <div className="sheet-foot">
        <div>
          <button
            className="btn"
            disabled={!dirty || !draft.items.length || !draft.title.trim()}
            onClick={() => {
              actions.setTemplate(t, draft)
              onClose()
            }}
          >
            {dirty ? 'Guardar y reajustar plan' : 'Sin cambios'}
          </button>
        </div>
      </div>

      {picking && (
        <ExercisePicker
          current={picking.index != null ? draft.items[picking.index].id : undefined}
          title={picking.index != null ? 'Cambiar ejercicio' : 'Añadir ejercicio'}
          onPick={(id) => {
            set((d) => {
              if (picking.index != null) d.items[picking.index] = { id, sets: d.items[picking.index].sets }
              else d.items.push({ id, sets: 3 })
            })
            if (picking.index == null) setOpen(draft.items.length)
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}
