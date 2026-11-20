import { useMemo, useState } from 'react'
import { actions, useStore } from '../lib/store'
import { fetchEvents, looksLikeCalUrl, normalizeCalUrl, syncCalendar } from '../lib/calendar'
import { DEFAULT_WORDS, isMatch, type CalEvent } from '../lib/ics'
import { fmtDay, todayIso } from '../lib/dates'
import type { CalendarLink } from '../lib/types'

const C = { '--c': 'var(--match)' } as React.CSSProperties

function ago(isoTime?: string): string {
  if (!isoTime) return 'nunca'
  const min = Math.round((Date.now() - Date.parse(isoTime)) / 60_000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  if (min < 48 * 60) return `hace ${Math.round(min / 60)} h`
  return `el ${fmtDay(isoTime.slice(0, 10))}`
}

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle">
      <span className="small">{label}</span>
      <div className="seg" style={C}>
        <button className={!value ? 'on' : ''} onClick={() => onChange(false)}>
          No
        </button>
        <button className={value ? 'on' : ''} onClick={() => onChange(true)}>
          Sí
        </button>
      </div>
    </div>
  )
}

function MatchRow({ date, time, title, location }: { date: string; time?: string; title: string; location?: string }) {
  return (
    <div className="cal-row">
      <span className="cal-date">
        <b>{fmtDay(date)}</b>
        {time && <small className="tnum">{time}</small>}
      </span>
      <span className="grow">
        <b>{title}</b>
        {location && <small>{location}</small>}
      </span>
    </div>
  )
}

export function CalendarSection() {
  const st = useStore()
  return (
    <div className="section">
      <div className="section-head">
        <span className="section-title">Calendario de partidos</span>
        {st.calendar && <span className="small" style={{ color: st.calendar.error ? 'var(--bad)' : 'var(--match)' }}>{st.calendar.error ? 'error' : 'conectado'}</span>}
      </div>
      {st.calendar ? <Connected c={st.calendar} /> : <Connect />}
    </div>
  )
}

