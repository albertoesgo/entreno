import type { GymTemplate, Kind, Profile, Session, State, Template, WeekMeta } from './types'
import { addDays, dayName, diffDays, weekStart } from './dates'
import type { CalEvent } from './ics'
import { DEFAULT_TEMPLATES, buildGym, buildRun, gymMinutes, rebuildCustom } from './program'

/**
 * Motor de planificación.
 *
 * Cada vez que abres la app (o cambia algo) se llama a `sync`:
 *  1. Cierra semanas pasadas y decide el bloque de la nueva (avanza si cumpliste ≥60 %).
 *  2. Lo pasado sin hacer queda como "no hecho"; el basket sin marcar se asume hecho.
 *  3. Retira lo planificado a futuro (salvo lo que has movido a mano) y lo vuelve a colocar
 *     junto con lo que no hiciste, por prioridad, en el día con menor coste de fatiga.
 *  4. Recalcula pesos y ritmos objetivo de lo que queda por hacer.
 */

export const PRIORITY: Record<string, number> = { A: 1, quality: 2, B: 3, C: 4, easy: 5, long: 6 }

export const uid = () => Math.random().toString(36).slice(2, 10)

const ACTIVE = (s: Session) => s.status === 'planned' || s.status === 'done'
export const hasLogs = (s: Session) => !!s.exercises?.some((e) => e.log.some((l) => l.done)) || !!s.runLog?.timeSec
const isFlex = (s: Session) => (s.kind === 'gym' || s.kind === 'run') && !s.manual

export function weekSessions(state: State, start: string): Session[] {
  const end = addDays(start, 6)
  return state.sessions.filter((s) => s.date >= start && s.date <= end)
}

export function flexNeeded(p: Profile): { kind: Kind; template: Template }[] {
  const gym: GymTemplate[] = p.gymPerWeek >= 3 ? ['A', 'B', 'C'] : ['A', 'B']
  const runs: Template[] = p.runsPerWeek === 1 ? ['quality'] : p.runsPerWeek === 2 ? ['quality', 'easy'] : ['quality', 'easy', 'long']
  return [...gym.map((t) => ({ kind: 'gym' as Kind, template: t })), ...runs.map((t) => ({ kind: 'run' as Kind, template: t }))]
}

export function flexTitle(t: Template, state?: Pick<State, 'templates'>): string {
  if (t === 'A' || t === 'B' || t === 'C') return (state?.templates ?? DEFAULT_TEMPLATES)[t].title
  return { quality: 'Calidad', easy: 'Rodaje suave', long: 'Rodaje largo', free: 'Carrera libre' }[t]
}

export function compliance(list: Session[]): number | undefined {
  const flex = list.filter((s) => isFlex(s) && s.status !== 'skipped')
  const skipped = list.filter((s) => isFlex(s) && s.status === 'skipped').length
  const total = flex.length + skipped
  if (!total) return undefined
  return flex.filter((s) => s.status === 'done').length / total
}

function note(meta: WeekMeta, today: string, text: string) {
  if (meta.changes.some((c) => c.text === text)) return
  meta.changes.push({ date: today, text })
  if (meta.changes.length > 12) meta.changes.shift()
}

function settlePast(s: Session, today: string) {
  if (s.status !== 'planned' || s.date >= today) return
  if (s.fixed) {
    s.status = 'done'
    s.assumed = true
  } else s.status = hasLogs(s) ? 'done' : 'missed'
}

function closeWeek(state: State, start: string, today: string) {
  const meta = state.weeks[start]
  if (!meta || addDays(start, 6) >= today) return
  const list = weekSessions(state, start)
  list.forEach((s) => settlePast(s, today))
  meta.compliance = compliance(list) ?? 1
  meta.closed = true
}

