import { describe, expect, it } from 'vitest'
import { reconcileCalendar, sync, weekSessions } from './engine'
import { EXERCISES, freshTemplates, nextTarget } from './program'
import { addDays, weekday } from './dates'
import type { Session, State } from './types'

const MON = '2026-11-16'

function fresh(): State {
  return {
    v: 1,
    profile: {
      onboarded: true, age: 25, heightCm: 180, weightKg: 80, goalWeightKg: 76, goalDate: '2027-04-01', startDate: MON,
      pace5k: 380, basketDays: [1, 3], weekendGame: true, gameDay: 5, gymPerWeek: 3, runsPerWeek: 2, gym: null, gymDetect: false, blockedDays: [],
    },
    templates: freshTemplates(), custom: {}, chat: [],
    sessions: [], weeks: {}, weights: [], jumps: [], paces: [],
  }
}

const byTpl = (s: State, t: string) => s.sessions.find((x) => x.template === t && x.status === 'planned')!
const day = (x: Session) => weekday(x.date)
const fixedDays = (s: State) => new Set(s.sessions.filter((x) => x.kind === 'match' && x.status === 'planned').map(day))

function sane(s: State) {
  const wk = weekSessions(s, MON).filter((x) => x.status === 'planned' || x.status === 'done')
  for (let d = 0; d < 7; d++) {
    const list = wk.filter((x) => day(x) === d)
    expect(list.filter((x) => x.kind === 'gym').length).toBeLessThanOrEqual(1)
    expect(list.filter((x) => x.kind === 'run').length).toBeLessThanOrEqual(1)
  }
  const a = wk.find((x) => x.template === 'A')
  if (a) {
    const d = day(a)
    expect(wk.some((x) => (x.kind === 'basket' || x.kind === 'match') && day(x) === d)).toBe(false)
    expect(wk.some((x) => x.kind === 'match' && day(x) === d + 1)).toBe(false)
  }
}

describe('planificación semanal', () => {
  it('genera basket, 3 gym y 2 carreras sin conflictos', () => {
    const s = fresh()
    sync(s, MON)
    const wk = weekSessions(s, MON)
    expect(wk.filter((x) => x.kind === 'basket')).toHaveLength(2)
    expect(wk.filter((x) => x.kind === 'match')).toHaveLength(1)
    expect(wk.filter((x) => x.kind === 'gym')).toHaveLength(3)
    expect(wk.filter((x) => x.kind === 'run')).toHaveLength(2)
    sane(s)
    expect(s.weeks[MON].block).toBe(1)
  })

  it('es estable: sincronizar dos veces no mueve nada', () => {
    const s = fresh()
    sync(s, MON)
    const before = s.sessions.map((x) => `${x.id}@${x.date}`).sort()
    sync(s, MON)
    expect(s.sessions.map((x) => `${x.id}@${x.date}`).sort()).toEqual(before)
    expect(s.weeks[MON].changes).toHaveLength(0)
  })

  it('recoloca la pierna si no la hiciste', () => {
    const s = fresh()
    sync(s, MON)
    const a = byTpl(s, 'A')
    const wed = addDays(MON, 2)
    expect(a.date < wed).toBe(true)
    sync(s, wed)
    const moved = s.sessions.find((x) => x.template === 'A')!
    expect(moved.status).toBe('planned')
    expect(moved.date >= wed).toBe(true)
    sane(s)
    expect(s.weeks[MON].changes.length).toBeGreaterThan(0)
  })

  it('un partido entre semana aparta la pierna del día anterior', () => {
    const s = fresh()
    sync(s, MON)
    const a = byTpl(s, 'A')
    // partido justo al día siguiente de la pierna
    s.sessions.push({ id: 'm', date: addDays(a.date, 1), kind: 'match', title: 'Partido', status: 'planned', minutes: 90, fixed: true, manual: true })
    sync(s, MON)
    expect(fixedDays(s).has(day(a) + 1)).toBe(true)
    sane(s)
  })

  it('repite bloque si la semana no se cumplió y avanza si sí', () => {
    const s = fresh()
    sync(s, MON)
    const next = addDays(MON, 7)
    sync(s, next)
    expect(s.weeks[MON].compliance).toBe(0)
    expect(s.weeks[next].block).toBe(1)

    const t = fresh()
    sync(t, MON)
    t.sessions.forEach((x) => (x.status = 'done'))
    sync(t, next)
    expect(t.weeks[next].block).toBe(2)
  })
})

