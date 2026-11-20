import { useSyncExternalStore } from 'react'
import type { CalendarLink, ChatMsg, ExerciseDef, GymTemplate, GymTemplateDef, Profile, RunLog, Session, State, TemplateItem } from './types'
import { reconcileCalendar, sync, uid, weekSessions } from './engine'
import type { CalEvent } from './ics'
import { todayIso, weekStart } from './dates'
import { buildBlock, exDef, freshTemplates, gymMinutes } from './program'

const KEY = 'entreno.v1'

/** Por defecto: dentro de ~20 semanas */
function defaultGoal() {
  const d = new Date()
  d.setDate(d.getDate() + 140)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export const DEFAULT_PROFILE: Profile = {
  onboarded: false,
  age: 25,
  heightCm: 180,
  weightKg: 80,
  goalWeightKg: 76,
  goalDate: defaultGoal(),
  startDate: todayIso(),
  pace5k: 380,
  basketDays: [1, 3],
  weekendGame: true,
  gameDay: 5,
  gymPerWeek: 3,
  runsPerWeek: 2,
  gym: null,
  gymDetect: true,
  blockedDays: [],
}

const fresh = (): State => ({
  v: 1,
  profile: { ...DEFAULT_PROFILE },
  templates: freshTemplates(),
  custom: {},
  chat: [],
  sessions: [],
  weeks: {},
  weights: [],
  jumps: [],
  paces: [],
})

/** Completa estados guardados con versiones anteriores de la app. */
function hydrate(s: Partial<State>): State {
  const base = fresh()
  return {
    ...base,
    ...s,
    profile: { ...DEFAULT_PROFILE, ...s.profile },
    templates: { ...base.templates, ...s.templates },
    custom: s.custom ?? {},
    chat: s.chat ?? [],
  } as State
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return hydrate(JSON.parse(raw))
  } catch {
    /* sin almacenamiento: empezamos de cero */
  }
  return fresh()
}

let state: State = load()
const subs = new Set<() => void>()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignorar */
  }
  subs.forEach((f) => f())
}

function update(fn: (d: State, today: string) => void, resync = true) {
  const d = structuredClone(state)
  const today = todayIso()
  fn(d, today)
  if (resync && d.profile.onboarded) sync(d, today)
  commit(d)
}

export const getState = () => state

export const useStore = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => {
        subs.delete(cb)
      }
    },
    () => state,
  )

const find = (d: State, id: string) => d.sessions.find((s) => s.id === id)

function upsertMetric(list: { date: string; value: number }[], date: string, value: number) {
  const m = list.find((x) => x.date === date)
  if (m) m.value = value
  else list.push({ date, value })
  list.sort((a, b) => a.date.localeCompare(b.date))
}

function blockCtx(d: State, s: Session) {
  const meta = d.weeks[weekStart(s.date)]
  return {
    date: s.date,
    deload: meta?.block === 4,
    reduced: !!meta?.reduced,
    boost: !!meta?.boost,
    plyoCut: false,
    cycle: meta?.cycle ?? 0,
    sessionId: s.id,
  }
}

function noteChange(d: State, today: string, text: string) {
  const meta = d.weeks[weekStart(today)]
  if (meta && !meta.changes.some((c) => c.text === text)) meta.changes.push({ date: today, text })
}

export type Scope = 'session' | 'always'

