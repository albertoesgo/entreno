import type { ExerciseBlock, ExerciseDef, GymTemplate, GymTemplateDef, Load, Profile, RunPlan, State, TemplateItem, WeekMeta } from './types'
import { fmtPace } from './format'

// ── Biblioteca de ejercicios ────────────────────────────────────────────────

export const GROUPS: Record<string, string> = {
  plio: 'Pliometría · salto',
  rodilla: 'Pierna · rodilla',
  cadera: 'Pierna · cadera',
  unilateral: 'Pierna · unilateral',
  gemelo: 'Gemelo',
  empuje_h: 'Pecho',
  empuje_v: 'Hombro · empuje',
  tiron_v: 'Espalda · vertical',
  tiron_h: 'Espalda · remo',
  lateral: 'Hombro lateral',
  posterior: 'Hombro posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  core: 'Core',
  otro: 'Otros',
}

const ex = (id: string, name: string, group: string, repMin: number, repMax: number, inc: number, load: Load, cue?: string): ExerciseDef => ({
  id, name, group, repMin, repMax, inc, load, cue,
})

export const EXERCISES: Record<string, ExerciseDef> = Object.fromEntries(
  [
    ex('boxjump', 'Salto al cajón', 'plio', 3, 3, 0, 'plyo', 'Máxima intención. Baja andando, descansa 90".'),
    ex('bounds', 'Saltos horizontales encadenados', 'plio', 3, 3, 0, 'plyo', '3 saltos seguidos; clava la caída.'),
    ex('cmj', 'Salto vertical con contramovimiento', 'plio', 3, 3, 0, 'plyo', 'Brazos activos, toca lo más alto posible.'),
    ex('approach', 'Salto con carrera (aproximación)', 'plio', 3, 3, 0, 'plyo', '2–3 pasos y salto a dos pies, como en pista.'),
    ex('singleleg', 'Saltos a una pierna', 'plio', 3, 3, 0, 'plyo', 'Por pierna. Aterriza estable.'),
    ex('depthjump', 'Drop jump', 'plio', 3, 3, 0, 'plyo', 'Cae de un cajón bajo y rebota rápido. Solo si ya dominas el salto al cajón.'),
    ex('pogo', 'Pogos', 'plio', 15, 15, 0, 'plyo', 'Contactos rápidos con tobillo rígido.'),

    ex('squat', 'Sentadilla trasera', 'rodilla', 5, 8, 5, 'kg', 'Deja 1–2 reps en reserva. Baja controlado, sube explosivo.'),
    ex('frontsquat', 'Sentadilla frontal', 'rodilla', 5, 8, 2.5, 'kg'),
    ex('hacksquat', 'Hack squat', 'rodilla', 8, 10, 5, 'kg'),
    ex('legpress', 'Prensa', 'rodilla', 8, 12, 10, 'kg', 'Pies a la anchura de hombros.'),
    ex('goblet', 'Sentadilla goblet', 'rodilla', 8, 12, 2, 'kg'),
    ex('legext', 'Extensión de cuádriceps', 'rodilla', 10, 15, 2.5, 'kg'),

    ex('rdl', 'Peso muerto rumano', 'cadera', 8, 10, 5, 'kg', 'Cadera atrás, espalda neutra.'),
    ex('trapbar', 'Peso muerto con barra hexagonal', 'cadera', 4, 6, 5, 'kg', 'Empuja el suelo, sube rápido.'),
    ex('hipthrust', 'Hip thrust', 'cadera', 8, 12, 5, 'kg', 'Pausa de 1" arriba.'),
    ex('legcurl', 'Curl femoral', 'cadera', 10, 12, 2.5, 'kg'),
    ex('nordic', 'Curl nórdico', 'cadera', 4, 8, 0, 'bw', 'Baja lo más lento que puedas.'),

    ex('bulgarian', 'Sentadilla búlgara', 'unilateral', 8, 10, 2, 'kg', 'Kg por mancuerna · reps por pierna.'),
    ex('lunge', 'Zancadas caminando', 'unilateral', 8, 12, 2, 'kg', 'Kg por mancuerna · reps por pierna.'),
    ex('stepup', 'Step-up al cajón', 'unilateral', 8, 10, 2, 'kg', 'Kg por mancuerna · reps por pierna.'),

    ex('calf', 'Gemelo de pie', 'gemelo', 10, 15, 5, 'kg', 'Pausa de 1" arriba.'),
    ex('seatedcalf', 'Gemelo sentado', 'gemelo', 12, 20, 5, 'kg'),

    ex('bench', 'Press banca', 'empuje_h', 6, 8, 2.5, 'kg', 'Deja 1–2 reps en reserva.'),
    ex('dbbench', 'Press banca con mancuernas', 'empuje_h', 6, 10, 2, 'kg', 'Kg por mancuerna.'),
    ex('incline', 'Press inclinado con mancuernas', 'empuje_h', 8, 12, 2, 'kg', 'Kg por mancuerna.'),
    ex('machinepress', 'Press de pecho en máquina', 'empuje_h', 8, 12, 5, 'kg'),
    ex('dips', 'Fondos', 'empuje_h', 6, 12, 2.5, 'bw+', 'Kg = lastre (0 = peso corporal).'),
    ex('cablefly', 'Aperturas en polea', 'empuje_h', 12, 15, 2.5, 'kg'),

    ex('ohp', 'Press militar con mancuernas', 'empuje_v', 8, 10, 2, 'kg', 'Kg por mancuerna.'),
    ex('barbellohp', 'Press militar con barra', 'empuje_v', 5, 8, 2.5, 'kg'),
    ex('landmine', 'Landmine press', 'empuje_v', 8, 12, 2.5, 'kg', 'Reps por brazo.'),

    ex('pullup', 'Dominadas', 'tiron_v', 6, 10, 2.5, 'bw+', 'Kg = lastre (0 = peso corporal).'),
    ex('chinup', 'Dominadas supinas', 'tiron_v', 6, 10, 2.5, 'bw+', 'Kg = lastre (0 = peso corporal).'),
    ex('latpull', 'Jalón al pecho', 'tiron_v', 8, 12, 2.5, 'kg'),

    ex('row', 'Remo con barra', 'tiron_h', 8, 10, 2.5, 'kg'),
    ex('cablerow', 'Remo en polea baja', 'tiron_h', 10, 12, 2.5, 'kg'),
    ex('dbrow', 'Remo con mancuerna', 'tiron_h', 8, 12, 2, 'kg', 'Reps por brazo.'),
    ex('chestrow', 'Remo con pecho apoyado', 'tiron_h', 8, 12, 2, 'kg'),

    ex('lateral', 'Elevaciones laterales', 'lateral', 12, 20, 1, 'kg', 'Kg por mancuerna. Controla la bajada.'),
    ex('cablelateral', 'Laterales en polea', 'lateral', 12, 20, 1.25, 'kg', 'Reps por brazo.'),

    ex('facepull', 'Face pull', 'posterior', 15, 20, 2.5, 'kg'),
    ex('reardelt', 'Pájaros', 'posterior', 12, 20, 1, 'kg'),

    ex('curl', 'Curl inclinado', 'biceps', 10, 12, 1, 'kg', 'Kg por mancuerna.'),
    ex('barbellcurl', 'Curl con barra', 'biceps', 8, 12, 2.5, 'kg'),
    ex('hammer', 'Curl martillo', 'biceps', 10, 12, 1, 'kg', 'Kg por mancuerna.'),
    ex('preacher', 'Curl predicador', 'biceps', 10, 12, 2.5, 'kg'),

    ex('triceps', 'Extensión de tríceps en polea', 'triceps', 10, 12, 2.5, 'kg'),
    ex('skullcrusher', 'Press francés', 'triceps', 8, 12, 2.5, 'kg'),
    ex('overheadext', 'Extensión sobre la cabeza en polea', 'triceps', 10, 15, 2.5, 'kg'),

    ex('pallof', 'Pallof press', 'core', 10, 12, 2.5, 'kg', 'Reps por lado.'),
    ex('legraise', 'Elevación de piernas colgado', 'core', 10, 15, 0, 'bw'),
    ex('abwheel', 'Rueda abdominal', 'core', 8, 12, 0, 'bw'),
    ex('cablecrunch', 'Crunch en polea', 'core', 10, 15, 2.5, 'kg'),
  ].map((e) => [e.id, e]),
)

