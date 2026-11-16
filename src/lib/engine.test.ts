import { describe, expect, it } from 'vitest'
import { sync, weekSessions } from './engine'
import { EXERCISES, nextTarget } from './program'
import { addDays, weekday } from './dates'
import type { Session, State } from './types'

const MON = '2026-11-16'

function fresh(): State {
  return {
    v: 1,
    profile: {
      onboarded: true, age: 25, heightCm: 180, weightKg: 80, goalWeightKg: 76, goalDate: '2027-04-01', startDate: MON,
      pace5k: 380, basketDays: [1, 3], weekendGame: true, gameDay: 5, gymPerWeek: 3, runsPerWeek: 2, gym: null, gymDetect: false,
    },
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