function ensureMeta(state: State, start: string, today: string): WeekMeta {
  if (state.weeks[start]) return state.weeks[start]
  const prevKeys = Object.keys(state.weeks).filter((k) => k < start).sort()
  let meta: WeekMeta
  if (!prevKeys.length) {
    meta = { start, block: 1, cycle: 0, changes: [] }
  } else {
    const lastKey = prevKeys[prevKeys.length - 1]
    closeWeek(state, lastKey, today)
    const last = state.weeks[lastKey]
    const gapWeeks = diffDays(lastKey, start) / 7
    if (gapWeeks >= 2) {
      meta = { start, block: 1, cycle: last.cycle, reduced: true, changes: [] }
      note(meta, today, 'Vuelves tras un parón: semana algo más suave para retomar.')
    } else if (last.block === 4) {
      meta = { start, block: 1, cycle: last.cycle + 1, changes: [] }
      note(meta, today, `Nuevo ciclo (${last.cycle + 2}): pesos y ritmos suben un escalón.`)
    } else if ((last.compliance ?? 0) >= 0.6) {
      meta = { start, block: (last.block + 1) as WeekMeta['block'], cycle: last.cycle, changes: [] }
    } else {
      meta = { start, block: last.block, cycle: last.cycle, changes: [] }
      note(meta, today, `La semana pasada hiciste el ${Math.round((last.compliance ?? 0) * 100)} %: repetimos bloque antes de subir.`)
    }
    // Autorregulación: lo duras que te resultaron las sesiones de la semana pasada
    if (gapWeeks < 2) {
      const rated = weekSessions(state, lastKey).filter((s) => isFlex(s) && s.status === 'done' && s.rpe)
      const avg = rated.length ? rated.reduce((a, s) => a + s.rpe!, 0) / rated.length : 0
      if (rated.length >= 2 && avg >= 8.7 && meta.block !== 4) {
        meta.reduced = true
        note(meta, today, `La semana pasada fue muy exigente (RPE medio ${avg.toFixed(1).replace('.', ',')}): esta semana una serie menos y carreras más cortas.`)
      } else if (rated.length >= 2 && avg <= 6.5 && (last.compliance ?? 0) >= 0.9 && meta.block !== 4) {
        meta.boost = true
        note(meta, today, `Vas sobrado (RPE medio ${avg.toFixed(1).replace('.', ',')}): una serie más en los básicos y algo más de carrera.`)
      }
    }
  }
  state.weeks[start] = meta
  return meta
}

// ── Coste de colocar una sesión en un día ───────────────────────────────────

type DayMap = Record<number, Session[]>

function flags(list: Session[] = []) {
  const a = list.filter(ACTIVE)
  return {
    basket: a.some((s) => s.kind === 'basket'),
    match: a.some((s) => s.kind === 'match'),
    lower: a.some((s) => s.template === 'A'),
    upper: a.some((s) => s.template === 'B' || s.template === 'C'),
    gym: a.some((s) => s.kind === 'gym'),
    run: a.some((s) => s.kind === 'run'),
    quality: a.some((s) => s.template === 'quality'),
    flex: a.filter((s) => s.kind === 'gym' || s.kind === 'run').length,
    count: a.length,
  }
}

export function cost(t: Template, d: number, map: DayMap): number {
  const cur = flags(map[d])
  const prev = flags(map[d - 1])
  const next = flags(map[d + 1])
  let c = cur.count * 6
  if (cur.flex >= 2) c += 100

  // Mantener al menos un día libre en la semana
  if (cur.count === 0) {
    let empty = 0
    for (let i = 0; i < 7; i++) if (flags(map[i]).count === 0) empty++
    if (empty <= 1) c += 25
  }

  switch (t) {
    case 'A': // pierna pesada + pliometría
      if (cur.basket || cur.match) c += 100
      if (cur.gym || cur.quality) c += 100
      if (cur.run) c += 30
      if (next.match) c += 80
      else if (next.basket) c += 30
      if (prev.match) c += 40
      if (prev.quality || next.quality) c += 25
      break
    case 'B':
    case 'C':
      if (cur.gym) c += 100
      if (cur.match) c += 30
      else if (cur.basket) c += 12
      if (cur.quality) c += 15
      if (prev.upper || next.upper) c += 10
      break
    case 'quality':
      if (cur.run || cur.lower || cur.match) c += 100
      if (cur.basket) c += 70
      if (cur.upper) c += 15
      if (next.match) c += 45
      else if (next.basket) c += 15
      if (next.lower) c += 20
      if (prev.match) c += 30
      else if (prev.basket) c += 10
      if (prev.lower) c += 30
      break
    default: // rodajes
      if (cur.run) c += 100
      if (cur.match) c += 60
      else if (cur.basket) c += 35
      if (cur.lower) c += 40
      if (cur.upper) c += 8
      if (next.match) c += 20
      if (t === 'long' && (prev.quality || next.quality)) c += 10
  }
  return c
}

function buildMap(state: State, start: string): DayMap {
  const map: DayMap = {}
  for (let d = -1; d <= 7; d++) map[d] = []
  for (const s of state.sessions) {
    const d = diffDays(start, s.date)
    if (d >= -1 && d <= 7) map[d].push(s)
  }
  if (!map[7].length && state.profile.basketDays.includes(0)) {
    map[7].push({ id: '_next', date: addDays(start, 7), kind: 'basket', title: '', status: 'planned', minutes: 90 })
  }
  return map
}