export function exDef(state: Pick<State, 'custom'>, id: string): ExerciseDef {
  return EXERCISES[id] ?? state.custom?.[id] ?? { id, name: id, group: 'otro', repMin: 8, repMax: 12, inc: 2.5, load: 'kg' }
}

export const allExercises = (state: Pick<State, 'custom'>): ExerciseDef[] => [...Object.values(EXERCISES), ...Object.values(state.custom ?? {})]

// ── Rutinas por defecto ─────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES: Record<GymTemplate, GymTemplateDef> = {
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

export const freshTemplates = (): Record<GymTemplate, GymTemplateDef> => structuredClone(DEFAULT_TEMPLATES)

export const BLOCK_LABEL: Record<number, string> = { 1: 'Base', 2: 'Carga', 3: 'Pico', 4: 'Descarga' }

const r = (kg: number) => Math.round(kg * 2) / 2

function templateItems(state: State, t: GymTemplate, gymPerWeek: number): TemplateItem[] {
  const items = (state.templates ?? DEFAULT_TEMPLATES)[t].items
  // Con 2 días, el torso absorbe los brazos de la sesión estética si no los tiene ya
  if (gymPerWeek === 2 && t === 'B') {
    const extra = ['curl', 'triceps'].filter((id) => !items.some((i) => exDef(state, i.id).group === exDef(state, id).group))
    return [...items, ...extra.map((id) => ({ id, sets: 2 }))]
  }
  return items
}

