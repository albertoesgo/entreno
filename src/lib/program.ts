import type { ExerciseBlock, GymTemplate, Profile, RunPlan, State, WeekMeta } from './types'
import { fmtPace } from './format'

export type Load = 'kg' | 'bw+' | 'bw' | 'plyo'

export interface ExerciseDef {
  id: string
  name: string
  repMin: number
  repMax: number
  inc: number // kg a subir cuando completas el rango
  load: Load
  cue?: string
}

const ex = (id: string, name: string, repMin: number, repMax: number, inc: number, load: Load, cue?: string): ExerciseDef =>
  ({ id, name, repMin, repMax, inc, load, cue })

export const EXERCISES: Record<string, ExerciseDef> = Object.fromEntries(
  [
    ex('boxjump', 'Salto al cajón', 3, 3, 0, 'plyo', 'Máxima intención en cada salto. Baja andando, descansa 90".'),
    ex('bounds', 'Saltos horizontales encadenados', 3, 3, 0, 'plyo', '3 saltos seguidos; clava la caída.'),
    ex('squat', 'Sentadilla trasera', 5, 8, 5, 'kg', 'Deja 1–2 reps en reserva. Baja controlado, sube explosivo.'),
    ex('rdl', 'Peso muerto rumano', 8, 10, 5, 'kg', 'Cadera atrás, espalda neutra.'),
    ex('bulgarian', 'Sentadilla búlgara', 8, 10, 2, 'kg', 'Kg por mancuerna · reps por pierna.'),
    ex('calf', 'Gemelo de pie', 10, 15, 5, 'kg', 'Pausa de 1" arriba.'),
    ex('pallof', 'Pallof press', 10, 12, 2.5, 'kg', 'Reps por lado.'),
    ex('bench', 'Press banca', 6, 8, 2.5, 'kg', 'Deja 1–2 reps en reserva.'),
    ex('pullup', 'Dominadas', 6, 10, 2.5, 'bw+', 'Kg = lastre (0 = peso corporal).'),
    ex('ohp', 'Press militar con mancuernas', 8, 10, 2, 'kg', 'Kg por mancuerna.'),
    ex('row', 'Remo con barra', 8, 10, 2.5, 'kg'),
    ex('lateral', 'Elevaciones laterales', 12, 20, 1, 'kg', 'Kg por mancuerna. Controla la bajada.'),
    ex('facepull', 'Face pull', 15, 20, 2.5, 'kg'),
    ex('incline', 'Press inclinado con mancuernas', 8, 12, 2, 'kg', 'Kg por mancuerna.'),
    ex('cablerow', 'Remo en polea baja', 10, 12, 2.5, 'kg'),
    ex('curl', 'Curl inclinado', 10, 12, 1, 'kg', 'Kg por mancuerna.'),
    ex('triceps', 'Extensión de tríceps en polea', 10, 12, 2.5, 'kg'),
    ex('legraise', 'Elevación de piernas colgado', 10, 15, 0, 'bw'),
  ].map((e) => [e.id, e]),
)

interface TemplateItem {
  id: string
  sets: number
  maxSets?: number
}

export const GYM: Record<GymTemplate, { title: string; focus: string; items: TemplateItem[] }> = {
  A: {
    title: 'Pierna + Salto',
    focus: 'Potencia y tren inferior',
    items: [
      { id: 'boxjump', sets: 3, maxSets: 5 },
      { id: 'bounds', sets: 2, maxSets: 4 },
      { id: 'squat', sets: 4 },
      { id: 'rdl', sets: 3 },
      { id: 'bulgarian', sets: 3 },
      { id: 'calf', sets: 3 },
      { id: 'pallof', sets: 3 },
    ],
  },
  B: {
    title: 'Torso · Fuerza',
    focus: 'Pecho, espalda y hombro pesados',
    items: [
      { id: 'bench', sets: 4 },
      { id: 'pullup', sets: 4 },
      { id: 'ohp', sets: 3 },
      { id: 'row', sets: 3 },
      { id: 'lateral', sets: 3 },
      { id: 'facepull', sets: 2 },
    ],
  },
  C: {
    title: 'Torso · Estética',
    focus: 'Hombro, brazos y core',
    items: [
      { id: 'incline', sets: 4 },
      { id: 'cablerow', sets: 3 },
      { id: 'lateral', sets: 4 },
      { id: 'curl', sets: 3 },
      { id: 'triceps', sets: 3 },
      { id: 'legraise', sets: 3 },
    ],
  },
}

export const BLOCK_LABEL: Record<number, string> = { 1: 'Base', 2: 'Carga', 3: 'Pico', 4: 'Descarga' }

const r = (kg: number) => Math.round(kg * 2) / 2

function templateItems(t: GymTemplate, gymPerWeek: number): TemplateItem[] {
  // Con 2 días, el torso absorbe los brazos de la sesión estética
  if (gymPerWeek === 2 && t === 'B') return [...GYM.B.items, { id: 'curl', sets: 2 }, { id: 'triceps', sets: 2 }]
  return GYM[t].items
}

/** Bloques registrados (con al menos una serie hecha) de un ejercicio, del más reciente al más antiguo. */
export function history(state: State, exId: string, before: string): ExerciseBlock[] {
  return state.sessions
    .filter((s) => s.status === 'done' && s.exercises && s.date <= before)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((s) => s.exercises!.filter((e) => e.id === exId && !e.deload && e.log.some((l) => l.done)))
}