// ── Sincronización ──────────────────────────────────────────────────────────

export function sync(state: State, today: string): void {
  const p = state.profile
  const start = weekStart(today)
  for (const k of Object.keys(state.weeks)) if (k < start && !state.weeks[k].closed) closeWeek(state, k, today)
  const meta = ensureMeta(state, start, today)

  const week = weekSessions(state, start)
  week.forEach((s) => settlePast(s, today))

  // 1. Retirar lo planificado a futuro que el planificador puede recolocar
  const removable = new Set(week.filter((s) => s.status === 'planned' && s.date >= today && !s.pinned && !s.manual && !hasLogs(s)))
  state.sessions = state.sessions.filter((s) => !removable.has(s))
  const hints = new Map<string, Session>()
  for (const s of removable) hints.set(s.fixed ? `fx:${s.kind}:${s.date}` : String(s.template), s)
  const kept = week.filter((s) => !removable.has(s))

  // 2. Basket fijo desde el perfil
  for (let d = 0; d < 7; d++) {
    const date = addDays(start, d)
    if (date < today) continue
    const want: Kind[] = []
    if (p.basketDays.includes(d)) want.push('basket')
    if (p.weekendGame && p.gameDay === d && !calendarOwnsWeekend(state, today)) want.push('match')
    for (const k of want) {
      if (kept.some((s) => s.auto && s.kind === k && s.date === date)) continue
      // Ya hay un partido ese día (del calendario o añadido a mano): ni otro partido ni entreno
      if (kept.some((s) => s.kind === 'match' && s.date === date && s.status !== 'skipped')) continue
      const h = hints.get(`fx:${k}:${date}`)
      state.sessions.push({
        id: h?.id ?? uid(),
        date,
        kind: k,
        title: k === 'basket' ? 'Entreno basket' : 'Partido',
        status: 'planned',
        minutes: 90,
        fixed: true,
        auto: true,
      })
    }
  }

  // 3. Colocar gimnasio y carreras (incluye recuperar lo no hecho)
  type Item = { kind: Kind; template: Template; existing?: Session; hint?: Session }
  const items: Item[] = []
  for (const n of flexNeeded(p)) {
    const same = kept.filter((s) => s.template === n.template && !s.manual)
    if (same.some((s) => s.status !== 'missed')) continue
    const missed = same.find((s) => s.status === 'missed')
    items.push(missed ? { ...n, existing: missed } : { ...n, hint: hints.get(n.template) })
  }
  items.sort((a, b) => PRIORITY[a.template] - PRIORITY[b.template])

  for (const it of items) {
    const map = buildMap(state, start)
    let best = -1
    let bestCost = Infinity
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, d)
      if (date < today || it.existing?.avoid === date) continue
      const blocked = p.blockedDays?.includes(d) ? 100 : 0
      const c = cost(it.template, d, map) + blocked + (it.hint && it.hint.date !== date ? 6 : 0)
      if (c < bestCost) {
        bestCost = c
        best = d
      }
    }
    const title = it.existing?.title ?? it.hint?.title ?? flexTitle(it.template, state)
    if (best < 0 || bestCost >= 100) {
      if (it.hint) note(meta, today, `${title} sale de esta semana: no hay hueco sin sobrecargar.`)
      else if (it.existing && !it.existing.noRoomNoted) {
        note(meta, today, `No queda hueco para recuperar ${title.toLowerCase()} esta semana.`)
        it.existing.noRoomNoted = true
      }
      continue
    }
    const date = addDays(start, best)
    if (it.existing) {
      const from = it.existing.date
      Object.assign(it.existing, { date, status: 'planned', movedFrom: from, pinned: false })
      note(meta, today, it.existing.avoid ? `${title} → ${dayName(date)}.` : `${title} no se hizo el ${dayName(from)} → pasa al ${dayName(date)}.`)
    } else {
      if (it.hint && it.hint.date !== date) note(meta, today, `${title}: ${dayName(it.hint.date)} → ${dayName(date)} para cuadrar la carga.`)
      state.sessions.push({
        id: it.hint?.id ?? uid(),
        date,
        kind: it.kind,
        template: it.template,
        title: flexTitle(it.template, state),
        status: 'planned',
        minutes: 60,
        ...(it.hint?.movedFrom ? { movedFrom: it.hint.movedFrom } : {}),
        ...(it.hint?.customized ? { customized: true, exercises: it.hint.exercises } : {}),
      })
    }
  }

  refreshTargets(state, start, meta)
  state.sessions.sort((a, b) => a.date.localeCompare(b.date) || order(a) - order(b))
}