// ── Progresión ──────────────────────────────────────────────────────────────

/** Bloques registrados (con al menos una serie hecha) de un ejercicio, del más reciente al más antiguo. */
export function history(state: State, exId: string, before: string, excludeId?: string): ExerciseBlock[] {
  return state.sessions
    .filter((s) => s.status === 'done' && s.exercises && s.date <= before && s.id !== excludeId)
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
    return { kg: work, reps: Math.max(def.repMin, Math.min(def.repMax, minReps || def.repMin)) }
  }
  return { kg: work, reps: Math.min(def.repMax, minReps + 1) }
}

export interface GymCtx {
  date: string
  deload: boolean
  reduced: boolean
  boost: boolean
  plyoCut: boolean
  cycle: number
  sessionId?: string
}

/** Un bloque de ejercicio con su objetivo calculado a partir de tu historial. */
export function buildBlock(state: State, it: TemplateItem, ctx: GymCtx, index = 99): ExerciseBlock {
  const base = exDef(state, it.id)
  const def = { ...base, repMin: it.repMin ?? base.repMin, repMax: Math.max(it.repMax ?? base.repMax, it.repMin ?? base.repMin) }
  let sets = it.sets
  if (def.load === 'plyo') {
    sets = Math.min(Math.max(it.maxSets ?? it.sets, it.sets), it.sets + ctx.cycle)
    if (ctx.plyoCut) sets = Math.max(1, sets - 1)
  }
  if (ctx.deload) sets = Math.max(2, Math.round(sets * 0.6))
  else if (ctx.reduced) sets = Math.max(2, sets - 1)
  else if (ctx.boost && def.load !== 'plyo' && index < 2) sets = Math.min(5, sets + 1)
  let { kg, reps } = nextTarget(def, history(state, it.id, ctx.date, ctx.sessionId))
  if (ctx.deload && kg) kg = r(kg * 0.9)
  return {
    id: it.id,
    sets,
    baseSets: it.sets,
    repMin: def.repMin,
    repMax: def.repMax,
    targetKg: kg,
    targetReps: reps,
    ...(ctx.deload ? { deload: true } : {}),
    log: Array.from({ length: sets }, () => ({ kg, reps, done: false })),
  }
}

