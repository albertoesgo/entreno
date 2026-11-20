// Lector mínimo de calendarios iCalendar (.ics): lo justo para sacar partidos.
// Soporta eventos sueltos, de día completo, en UTC o con zona horaria, cancelados,
// y repeticiones diarias/semanales (con excepciones y ocurrencias movidas).

import { addDays, iso, weekday } from './dates'

export interface CalEvent {
  key: string // estable aunque el evento cambie de día
  date: string // YYYY-MM-DD (hora local del móvil)
  time?: string // HH:MM, salvo eventos de día completo
  title: string
  location?: string
}

type Prop = { value: string; params: Record<string, string> }
type Raw = Record<string, Prop[]>

const pad = (n: number) => String(n).padStart(2, '0')

function unescape(v: string): string {
  return v.replace(/\\([\\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c)).trim()
}

function parseLine(line: string): [string, Prop] | null {
  // NOMBRE;PARAM=valor;PARAM="va:lor":VALOR  → el primer ':' fuera de comillas separa el valor
  let quoted = false
  let cut = -1
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') quoted = !quoted
    else if (c === ':' && !quoted) {
      cut = i
      break
    }
  }
  if (cut < 0) return null
  const [name, ...ps] = line.slice(0, cut).split(';')
  const params: Record<string, string> = {}
  for (const p of ps) {
    const eq = p.indexOf('=')
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return [name.toUpperCase(), { value: line.slice(cut + 1), params }]
}

function events(text: string): Raw[] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const out: Raw[] = []
  let cur: Raw | null = null
  let depth = 0 // ignora subcomponentes (VALARM) dentro del evento
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {}
      depth = 0
      continue
    }
    if (!cur) continue
    if (line === 'END:VEVENT') {
      out.push(cur)
      cur = null
      continue
    }
    if (line.startsWith('BEGIN:')) depth++
    else if (line.startsWith('END:')) depth--
    else if (depth === 0) {
      const p = parseLine(line)
      if (p) (cur[p[0]] ??= []).push(p[1])
    }
  }
  return out
}

/** Desfase (ms) de una zona horaria IANA en un instante dado. */
function tzOffset(tz: string, utc: number): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
  const v: Record<string, number> = {}
  for (const p of f.formatToParts(new Date(utc))) if (p.type !== 'literal') v[p.type] = Number(p.value)
  return Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute, v.second) - utc
}

interface When {
  date: string
  time?: string
}

function parseWhen(p: Prop | undefined): When | null {
  if (!p) return null
  const m = p.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  if (!h || p.params.VALUE === 'DATE') return { date: `${y}-${mo}-${d}` }
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
  let at: Date
  if (z) at = new Date(wall)
  else if (p.params.TZID) {
    try {
      // Hora de pared en esa zona → instante real → hora local del móvil
      const guess = wall - tzOffset(p.params.TZID, wall)
      at = new Date(wall - tzOffset(p.params.TZID, guess))
    } catch {
      at = new Date(+y, +mo - 1, +d, +h, +mi, +s)
    }
  } else at = new Date(+y, +mo - 1, +d, +h, +mi, +s) // hora flotante
  return { date: iso(at), time: `${pad(at.getHours())}:${pad(at.getMinutes())}` }
}

const BYDAY: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 }

/** Fechas de un evento que se repite (solo diario y semanal; el resto, solo la primera). */
function occurrences(start: string, rule: string, to: string): string[] {
  const r: Record<string, string> = {}
  for (const part of rule.split(';')) {
    const [k, v] = part.split('=')
    if (k && v) r[k.toUpperCase()] = v
  }
  const interval = Math.max(1, Number(r.INTERVAL) || 1)
  const count = r.COUNT ? Number(r.COUNT) : Infinity
  const until = r.UNTIL ? `${r.UNTIL.slice(0, 4)}-${r.UNTIL.slice(4, 6)}-${r.UNTIL.slice(6, 8)}` : '9999-12-31'
  const end = until < to ? until : to
  const out: string[] = []
  if (r.FREQ === 'DAILY') {
    for (let d = start, n = 0; d <= end && n < count && n < 2000; d = addDays(d, interval), n++) out.push(d)
  } else if (r.FREQ === 'WEEKLY') {
    const days = r.BYDAY ? r.BYDAY.split(',').map((x) => BYDAY[x.slice(-2)]).filter((x) => x != null).sort() : [weekday(start)]
    const week0 = addDays(start, -weekday(start))
    let n = 0
    for (let w = week0, i = 0; w <= end && n < count && i < 600; w = addDays(w, 7 * interval), i++) {
      for (const d of days) {
        const date = addDays(w, d)
        if (date < start || date > end || n >= count) continue
        out.push(date)
        n++
      }
    }
  } else out.push(start)
  return out
}

/** Eventos entre `from` y `to` (incluidos), ordenados por fecha. */
export function parseICS(text: string, from: string, to: string): CalEvent[] {
  const raws = events(text)
  const get = (e: Raw, k: string) => e[k]?.[0]
  const cancelled = (e: Raw) => get(e, 'STATUS')?.value.toUpperCase() === 'CANCELLED'

  // Ocurrencias movidas o canceladas de una serie (RECURRENCE-ID)
  const overrides = new Map<string, Raw>()
  for (const e of raws) {
    const rid = parseWhen(get(e, 'RECURRENCE-ID'))
    const uid = get(e, 'UID')?.value
    if (rid && uid) overrides.set(`${uid}@${rid.date}`, e)
  }

  const out: CalEvent[] = []
  const push = (e: Raw, key: string, when: When) => {
    if (cancelled(e) || when.date < from || when.date > to) return
    out.push({
      key,
      date: when.date,
      time: when.time,
      title: unescape(get(e, 'SUMMARY')?.value ?? 'Evento'),
      location: get(e, 'LOCATION') ? unescape(get(e, 'LOCATION')!.value) || undefined : undefined,
    })
  }

  for (const e of raws) {
    if (get(e, 'RECURRENCE-ID')) continue
    const when = parseWhen(get(e, 'DTSTART'))
    if (!when) continue
    const uid = get(e, 'UID')?.value ?? `${when.date}-${get(e, 'SUMMARY')?.value ?? ''}`
    const rule = get(e, 'RRULE')?.value
    if (!rule) {
      push(e, uid, when)
      continue
    }
    const ex = new Set((e.EXDATE ?? []).flatMap((p) => p.value.split(',').map((v) => parseWhen({ value: v, params: p.params })?.date)))
    for (const date of occurrences(when.date, rule, to)) {
      if (ex.has(date)) continue
      const key = `${uid}@${date}`
      const ov = overrides.get(key)
      if (ov) {
        const w = parseWhen(get(ov, 'DTSTART'))
        if (w) push(ov, key, w)
      } else push(e, key, { date, time: when.time })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
}

export const DEFAULT_WORDS = 'partido, vs, jornada, liga, copa, amistoso, torneo'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** ¿Este evento es un partido según tus palabras clave? */
export function isMatch(e: CalEvent, words: string, all: boolean): boolean {
  if (all) return true
  const title = norm(e.title)
  return words
    .split(',')
    .map((w) => norm(w.trim()))
    .filter(Boolean)
    .some((w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(title))
}