const order = (s: Session) => (s.kind === 'gym' ? 0 : s.kind === 'run' ? 1 : s.kind === 'basket' ? 2 : 3)

/** Recalcula objetivos de lo que aún no has empezado. */
export function refreshTargets(state: State, start: string, meta: WeekMeta) {
  const p = state.profile
  const wk = weekSessions(state, start)
  const basketLoad = wk.filter((s) => (s.kind === 'basket' || s.kind === 'match') && ACTIVE(s)).length
  for (const s of wk) {
    if (s.status !== 'planned' || hasLogs(s) || !s.template) continue
    if (s.kind === 'gym' && (s.template === 'A' || s.template === 'B' || s.template === 'C')) {
      const ctx = {
        date: s.date,
        deload: meta.block === 4,
        reduced: !!meta.reduced,
        boost: !!meta.boost,
        plyoCut: basketLoad >= 4,
        cycle: meta.cycle,
        sessionId: s.id,
      }
      s.exercises = s.customized && s.exercises ? rebuildCustom(state, s.exercises, ctx) : buildGym(state, s.template, ctx, p.gymPerWeek)
      s.minutes = gymMinutes(s.exercises)
      s.title = flexTitle(s.template, state)
    }
    if (s.kind === 'run' && (s.template === 'quality' || s.template === 'easy' || s.template === 'long')) {
      const { minutes, ...plan } = buildRun(p, s.template, meta)
      s.run = plan
      s.title = plan.title
      s.minutes = minutes
    }
  }
  meta.compliance = compliance(wk)
}

// ── Calendario conectado ────────────────────────────────────────────────────

/** El partido del finde sale del calendario (si se sincronizó bien hace poco). */
export function calendarOwnsWeekend(state: State, today: string): boolean {
  const c = state.calendar
  return !!c?.replaceWeekend && !!c.lastOk && diffDays(c.lastOk.slice(0, 10), today) <= 14
}

const SUSTITUIDO = 'Sustituido por partido'

/**
 * Aplica los partidos del calendario: añade los nuevos, mueve los que cambian de día
 * y quita los que desaparecen (solo si aún no se han jugado). Después, `sync` recoloca
 * gimnasio y carreras alrededor.
 */
export function reconcileCalendar(state: State, matches: CalEvent[], today: string, silent = false): void {
  const start = weekStart(today)
  const byKey = new Map(matches.map((m) => [m.key, m]))
  const label = (date: string, time?: string) => `${dayName(date)} ${Number(date.slice(8))}${time ? ` a las ${time}` : ''}`
  const say = (date: string, text: string) => {
    const meta = state.weeks[weekStart(date)] ?? state.weeks[start]
    if (meta && !silent) note(meta, today, text)
  }

  state.sessions = state.sessions.filter((s) => {
    if (!s.cal || byKey.has(s.cal) || s.status !== 'planned' || s.date < today) return true
    say(s.date, `${s.title} (${label(s.date)}) ya no está en tu calendario: quitado.`)
    return false
  })

  for (const m of matches) {
    if (m.date < today) continue
    const s = state.sessions.find((x) => x.cal === m.key)
    if (s) {
      if (s.status !== 'planned') continue
      if (s.date !== m.date) say(m.date, `${m.title}: ${label(s.date)} → ${label(m.date, m.time)} según tu calendario.`)
      Object.assign(s, { date: m.date, title: m.title, time: m.time, note: m.location })
    } else {
      state.sessions.push({ id: uid(), date: m.date, kind: 'match', title: m.title, status: 'planned', minutes: 90, fixed: true, manual: true, cal: m.key, time: m.time, note: m.location })
      say(m.date, `Partido añadido desde tu calendario: ${label(m.date, m.time)}.`)
    }
  }

  // El entreno de basket de un día con partido se sustituye (y vuelve si el partido se va)
  const matchDays = new Set(state.sessions.filter((s) => s.kind === 'match' && s.status !== 'skipped').map((s) => s.date))
  for (const s of state.sessions) {
    if (s.kind !== 'basket' || !s.auto || s.date < today) continue
    if (s.status === 'planned' && matchDays.has(s.date)) Object.assign(s, { status: 'skipped', note: SUSTITUIDO })
    else if (s.status === 'skipped' && s.note === SUSTITUIDO && !matchDays.has(s.date)) {
      s.status = 'planned'
      delete s.note
    }
  }
}