export const actions = {
  sync: () => update(() => {}),

  onboard(p: Partial<Profile>, ranToday?: { km: number; timeSec: number }) {
    update((d, today) => {
      d.profile = { ...d.profile, ...p, onboarded: true, startDate: today }
      upsertMetric(d.weights, today, d.profile.weightKg)
      upsertMetric(d.paces, today, d.profile.pace5k)
      if (ranToday) {
        d.sessions.push({
          id: uid(),
          date: today,
          kind: 'run',
          template: 'easy',
          title: 'Rodaje',
          status: 'done',
          minutes: Math.round(ranToday.timeSec / 60),
          run: { type: 'easy', title: 'Rodaje', detail: '', targetPace: d.profile.pace5k + 75 },
          runLog: { distanceKm: ranToday.km, timeSec: ranToday.timeSec },
        })
      }
    })
  },

  /** Cambios mientras registras (series, etc.). No replanifica. */
  patch(id: string, fn: (s: Session) => void) {
    update((d) => {
      const s = find(d, id)
      if (s) fn(s)
    }, false)
  },

  finish(id: string, data: { rpe?: number; minutes?: number; runLog?: RunLog }) {
    update((d, today) => {
      const s = find(d, id)
      if (!s) return
      s.status = 'done'
      if (data.rpe) s.rpe = data.rpe
      if (data.minutes) s.minutes = data.minutes
      if (data.runLog) s.runLog = data.runLog
      const km = s.runLog?.distanceKm
      const t = s.runLog?.timeSec
      if (s.kind === 'run' && km && t) {
        s.minutes = Math.round(t / 60)
        const pace = t / km
        const old = d.profile.pace5k
        let next = old
        if (s.run?.type === 'test' && km >= 4.5) next = pace < old ? pace : (pace + old) / 2
        else if (km >= 4.5 && pace < old) next = pace
        if (next !== old) {
          d.profile.pace5k = Math.round(next)
          upsertMetric(d.paces, s.date <= today ? s.date : today, d.profile.pace5k)
        }
      }
    })
  },

  reopen(id: string) {
    update((d) => {
      const s = find(d, id)
      if (s) s.status = 'planned'
    })
  },

  move(id: string, date: string) {
    update((d) => {
      const s = find(d, id)
      if (!s) return
      s.date = date
      s.pinned = true
      if (s.status === 'missed') s.status = 'planned'
      delete s.avoid
    })
  },

  notToday(id: string) {
    update((d, today) => {
      const s = find(d, id)
      if (!s) return
      if (s.fixed) {
        s.status = 'skipped'
        return
      }
      s.status = 'missed'
      s.avoid = today
      s.pinned = false
      delete s.noRoomNoted
    })
  },

  skip(id: string) {
    update((d) => {
      const s = find(d, id)
      if (s) s.status = 'skipped'
    })
  },

  restore(id: string) {
    update((d, today) => {
      const s = find(d, id)
      if (!s) return
      if (s.fixed || s.manual) s.status = s.date < today ? 'done' : 'planned'
      else {
        s.status = 'missed'
        delete s.noRoomNoted
        delete s.avoid
      }
    })
  },

  remove(id: string) {
    update((d) => {
      d.sessions = d.sessions.filter((s) => s.id !== id)
    })
  },

  add(kind: 'match' | 'basket' | 'run', date: string): string {
    const id = uid()
    update((d) => {
      if (kind === 'match') {
        for (const s of d.sessions) {
          if (s.date === date && s.kind === 'basket' && s.auto && s.status === 'planned') {
            s.status = 'skipped'
            s.note = 'Sustituido por partido'
          }
        }
      }
      d.sessions.push({
        id,
        date,
        kind,
        title: kind === 'match' ? 'Partido' : kind === 'basket' ? 'Entreno basket' : 'Carrera libre',
        status: 'planned',
        minutes: kind === 'run' ? 30 : 90,
        manual: true,
        ...(kind === 'run'
          ? { template: 'free' as const, run: { type: 'free' as const, title: 'Carrera libre', detail: 'Registra distancia y tiempo.', targetPace: 0 } }
          : { fixed: true }),
      })
    })
    return id
  },

  // ── Edición de ejercicios ────────────────────────────────────────────────

  /** Cambia un ejercicio de una sesión. Con scope 'always' también en la rutina. */
  swapExercise(sessionId: string, index: number, newId: string, scope: Scope) {
    update((d, today) => {
      const s = find(d, sessionId)
      const b = s?.exercises?.[index]
      if (!s || !b) return
      const oldId = b.id
      s.exercises![index] = buildBlock(d, { id: newId, sets: b.baseSets ?? b.sets }, blockCtx(d, s), index)
      s.customized = true
      s.minutes = gymMinutes(s.exercises!)
      if (scope === 'always' && s.template && s.template in d.templates) {
        const t = d.templates[s.template as GymTemplate]
        t.items = t.items.map((it) => (it.id === oldId ? { id: newId, sets: it.sets } : it))
        noteChange(d, today, `${t.title}: ${exDef(d, oldId).name} → ${exDef(d, newId).name} a partir de ahora.`)
      }
    })
  },

  addExercise(sessionId: string, id: string, sets: number, scope: Scope) {
    update((d, today) => {
      const s = find(d, sessionId)
      if (!s) return
      s.exercises = s.exercises ?? []
      s.exercises.push(buildBlock(d, { id, sets }, blockCtx(d, s), s.exercises.length))
      s.customized = true
      s.minutes = gymMinutes(s.exercises)
      if (scope === 'always' && s.template && s.template in d.templates) {
        const t = d.templates[s.template as GymTemplate]
        t.items.push({ id, sets })
        noteChange(d, today, `${t.title}: añadido ${exDef(d, id).name}.`)
      }
    })
  },

  removeExercise(sessionId: string, index: number, scope: Scope) {
    update((d, today) => {
      const s = find(d, sessionId)
      const b = s?.exercises?.[index]
      if (!s || !b) return
      s.exercises!.splice(index, 1)
      s.customized = true
      s.minutes = gymMinutes(s.exercises!)
      if (scope === 'always' && s.template && s.template in d.templates) {
        const t = d.templates[s.template as GymTemplate]
        t.items = t.items.filter((it) => it.id !== b.id)
        noteChange(d, today, `${t.title}: quitado ${exDef(d, b.id).name}.`)
      }
    })
  },

  /** Añade o quita una serie solo en esta sesión. */
  changeSets(sessionId: string, index: number, delta: number) {
    update((d) => {
      const s = find(d, sessionId)
      const b = s?.exercises?.[index]
      if (!s || !b) return
      if (delta > 0 && b.sets < 8) {
        const last = b.log[b.log.length - 1]
        b.log.push({ kg: last?.kg ?? b.targetKg, reps: b.targetReps, done: false })
        b.sets++
      }
      if (delta < 0 && b.sets > 1 && !b.log[b.log.length - 1].done) {
        b.log.pop()
        b.sets--
      }
      b.baseSets = b.sets
      s.customized = true
      s.minutes = gymMinutes(s.exercises!)
    }, false)
  },

  // ── Rutinas ──────────────────────────────────────────────────────────────

  setTemplate(t: GymTemplate, def: GymTemplateDef) {
    update((d, today) => {
      d.templates[t] = structuredClone(def)
      // las sesiones futuras sin empezar vuelven a seguir la rutina
      for (const s of d.sessions) if (s.template === t && s.status === 'planned' && s.date >= today && !s.exercises?.some((e) => e.log.some((l) => l.done))) delete s.customized
      noteChange(d, today, `Rutina «${def.title}» actualizada: el plan recalcula pesos y series.`)
    })
  },

  resetTemplate(t: GymTemplate) {
    update((d) => {
      d.templates[t] = freshTemplates()[t]
    })
  },

  createExercise(def: Omit<ExerciseDef, 'id' | 'custom'>): string {
    const id = `c_${uid()}`
    update((d) => {
      d.custom[id] = { ...def, id, custom: true }
    }, false)
    return id
  },

  /** Edita un ejercicio propio (nombre, demostración, vídeo…). */
  updateExercise(id: string, patch: Partial<Omit<ExerciseDef, 'id' | 'custom'>>) {
    update((d) => {
      if (d.custom[id]) Object.assign(d.custom[id], patch)
    }, false)
  },

  deleteExercise(id: string) {
    update((d) => {
      delete d.custom[id]
      for (const t of Object.values(d.templates)) t.items = t.items.filter((i: TemplateItem) => i.id !== id)
    })
  },

  /** Modo de la semana actual: normal, suave o más carga. */
  setWeekMode(mode: 'normal' | 'reduced' | 'boost') {
    update((d, today) => {
      const meta = d.weeks[weekStart(today)]
      if (!meta) return
      meta.reduced = mode === 'reduced'
      meta.boost = mode === 'boost'
      noteChange(
        d,
        today,
        mode === 'reduced'
          ? 'Semana en modo suave: una serie menos y carreras más cortas.'
          : mode === 'boost'
            ? 'Semana con más carga: una serie más en los básicos.'
            : 'Semana en modo normal.',
      )
    })
  },

  checkin(fatigue: number, weightKg: number | null) {
    update((d, today) => {
      const meta = d.weeks[weekStart(today)]
      if (!meta) return
      meta.fatigue = fatigue
      meta.checkin = true
      if (fatigue >= 4 && !meta.reduced) {
        meta.reduced = true
        meta.boost = false
        meta.changes.push({ date: today, text: 'Llegas cargado: esta semana una serie menos por ejercicio y carreras más cortas.' })
      }
      if (fatigue === 1 && !meta.reduced && !meta.boost && meta.block !== 4) {
        meta.boost = true
        meta.changes.push({ date: today, text: 'Llegas fresco: una serie más en los básicos esta semana.' })
      }
      if (weightKg) {
        upsertMetric(d.weights, today, weightKg)
        d.profile.weightKg = weightKg
      }
    })
  },

  logWeight(value: number) {
    update((d, today) => {
      upsertMetric(d.weights, today, value)
      d.profile.weightKg = value
    }, false)
  },

  logJump(value: number) {
    update((d, today) => upsertMetric(d.jumps, today, value), false)
  },

  // ── Calendario de partidos ───────────────────────────────────────────────
  connectCalendar(link: Omit<CalendarLink, 'lastSync' | 'lastOk' | 'error'>, matches: CalEvent[]) {
    update((d, today) => {
      d.calendar = { ...link, lastSync: new Date().toISOString(), lastOk: new Date().toISOString() }
      reconcileCalendar(d, matches, today)
    })
  },

  applyCalendar(matches: CalEvent[]) {
    update((d, today) => {
      if (!d.calendar) return
      reconcileCalendar(d, matches, today)
      d.calendar.lastSync = d.calendar.lastOk = new Date().toISOString()
      delete d.calendar.error
    })
  },

  calendarError(error: string) {
    update((d) => {
      if (!d.calendar) return
      d.calendar.lastSync = new Date().toISOString()
      d.calendar.error = error
    }, false)
  },

  patchCalendar(patch: Partial<CalendarLink>) {
    update((d) => {
      if (d.calendar) Object.assign(d.calendar, patch)
    })
  },

  /** Desconecta: quita los partidos futuros que venían del calendario. */
  disconnectCalendar() {
    update((d, today) => {
      reconcileCalendar(d, [], today, true)
      delete d.calendar
    })
  },

  setProfile(patch: Partial<Profile>) {
    update((d, today) => {
      if (patch.pace5k && patch.pace5k !== d.profile.pace5k) upsertMetric(d.paces, today, patch.pace5k)
      if (patch.weightKg && patch.weightKg !== d.profile.weightKg) upsertMetric(d.weights, today, patch.weightKg)
      d.profile = { ...d.profile, ...patch }
    })
  },

  // ── Chat del coach ───────────────────────────────────────────────────────

  pushChat(msg: ChatMsg) {
    update((d) => {
      d.chat.push(msg)
      if (d.chat.length > 60) d.chat.splice(0, d.chat.length - 60)
    }, false)
  },

  clearChat() {
    update((d) => {
      d.chat = []
    }, false)
  },

  exportJSON: () => JSON.stringify(state, null, 2),

  importJSON(text: string) {
    const s = JSON.parse(text) as State
    if (!s || s.v !== 1 || !Array.isArray(s.sessions)) throw new Error('Archivo no válido')
    commit(hydrate(s))
    update(() => {})
  },

  reset() {
    commit(fresh())
  },
}

export const currentWeek = (s: State, today = todayIso()) => {
  const start = weekStart(today)
  return { start, meta: s.weeks[start], sessions: weekSessions(s, start) }
}

/** Sesión de gym a abrir al detectar que estás en el gimnasio. */
export function gymSessionFor(s: State, today = todayIso()) {
  const pending = (x: Session) => x.kind === 'gym' && x.status === 'planned'
  const todays = s.sessions.find((x) => x.date === today && pending(x))
  if (todays) return { session: todays, isToday: true }
  const end = weekSessions(s, weekStart(today)).at(-1)?.date ?? today
  const next = s.sessions.find((x) => x.date > today && x.date <= end && pending(x))
  return next ? { session: next, isToday: false } : null
}