export function buildGym(state: State, t: GymTemplate, ctx: GymCtx, gymPerWeek: number): ExerciseBlock[] {
  let plain = 0
  return templateItems(state, t, gymPerWeek).map((it) => {
    const b = buildBlock(state, it, ctx, exDef(state, it.id).load === 'plyo' ? 99 : plain)
    if (exDef(state, it.id).load !== 'plyo') plain++
    return b
  })
}

/** Recalcula objetivos de una sesión personalizada manteniendo su lista de ejercicios. */
export function rebuildCustom(state: State, blocks: ExerciseBlock[], ctx: GymCtx): ExerciseBlock[] {
  let plain = 0
  return blocks.map((b) => {
    const isPlyo = exDef(state, b.id).load === 'plyo'
    const nb = buildBlock(state, { id: b.id, sets: b.baseSets ?? b.sets, repMin: b.repMin, repMax: b.repMax }, ctx, isPlyo ? 99 : plain)
    if (!isPlyo) plain++
    return nb
  })
}

export const gymMinutes = (blocks: ExerciseBlock[]) => 10 + Math.round(blocks.reduce((n, b) => n + b.sets, 0) * 2.5)

/** Descanso recomendado entre series (segundos). */
export function restFor(def: ExerciseDef, repMax: number): number {
  if (def.load === 'plyo') return 90
  if (repMax <= 8) return 150
  if (def.group === 'lateral' || def.group === 'posterior' || def.group === 'biceps' || def.group === 'triceps' || def.group === 'core') return 60
  return 90
}

// ── Carrera ─────────────────────────────────────────────────────────────────

/** Ritmos derivados de tu 5K actual (s/km). */
export function buildRun(p: Profile, t: 'quality' | 'easy' | 'long', meta: WeekMeta): RunPlan & { minutes: number } {
  const pace = p.pace5k
  const deload = meta.block === 4
  const prog = meta.cycle * 3 + Math.min(meta.block, 3) - 1
  const adj = (m: number) => Math.round(meta.reduced ? m * 0.85 : meta.boost ? m * 1.1 : m)
  const repAdj = meta.reduced ? -2 : meta.boost ? 1 : 0

  if (t === 'easy' || t === 'long') {
    let min = Math.min(55, 30 + 3 * prog)
    if (t === 'long') min = Math.min(75, min + 15)
    if (deload) min = t === 'long' ? 40 : 30
    min = adj(min)
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
    const reps = Math.max(4, Math.min(10, 6 + meta.cycle) + repAdj)
    return {
      type: 'intervals',
      title: `${reps} × 400 m`,
      detail: `Calienta 12' suave. ${reps} × 400 m a ${fmtPace(pace - 20)} /km con 90" trotando. 8' suave para acabar.`,
      targetPace: pace - 20,
      minutes: Math.round(20 + reps * 3.5),
    }
  }
  if (meta.block === 2) {
    const t = adj(Math.min(30, 15 + 3 * meta.cycle))
    return {
      type: 'tempo',
      title: `Tempo ${t}'`,
      detail: `Calienta 12' suave. ${t}' seguidos a ${fmtPace(pace + 20)} /km: cómodamente duro. 8' suave.`,
      targetPace: pace + 20,
      minutes: 20 + t,
    }
  }
  const reps = Math.max(2, Math.min(6, 3 + meta.cycle) + Math.sign(repAdj))
  return {
    type: 'intervals',
    title: `${reps} × 1 km`,
    detail: `Calienta 12' suave. ${reps} × 1 km a ${fmtPace(pace - 5)} /km con 2' trotando. 8' suave.`,
    targetPace: pace - 5,
    minutes: Math.round(20 + reps * 8.5),
  }
}