function Connect() {
  const [url, setUrl] = useState('')
  const [words, setWords] = useState(DEFAULT_WORDS)
  const [all, setAll] = useState(false)
  const [replaceWeekend, setReplaceWeekend] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<CalEvent[] | null>(null)
  const today = todayIso()
  const upcoming = useMemo(() => (events ?? []).filter((e) => e.date >= today), [events, today])
  const matches = useMemo(() => upcoming.filter((e) => isMatch(e, words, all)), [upcoming, words, all])

  const test = async () => {
    setBusy(true)
    setError('')
    setEvents(null)
    try {
      setEvents(await fetchEvents(url))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card stack">
      <p className="muted small">
        Conecta el calendario donde tienes los partidos: la app los añade sola, quita el entreno de basket si coincide y recoloca el gimnasio y las carreras alrededor. Si un partido cambia o se cancela, también se entera.
      </p>

      <details className="hint">
        <summary>Cómo conseguir el enlace</summary>
        <p className="small" style={{ margin: '10px 0 6px' }}>
          <b>Si el club o la federación te pasó un calendario suscrito:</b>
        </p>
        <ol className="guide">
          <li><span>Ajustes del iPhone → <b>Apps</b> → <b>Calendario</b> → <b>Cuentas</b> → <b>Calendarios suscritos</b>.</span></li>
          <li><span>Toca el calendario y copia la dirección (empieza por <b>webcal://</b> o <b>https://</b>).</span></li>
        </ol>
        <p className="small" style={{ margin: '14px 0 6px' }}>
          <b>Si los partidos están en un calendario de iCloud:</b>
        </p>
        <ol className="guide">
          <li><span>App <b>Calendario</b> → <b>Calendarios</b> (abajo) → ⓘ junto al calendario de los partidos.</span></li>
          <li><span>Activa <b>Calendario público</b> → <b>Compartir enlace</b> → <b>Copiar</b>.</span></li>
        </ol>
        <p className="muted small" style={{ marginTop: 10 }}>
          Público significa que quien tenga el enlace puede verlo (no aparece en ningún buscador). Mejor un calendario solo para el basket que el personal. En Google Calendar sirve la «dirección secreta en formato iCal».
        </p>
      </details>

      <input className="input" type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" placeholder="webcal://…" value={url} onChange={(e) => (setUrl(e.target.value), setEvents(null))} />
      <button className="btn ghost sm" style={{ width: '100%' }} disabled={busy || !looksLikeCalUrl(url)} onClick={test}>
        {busy ? 'Leyendo calendario…' : 'Probar enlace'}
      </button>
      {error && <div className="callout bad small">{error}</div>}

      {events && (
        <>
          <p className="small">
            {upcoming.length} evento{upcoming.length === 1 ? '' : 's'} en las próximas 10 semanas · <b style={{ color: 'var(--match)' }}>{matches.length} partido{matches.length === 1 ? '' : 's'}</b>
          </p>
          {matches.length > 0 && (
            <div className="cal-list">
              {matches.slice(0, 5).map((m) => (
                <MatchRow key={m.key} date={m.date} time={m.time} title={m.title} location={m.location} />
              ))}
            </div>
          )}
          {!matches.length && upcoming.length > 0 && (
            <div className="callout small">
              Ninguno parece un partido. Hay, por ejemplo: {upcoming.slice(0, 3).map((e) => `«${e.title}»`).join(', ')}. Cambia las palabras clave o marca que todos son partidos.
            </div>
          )}
          <YesNo label="Todos los eventos son partidos" value={all} onChange={setAll} />
          {!all && (
            <label className="field">
              <span>Es un partido si el título contiene</span>
              <input className="input" value={words} onChange={(e) => setWords(e.target.value)} />
            </label>
          )}
          <YesNo label="Partido del finde: solo del calendario" value={replaceWeekend} onChange={setReplaceWeekend} />
          <button
            className="btn"
            style={{ background: 'var(--match)', color: '#111' }}
            onClick={() => actions.connectCalendar({ url: normalizeCalUrl(url), words, all, replaceWeekend }, matches)}
          >
            Conectar calendario
          </button>
        </>
      )}
      <p className="muted tiny">El enlace se lee a través de un pequeño servidor propio de la app (Cloudflare) que solo reenvía el calendario; no guarda nada.</p>
    </div>
  )
}

function Connected({ c }: { c: CalendarLink }) {
  const st = useStore()
  const [busy, setBusy] = useState(false)
  const [words, setWords] = useState(c.words)
  const today = todayIso()
  const next = st.sessions.filter((s) => s.cal && s.date >= today && s.status === 'planned').slice(0, 4)

  const resync = async (patch?: Partial<CalendarLink>) => {
    if (patch) actions.patchCalendar(patch)
    setBusy(true)
    await syncCalendar(true)
    setBusy(false)
  }

  return (
    <div className="card stack">
      <p className="small muted">
        Sincronizado {ago(c.lastOk)}. Se actualiza solo al abrir la app.
      </p>
      {c.error && <div className="callout bad small">{c.error}</div>}
      {next.length ? (
        <div className="cal-list">
          {next.map((s) => (
            <MatchRow key={s.id} date={s.date} time={s.time} title={s.title} location={s.note} />
          ))}
        </div>
      ) : (
        <p className="small">No hay partidos en las próximas 10 semanas.</p>
      )}
      <button className="btn ghost sm" style={{ width: '100%' }} disabled={busy} onClick={() => resync()}>
        {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
      </button>

      <details className="hint">
        <summary>Opciones</summary>
        <div className="stack" style={{ marginTop: 12 }}>
          <YesNo label="Todos los eventos son partidos" value={c.all} onChange={(all) => resync({ all })} />
          {!c.all && (
            <label className="field">
              <span>Es un partido si el título contiene</span>
              <input className="input" value={words} onChange={(e) => setWords(e.target.value)} onBlur={() => words !== c.words && resync({ words })} />
            </label>
          )}
          <YesNo label="Partido del finde: solo del calendario" value={c.replaceWeekend} onChange={(replaceWeekend) => actions.patchCalendar({ replaceWeekend })} />
          <button
            className="btn line sm danger"
            onClick={() => {
              if (confirm('¿Desconectar el calendario? Se quitan los partidos futuros que venían de él.')) actions.disconnectCalendar()
            }}
          >
            Desconectar
          </button>
        </div>
      </details>
    </div>
  )
}
