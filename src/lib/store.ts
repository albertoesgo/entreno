import { useSyncExternalStore } from 'react'
import type { Profile, RunLog, Session, State } from './types'
import { sync, uid, weekSessions } from './engine'
import { todayIso, weekStart } from './dates'

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
}

const fresh = (): State => ({ v: 1, profile: { ...DEFAULT_PROFILE }, sessions: [], weeks: {}, weights: [], jumps: [], paces: [] })

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as State
      return { ...fresh(), ...s, profile: { ...DEFAULT_PROFILE, ...s.profile } }
    }
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

  checkin(fatigue: number, weightKg: number | null) {
    update((d, today) => {
      const meta = d.weeks[weekStart(today)]
      if (!meta) return
      meta.fatigue = fatigue
      meta.checkin = true
      if (fatigue >= 4 && !meta.reduced) {
        meta.reduced = true
        meta.changes.push({ date: today, text: 'Llegas cargado: esta semana una serie menos por ejercicio y carreras más cortas.' })
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

  setProfile(patch: Partial<Profile>) {
    update((d, today) => {
      if (patch.pace5k && patch.pace5k !== d.profile.pace5k) upsertMetric(d.paces, today, patch.pace5k)
      if (patch.weightKg && patch.weightKg !== d.profile.weightKg) upsertMetric(d.weights, today, patch.weightKg)
      d.profile = { ...d.profile, ...patch }
    })
  },

  exportJSON: () => JSON.stringify(state, null, 2),

  importJSON(text: string) {
    const s = JSON.parse(text) as State
    if (!s || s.v !== 1 || !Array.isArray(s.sessions)) throw new Error('Archivo no válido')
    commit({ ...fresh(), ...s, profile: { ...DEFAULT_PROFILE, ...s.profile } })
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