function summarize(b: ExerciseBlock, def: ExerciseDef) {
  const done = b.log.filter((l) => l.done && (l.reps ?? 0) > 0)
  const kgs = done.map((l) => l.kg).filter((k): k is number => k != null)
  const work = def.load === 'bw' ? null : kgs.length ? Math.max(...kgs) : b.targetKg
  const atWork = done.filter((l) => def.load === 'bw' || l.kg === work)
  const minReps = atWork.length ? Math.min(...atWork.map((l) => l.reps!)) : 0
  const allSets = atWork.length >= b.sets
  return { work, minReps, allSets, failed: !allSets || minReps < def.repMin }
}

/**
 * Doble progresión: con el mismo peso subes reps hasta el tope del rango en todas las series;
 * entonces subes peso y vuelves al mínimo. Si fallas dos veces seguidas, bajas un 5 %.
 */
export function nextTarget(def: ExerciseDef, hist: ExerciseBlock[]): { kg: number | null; reps: number } {
  if (def.load === 'plyo') return { kg: null, reps: def.repMin }
  const last = hist[0]
  if (!last) return { kg: def.load === 'bw+' ? 0 : null, reps: def.repMin }
  const { work, minReps, allSets, failed } = summarize(last, def)
  if (allSets && minReps >= def.repMax) {
    if (def.load === 'bw' || work == null) return { kg: work, reps: def.repMax }
    return { kg: r(work + def.inc), reps: def.repMin }
  }
  if (failed) {
    const prev = hist[1]
    if (prev && summarize(prev, def).failed && work != null && def.load === 'kg') return { kg: r(work * 0.95), reps: def.repMin }
    return { kg: work, reps: def.repMin }
  }
  return { kg: work, reps: Math.min(def.repMax, minReps + 1) }
}

export interface GymCtx {
  date: string
  deload: boolean
  reduced: boolean
  plyoCut: boolean
  cycle: number
  gymPerWeek: number
}

export function buildGym(state: State, t: GymTemplate, ctx: GymCtx): ExerciseBlock[] {
  return templateItems(t, ctx.gymPerWeek).map((it) => {
    const def = EXERCISES[it.id]
    let sets = it.sets
    if (def.load === 'plyo') {
      sets = Math.min(it.maxSets ?? it.sets, it.sets + ctx.cycle)
      if (ctx.plyoCut) sets = Math.max(1, sets - 1)
    }
    if (ctx.deload) sets = Math.max(2, Math.round(sets * 0.6))
    else if (ctx.reduced) sets = Math.max(2, sets - 1)
    let { kg, reps } = nextTarget(def, history(state, it.id, ctx.date))
    if (ctx.deload && kg) kg = r(kg * 0.9)
    return {
      id: it.id,
      sets,
      repMin: def.repMin,
      repMax: def.repMax,
      targetKg: kg,
      targetReps: reps,
      ...(ctx.deload ? { deload: true } : {}),
      log: Array.from({ length: sets }, () => ({ kg, reps, done: false })),
    }
  })
}

export const gymMinutes = (blocks: ExerciseBlock[]) => 10 + Math.round(blocks.reduce((n, b) => n + b.sets, 0) * 2.5)

/** Ritmos derivados de tu 5K actual (s/km). */
export function buildRun(p: Profile, t: 'quality' | 'easy' | 'long', meta: WeekMeta): RunPlan & { minutes: number } {
  const pace = p.pace5k
  const deload = meta.block === 4
  const prog = meta.cycle * 3 + Math.min(meta.block, 3) - 1
  const cut = (m: number) => (meta.reduced ? Math.round(m * 0.85) : m)

  if (t === 'easy' || t === 'long') {
    let min = Math.min(55, 30 + 3 * prog)
    if (t === 'long') min = Math.min(75, min + 15)
    if (deload) min = t === 'long' ? 40 : 30
    min = cut(min)
    return {
      type: 'easy',
      title: t === 'long' ? 'Rodaje largo' : 'Rodaje suave',
      detail: `${min}' cómodo, entre ${fmtPace(pace + 65)} y ${fmtPace(pace + 90)} /km. Tienes que poder hablar.`,
      targetPace: pace + 75,
      minutes: min,
    }
  }

  if (deload) {
    return {
      type: 'test',
      title: 'Test 5K',
      detail: `Calienta 10' suave + 3 aceleraciones. 5 km a tope pero regular. Objetivo: bajar de ${fmtPace(pace)} /km. Actualiza tus ritmos.`,
      targetPace: pace - 5,
      minutes: 50,
    }
  }
  if (meta.block === 1) {
    const reps = Math.max(4, Math.min(10, 6 + meta.cycle) - (meta.reduced ? 2 : 0))
    return {
      type: 'intervals',
      title: `${reps} × 400 m`,
      detail: `Calienta 12' suave. ${reps} × 400 m a ${fmtPace(pace - 20)} /km con 90" trotando. 8' suave para acabar.`,
      targetPace: pace - 20,
      minutes: Math.round(20 + reps * 3.5),
    }
  }
  if (meta.block === 2) {
    const t = cut(Math.min(30, 15 + 3 * meta.cycle))
    return {
      type: 'tempo',
      title: `Tempo ${t}'`,
      detail: `Calienta 12' suave. ${t}' seguidos a ${fmtPace(pace + 20)} /km: cómodamente duro. 8' suave.`,
      targetPace: pace + 20,
      minutes: 20 + t,
    }
  }
  const reps = Math.max(2, Math.min(6, 3 + meta.cycle) - (meta.reduced ? 1 : 0))
  return {
    type: 'intervals',
    title: `${reps} × 1 km`,
    detail: `Calienta 12' suave. ${reps} × 1 km a ${fmtPace(pace - 5)} /km con 2' trotando. 8' suave.`,
    targetPace: pace - 5,
    minutes: Math.round(20 + reps * 8.5),
  }
}