describe('adaptación', () => {
  it('no coloca gym ni carrera en días bloqueados', () => {
    const s = fresh()
    s.profile.blockedDays = [0, 2, 4]
    sync(s, MON)
    const flex = weekSessions(s, MON).filter((x) => x.kind === 'gym' || x.kind === 'run')
    expect(flex.some((x) => [0, 2, 4].includes(day(x)))).toBe(false)
  })

  it('una rutina editada cambia las sesiones planificadas', () => {
    const s = fresh()
    s.templates.B.items = s.templates.B.items.map((i) => (i.id === 'bench' ? { id: 'dbbench', sets: 3 } : i))
    sync(s, MON)
    const b = byTpl(s, 'B')
    expect(b.exercises!.some((e) => e.id === 'dbbench' && e.sets === 3)).toBe(true)
    expect(b.exercises!.some((e) => e.id === 'bench')).toBe(false)
  })

  it('una sesión personalizada conserva sus ejercicios al replanificar', () => {
    const s = fresh()
    sync(s, MON)
    const a = byTpl(s, 'A')
    a.exercises = a.exercises!.filter((e) => e.id !== 'squat')
    a.customized = true
    sync(s, MON)
    const again = s.sessions.find((x) => x.template === 'A')!
    expect(again.exercises!.some((e) => e.id === 'squat')).toBe(false)
  })

  it('semana muy dura (RPE alto) → la siguiente es suave', () => {
    const s = fresh()
    sync(s, MON)
    s.sessions.forEach((x) => { x.status = 'done'; x.rpe = 9 })
    const next = addDays(MON, 7)
    sync(s, next)
    expect(s.weeks[next].reduced).toBe(true)
  })
})

describe('progresión de cargas', () => {
  const squat = EXERCISES.squat
  const block = (kg: number, reps: number[]) => ({
    id: 'squat', sets: reps.length, repMin: 5, repMax: 8, targetKg: kg, targetReps: 5,
    log: reps.map((r) => ({ kg, reps: r, done: true })),
  })

  it('primera vez: calibrar', () => expect(nextTarget(squat, [])).toEqual({ kg: null, reps: 5 }))
  it('sube reps dentro del rango', () => expect(nextTarget(squat, [block(100, [7, 7, 6, 6])])).toEqual({ kg: 100, reps: 7 }))
  it('sube peso al completar el rango', () => expect(nextTarget(squat, [block(100, [8, 8, 8, 8])])).toEqual({ kg: 105, reps: 5 }))
  it('mantiene si falla una vez', () => expect(nextTarget(squat, [block(100, [5, 4, 4, 3])])).toEqual({ kg: 100, reps: 5 }))
  it('baja 5 % si falla dos veces', () =>
    expect(nextTarget(squat, [block(100, [5, 4, 4, 3]), block(100, [5, 4, 3, 3])])).toEqual({ kg: 95, reps: 5 }))
})

describe('calendario conectado', () => {
  const match = (key: string, date: string, time = '18:00') => ({ key, date, time, title: `Partido ${key}`, location: 'Pabellón' })
  const connected = (s: State) => (s.calendar = { url: 'https://x.test/c.ics', words: 'partido', all: false, replaceWeekend: true, lastOk: `${MON}T08:00:00Z` })

  it('un partido entre semana quita el entreno de ese día y aparta la pierna', () => {
    const s = fresh()
    sync(s, MON)
    connected(s)
    reconcileCalendar(s, [match('m1', '2026-11-19'), match('m2', '2026-11-22')], MON)
    sync(s, MON)
    const wk = weekSessions(s, MON)
    expect(wk.find((x) => x.date === '2026-11-19' && x.kind === 'basket')?.status).toBe('skipped')
    // El del finde sale del calendario (domingo), no el automático del sábado
    expect(wk.filter((x) => x.kind === 'match' && x.status === 'planned').map((x) => x.date)).toEqual(['2026-11-19', '2026-11-22'])
    expect(wk.find((x) => x.cal === 'm1')).toMatchObject({ time: '18:00', note: 'Pabellón', fixed: true })
    sane(s)
    expect(s.weeks[MON].changes.some((c) => c.text.includes('Partido añadido desde tu calendario'))).toBe(true)
  })

  it('si el partido cambia de día se mueve, y si desaparece se quita y vuelve el entreno', () => {
    const s = fresh()
    sync(s, MON)
    connected(s)
    reconcileCalendar(s, [match('m1', '2026-11-19')], MON)
    sync(s, MON)
    const id = s.sessions.find((x) => x.cal === 'm1')!.id
    reconcileCalendar(s, [match('m1', '2026-11-20', '20:30')], MON)
    sync(s, MON)
    expect(s.sessions.find((x) => x.cal === 'm1')).toMatchObject({ id, date: '2026-11-20', time: '20:30' })
    expect(s.sessions.find((x) => x.date === '2026-11-19' && x.kind === 'basket')?.status).toBe('planned')
    reconcileCalendar(s, [], MON)
    sync(s, MON)
    expect(s.sessions.some((x) => x.cal)).toBe(false)
    sane(s)
  })

  it('sin sincronizar en 2 semanas vuelve el partido automático del finde', () => {
    const s = fresh()
    connected(s)
    s.calendar!.lastOk = '2026-10-20T08:00:00Z'
    sync(s, MON)
    expect(fixedDays(s)).toEqual(new Set([5]))
  })
})
