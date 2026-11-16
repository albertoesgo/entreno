import { useEffect, useRef, useState, type ReactNode } from 'react'
import { actions, useStore } from '../lib/store'
import { askCoach, coachKey, coachModel, connectCoach, isCoachError } from '../lib/coach'
import { todayIso } from '../lib/dates'
import { ICheck, ISend, ISpark } from '../components/Icons'

const SUGGESTIONS = [
  '¿Qué me toca hoy y por qué?',
  'Hoy solo tengo 40 minutos',
  'Me molesta la rodilla, adapta la pierna',
  'Cambia el press banca por algo con mancuernas',
  'Esta semana tengo partido el miércoles',
  '¿Cómo voy hacia mi objetivo?',
]

/** Markdown mínimo: **negrita**, listas y saltos de línea. */
function Rich({ text }: { text: string }) {
  const inline = (t: string) =>
    t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p))
  const out: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) out.push(<ul key={out.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>)
    list = []
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/)
    if (m) list.push(m[1])
    else {
      flush()
      if (line.trim()) out.push(<p key={out.length}>{inline(line)}</p>)
    }
  }
  flush()
  return <>{out}</>
}

export function Coach({ draft, clearDraft }: { draft?: string; clearDraft: () => void }) {
  const st = useStore()
  const [connected, setConnected] = useState(!!coachKey())
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [st.chat.length, busy])

  const send = async (msg: string) => {
    const t = msg.trim()
    if (!t || busy) return
    setText('')
    setError('')
    const history = st.chat
    actions.pushChat({ role: 'user', text: t, at: todayIso() })
    setBusy(true)
    try {
      const r = await askCoach(history, t)
      actions.pushChat({ role: 'model', text: r.text, actions: r.actions, at: todayIso() })
    } catch (e) {
      setError(isCoachError(e) ? e.message : 'No he podido conectar con Gemini. ¿Tienes conexión?')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (draft && connected) {
      send(draft)
      clearDraft()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, connected])

  if (!connected) return <CoachSetup onDone={() => setConnected(true)} />

  return (
    <div className="coach">
      <div className="head">
        <div>
          <div className="eyebrow">{coachModel()}</div>
          <h1>Coach</h1>
        </div>
        {st.chat.length > 0 && (
          <button className="btn sm ghost" onClick={() => actions.clearChat()}>
            Nueva charla
          </button>
        )}
      </div>

      {st.chat.length === 0 && (
        <div className="coach-empty">
          <div className="spark">
            <ISpark />
          </div>
          <p>
            Conozco tu plan, tus registros y tus rutinas. Pídeme cambios y los hago yo: mover sesiones, cambiar ejercicios, adaptar la semana…
          </p>
        </div>
      )}

      <div className="chat">
        {st.chat.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">
              <Rich text={m.text} />
            </div>
            {m.actions && m.actions.length > 0 && (
              <div className="acts">
                {m.actions.map((a, j) => (
                  <span key={j} className="act">
                    <ICheck /> {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="msg model">
            <div className="bubble typing">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        {error && <div className="callout bad small">{error}</div>}
        <div ref={end} />
      </div>

      <div className="composer-wrap">
        {!busy && (
          <div className="chips-scroll">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            send(text)
          }}
        >
          <input placeholder="Escribe al coach…" value={text} onChange={(e) => setText(e.target.value)} enterKeyHint="send" />
          <button type="submit" disabled={!text.trim() || busy} aria-label="Enviar">
            <ISend />
          </button>
        </form>
      </div>
    </div>
  )
}

export function CoachSetup({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Con Gemini · gratis</div>
          <h1>Coach</h1>
        </div>
      </div>
      <div className="card stack">
        <div className="coach-empty" style={{ padding: 0, textAlign: 'left' }}>
          <div className="spark">
            <ISpark />
          </div>
          <p>Un entrenador que conoce tu plan y lo cambia por ti cuando se lo pides. Funciona con tu propia clave gratuita de Google Gemini.</p>
        </div>
        <ol className="guide">
          <li>
            <span>
              Abre{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>{' '}
              e inicia sesión con Google.
            </span>
          </li>
          <li>
            <span>
              Pulsa <b>Create API key</b> y cópiala.
            </span>
          </li>
          <li>
            <span>Pégala aquí:</span>
          </li>
        </ol>
        <input className="input" placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value.trim())} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        {error && <div className="callout bad small">{error}</div>}
        <button
          className="btn"
          disabled={key.length < 20 || busy}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              await connectCoach(key)
              onDone()
            } catch (e) {
              setError(isCoachError(e) ? e.message : 'No he podido conectar. Revisa la clave y tu conexión.')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Conectando…' : 'Conectar coach'}
        </button>
        <p className="muted small">
          La clave se guarda solo en este móvil y nunca se exporta. Cuando hablas con el coach, tu plan y tus registros se envían a Google para generar la respuesta; en el nivel gratuito Google puede usarlos para mejorar sus modelos.
        </p>
      </div>
    </>
  )
}
