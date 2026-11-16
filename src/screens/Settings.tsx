import { useRef, useState } from 'react'
import { actions, useStore } from '../lib/store'
import { ProfileForm } from '../components/ProfileForm'
import { todayIso } from '../lib/dates'
import { currentPosition, distanceM } from '../lib/geo'
import { coachKey, coachModel, forgetCoach } from '../lib/coach'
import type { GymTemplate } from '../lib/types'
import { RoutineEditor } from './RoutineEditor'
import { IChevR, ISpark } from '../components/Icons'

export function Settings() {
  const st = useStore()
  const [saved, setSaved] = useState(false)
  const [key, setKey] = useState(0)
  const file = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<GymTemplate | null>(null)
  const [, force] = useState(0)
  const hasCoach = !!coachKey()

  const download = () => {
    const blob = new Blob([actions.exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `entreno-${todayIso()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Tu plan</div>
          <h1>Ajustes</h1>
        </div>
      </div>

      <div className="section-head">
        <span className="section-title">Rutinas de gimnasio</span>
      </div>
      <div className="list card-list">
        {(Object.keys(st.templates) as GymTemplate[]).map((t) => (
          <button key={t} className="list-row" onClick={() => setEditing(t)}>
            <span className="badge-letter">{t}</span>
            <span className="grow">
              <b>{st.templates[t].title}</b>
              <small>{st.templates[t].items.length} ejercicios · toca para editar</small>
            </span>
            <IChevR />
          </button>
        ))}
      </div>

      <div className="section">
        <div className="section-head">
          <span className="section-title">Coach IA</span>
          {hasCoach && <span className="small" style={{ color: 'var(--run)' }}>conectado</span>}
        </div>
        <div className="card stack">
          <div className="row-inline">
            <span className="spark sm">
              <ISpark />
            </span>
            <p className="small muted" style={{ flex: 1 }}>
              {hasCoach ? `Usando ${coachModel()}. La clave solo está en este móvil.` : 'Conéctalo desde la pestaña Coach con tu clave gratuita de Gemini.'}
            </p>
          </div>
          {hasCoach && (
            <button className="btn line sm danger" onClick={() => (forgetCoach(), force((n) => n + 1))}>
              Desconectar y borrar clave
            </button>
          )}
        </div>
      </div>

      <div className="section-head section">
        <span className="section-title">Perfil y plan</span>
      </div>
      <ProfileForm
        key={key}
        initial={st.profile}
        submitLabel={saved ? 'Guardado · plan reajustado' : 'Guardar y reajustar'}
        onSubmit={(p) => {
          actions.setProfile(p)
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        }}
      />

      <GymPlace />
      {editing && <RoutineEditor t={editing} onClose={() => setEditing(null)} />}

      <div className="section">
        <div className="section-head">
          <span className="section-title">Datos</span>
        </div>
        <div className="card stack">
          <p className="muted small">Todo se guarda solo en este móvil. Exporta de vez en cuando como copia de seguridad.</p>
          <div className="row">
            <button className="btn ghost sm" onClick={download}>
              Exportar
            </button>
            <button className="btn ghost sm" onClick={() => file.current?.click()}>
              Importar
            </button>
          </div>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                actions.importJSON(await f.text())
                setKey((k) => k + 1)
              } catch {
                alert('Ese archivo no es una copia de Entreno.')
              }
              e.target.value = ''
            }}
          />
          <button
            className="btn line danger sm"
            onClick={() => {
              if (confirm('¿Borrar todos los datos y empezar de cero?')) actions.reset()
            }}
          >
            Borrar todo
          </button>
        </div>
      </div>
    </>
  )
}

const NOTIF_TEXT = 'Estás en el gimnasio 💪 Abre Entreno y registra tu rutina'

function GymPlace() {
  const st = useStore()
  const g = st.profile.gym
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const save = async () => {
    setBusy(true)
    setMsg('')
    try {
      const p = await currentPosition(15_000)
      actions.setProfile({ gym: { lat: p.lat, lng: p.lng, radius: 150 }, gymDetect: true })
      setMsg(`Guardado (precisión ±${Math.round(p.acc)} m).`)
    } catch {
      setMsg('No he podido leer tu ubicación. Revisa que Safari tenga permiso de localización.')
    } finally {
      setBusy(false)
    }
  }

  const check = async () => {
    if (!g) return
    try {
      const p = await currentPosition()
      setMsg(`Ahora mismo estás a ${Math.round(distanceM(p, g))} m del gimnasio.`)
    } catch {
      setMsg('No he podido leer tu ubicación.')
    }
  }

  return (
    <div className="section">
      <div className="section-head">
        <span className="section-title">Mi gimnasio</span>
        {g && <span className="small" style={{ color: 'var(--gym)' }}>guardado</span>}
      </div>
      <div className="card stack">
        <p className="muted small">
          {g
            ? 'Cuando abras Entreno estando allí, te abre directamente la rutina de hoy.'
            : 'Hazlo estando en el gimnasio: guarda la ubicación y, cuando abras la app allí, te lleva directo a la rutina.'}
        </p>
        <button className="btn ghost sm" style={{ width: '100%' }} disabled={busy} onClick={save}>
          {busy ? 'Buscando ubicación…' : g ? 'Actualizar con mi ubicación actual' : 'Estoy en el gimnasio: guardar ubicación'}
        </button>
        {g && (
          <>
            <div className="toggle">
              <span className="small">Detectar al abrir la app</span>
              <div className="seg" style={{ '--c': 'var(--gym)' } as React.CSSProperties}>
                <button className={!st.profile.gymDetect ? 'on' : ''} onClick={() => actions.setProfile({ gymDetect: false })}>
                  No
                </button>
                <button className={st.profile.gymDetect ? 'on' : ''} onClick={() => actions.setProfile({ gymDetect: true })}>
                  Sí
                </button>
              </div>
            </div>
            <div className="row">
              <button className="btn line sm" onClick={check}>
                Ver distancia
              </button>
              <button className="btn line sm danger" onClick={() => actions.setProfile({ gym: null })}>
                Quitar
              </button>
            </div>
          </>
        )}
        {msg && <p className="small">{msg}</p>}

        <details className="hint">
          <summary>Aviso al llegar (iPhone)</summary>
          <p className="muted small" style={{ margin: '10px 0 12px' }}>
            Las apps web no pueden vigilar tu ubicación en segundo plano, pero Atajos de iOS sí, sin gastar batería. Se configura una vez:
          </p>
          <ol className="guide">
            <li><span>Abre <b>Atajos</b> → pestaña <b>Automatización</b> → <b>Nueva automatización</b>.</span></li>
            <li><span>Elige <b>Llegar</b>, toca <b>Ubicación</b> y busca tu gimnasio. Ajusta el radio pequeño.</span></li>
            <li><span>Opcional: limita el horario a cuando sueles ir.</span></li>
            <li><span>Marca <b>Ejecutar inmediatamente</b> y pulsa <b>Siguiente</b>.</span></li>
            <li><span><b>Nuevo atajo vacío</b> → añade la acción <b>Mostrar notificación</b> con este texto:</span></li>
          </ol>
          <div className="copy" style={{ marginTop: 10 }}>
            <span>{NOTIF_TEXT}</span>
            <button
              className="btn sm ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(NOTIF_TEXT)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                } catch {
                  /* sin portapapeles */
                }
              }}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Al llegar te saltará el aviso; abre Entreno y verás tu rutina lista para apuntar.
          </p>
        </details>
      </div>
    </div>
  )
}
