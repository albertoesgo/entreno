import { useEffect, useMemo, useState } from 'react'
import { actions, useStore } from '../lib/store'
import { GROUPS, exDef } from '../lib/program'
import type { HowTo } from '../lib/howto'
import { IClose, IPlay, ISearch } from './Icons'
import { Popup } from './Pickers'

// Fotos de free-exercise-db (dominio público) servidas por jsDelivr. Versión fijada
// para que no cambien; el service worker las guarda al verlas la primera vez.
const REV = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5'
const demoUrl = (demo: string, i: 0 | 1) => `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${REV}/exercises/${demo}/${i}.jpg`

const youtube = (name: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} técnica`)}`

/** Ficha de un ejercicio: animación de 2 fotogramas, técnica y vídeo. */
export function ExerciseInfo({ id, onClose }: { id: string; onClose: () => void }) {
  const st = useStore()
  const def = exDef(st, id)
  const [how, setHow] = useState<HowTo | null>()
  const [picking, setPicking] = useState(false)
  const [video, setVideo] = useState(def.video ?? '')

  useEffect(() => {
    let alive = true
    import('../lib/howto').then((m) => alive && setHow(m.HOWTO[id] ?? null))
    return () => {
      alive = false
    }
  }, [id])

  const demo = def.custom ? def.demo : how?.demo
  const meta = [GROUPS[def.group], how?.muscles].filter(Boolean).join(' · ')
  const validVideo = /^https?:\/\/\S+$/.test(video.trim())

  return (
    <>
      <Popup title={def.name} onClose={onClose} top>
        {meta && <div className="small muted info-meta">{meta}</div>}

        {demo ? (
          <Demo key={demo} demo={demo} />
        ) : how !== undefined ? (
          <div className="demo-empty small muted">{def.custom ? 'Aún sin demostración. Elige una de la biblioteca o añade tu vídeo.' : 'Sin imagen para este ejercicio: mira el vídeo.'}</div>
        ) : (
          <div className="demo loading" />
        )}

        {how?.steps && (
          <ol className="steps">
            {how.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
        {def.cue && <div className="callout small info-cue">{def.cue}</div>}

        <div className="info-actions">
          <a className="btn line sm" href={def.video || youtube(def.name)} target="_blank" rel="noopener noreferrer">
            <IPlay /> {def.video ? 'Ver mi vídeo' : 'Buscar vídeo'}
          </a>
          {def.custom && (
            <button className="btn line sm" onClick={() => setPicking(true)}>
              <ISearch /> {demo ? 'Cambiar imagen' : 'Elegir imagen'}
            </button>
          )}
        </div>

        {def.custom && (
          <div className="inline-add">
            <input className="input" type="url" inputMode="url" placeholder="Pega un enlace de vídeo (YouTube, Instagram…)" value={video} onChange={(e) => setVideo(e.target.value)} />
            <button
              className="btn sm"
              disabled={video.trim() === (def.video ?? '') || (!!video.trim() && !validVideo)}
              onClick={() => actions.updateExercise(id, { video: video.trim() || undefined })}
            >
              {def.video && !video.trim() ? 'Quitar' : 'Guardar'}
            </button>
          </div>
        )}
      </Popup>

      {picking && (
        <DemoPicker
          initial={def.name}
          onPick={(d) => {
            actions.updateExercise(id, { demo: d })
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}

/** Dos fotos (inicio y final) que se alternan: ligero, sin vídeo. Toca para pausar. */
function Demo({ demo }: { demo: string }) {
  const [loaded, setLoaded] = useState(0)
  const [failed, setFailed] = useState(false)
  const [paused, setPaused] = useState(false)
  const ready = loaded >= 2
  const img = (i: 0 | 1) => (
    <img
      className={i ? 'b' : 'a'}
      src={demoUrl(demo, i)}
      crossOrigin="anonymous"
      decoding="async"
      alt={i ? 'Posición final' : 'Posición inicial'}
      onLoad={() => setLoaded((n) => n + 1)}
      onError={() => setFailed(true)}
    />
  )
  return (
    <div className="demo-wrap">
      <button className={`demo ${ready ? 'ready' : 'loading'} ${paused ? 'paused' : ''}`} onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Reanudar animación' : 'Pausar animación'}>
        {!failed && img(0)}
        {!failed && img(1)}
        {failed && <span className="demo-msg small">Sin conexión. La demostración se verá cuando tengas internet.</span>}
      </button>
      {ready && <div className="tiny muted">Inicio ↔ final · toca para {paused ? 'reanudar' : 'pausar'}</div>}
    </div>
  )
}

// Español → inglés para buscar en la biblioteca de demostraciones.
const ES: [string, string[]][] = [
  ['peso muerto', ['deadlift']], ['buenos dias', ['good morning']], ['hip thrust', ['hip thrust']],
  ['sentadilla', ['squat']], ['zancada', ['lunge']], ['remo', ['row']], ['jalon', ['pulldown']], ['dominada', ['pull-up', 'pullup', 'chin']],
  ['fondo', ['dip']], ['banca', ['bench']], ['inclinad', ['incline']], ['declinad', ['decline']], ['mancuerna', ['dumbbell']],
  ['barra z', ['ez']], ['barra', ['barbell']], ['polea', ['cable']], ['maquina', ['machine', 'leverage']], ['multipower', ['smith']],
  ['martillo', ['hammer']], ['hombro', ['shoulder']], ['militar', ['military', 'shoulder press']], ['elevacion', ['raise']],
  ['frontal', ['front']], ['pajaro', ['rear delt', 'reverse fl']], ['apertura', ['fly', 'flye']], ['pecho', ['chest']],
  ['gemelo', ['calf']], ['femoral', ['leg curl', 'hamstring']], ['cuadriceps', ['leg extension', 'quadriceps']], ['prensa', ['leg press']],
  ['gluteo', ['glute']], ['puente', ['bridge']], ['cadera', ['hip']], ['abdominal', ['crunch', 'ab ']], ['plancha', ['plank']],
  ['salto', ['jump', 'hop', 'bound']], ['cajon', ['box']], ['encogimiento', ['shrug']], ['muneca', ['wrist']], ['goma', ['band']],
  ['balon', ['ball']], ['pierna', ['leg']], ['rodilla', ['knee']], ['aductor', ['adduct']], ['abductor', ['abduct']],
  ['extension', ['extension']], ['hiperextension', ['hyperextension']], ['cargada', ['clean']], ['arrancada', ['snatch']],
  ['granjero', ['farmer']], ['giro', ['twist']], ['lenador', ['wood chop']], ['rueda', ['roller']], ['flexion', ['push-up', 'pushup']],
  ['trasnuca', ['behind']], ['alta', ['high']], ['alto', ['high']], ['baja', ['low']], ['bajo', ['low']], ['sentado', ['seated']], ['de pie', ['standing']], ['tumbado', ['lying']], ['una mano', ['one-arm', 'one arm']],
  ['una pierna', ['one-leg', 'single-leg', 'one leg']], ['estrecho', ['close-grip']], ['ancho', ['wide']], ['frances', ['skullcrusher', 'lying triceps']],
  ['predicador', ['preacher']], ['concentrado', ['concentration']], ['patada', ['kickback']], ['press', ['press']], ['curl', ['curl']],
]
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

type DemoRow = [id: string, name: string, muscle: string, equip: string]

function DemoPicker({ initial, onPick, onClose }: { initial: string; onPick: (demo: string) => void; onClose: () => void }) {
  const [rows, setRows] = useState<DemoRow[] | null>(null)
  const [error, setError] = useState(false)
  const [q, setQ] = useState(initial)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}demos.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError(true))
  }, [])

  const results = useMemo(() => {
    if (!rows) return []
    let text = norm(q)
    // Cada término (en español o inglés) se convierte en una lista de alternativas
    const terms: string[][] = []
    for (const [es, en] of ES)
      if (text.includes(es)) {
        terms.push([es, ...en])
        text = text.replace(es, ' ')
      }
    for (const w of text.split(/\s+/)) if (w.length > 2 && !['con', 'del', 'las', 'los', 'para'].includes(w)) terms.push([w])
    if (!terms.length) return rows.slice(0, 30)
    const scored = rows
      .map((r) => {
        const hay = norm(`${r[1]} ${r[2]} ${r[3]}`)
        return { r, score: terms.filter((alts) => alts.some((a) => hay.includes(a))).length }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.r[1].length - b.r[1].length)
    return scored.slice(0, 40).map((x) => x.r)
  }, [rows, q])

  return (
    <div className="sheet picker top">
      <div className="sheet-inner">
        <div className="sheet-bar">
          <h2 className="sheet-title">Elegir imagen</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <IClose />
          </button>
        </div>
        <label className="search">
          <ISearch />
          <input placeholder="Ej. remo polea, press inclinado…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <p className="small muted" style={{ marginBottom: 12 }}>
          Biblioteca libre de ~750 ejercicios (nombres en inglés). Toca uno para verlo.
        </p>
        {error && <div className="callout bad small">No se pudo cargar la biblioteca. Revisa la conexión.</div>}
        {!rows && !error && <div className="demo loading" />}
        <div className="list">
          {results.map(([id, name, muscle, equip]) => (
            <div key={id} className={`demo-row ${open === id ? 'open' : ''}`}>
              <button className="list-row" onClick={() => setOpen(open === id ? null : id)}>
                <span className="grow">
                  <b>{name}</b>
                  <small>{[muscle, equip].filter(Boolean).join(' · ')}</small>
                </span>
                <IPlay />
              </button>
              {open === id && (
                <div className="demo-row-body">
                  <Demo demo={id} />
                  <button className="btn sm" onClick={() => onPick(id)}>
                    Usar esta
                  </button>
                </div>
              )}
            </div>
          ))}
          {rows && !results.length && <p className="muted small">Nada encontrado. Prueba con otra palabra (en inglés también vale).</p>}
        </div>
      </div>
    </div>
  )
}
