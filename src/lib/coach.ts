/**
 * Coach con IA (Gemini). La clave la pone el usuario y se guarda solo en este dispositivo,
 * separada de los datos exportables. Las llamadas van directas del móvil a Google.
 *
 * El coach recibe un resumen del plan e historial y puede actuar sobre la app mediante
 * herramientas (mover sesiones, cambiar ejercicios, editar rutinas, etc.). Todas las
 * acciones pasan por las mismas funciones que la interfaz, así que el motor replanifica igual.
 */
import type { ChatMsg, GymTemplate, Load, Profile, Session, State } from './types'
import { actions, getState } from './store'
import { addDays, DAY_NAME, dayName, todayIso, weekday, weekStart } from './dates'
import { BLOCK_LABEL, GROUPS, allExercises, exDef } from './program'
import { weekSessions } from './engine'
import { fmtNum, fmtPace, parseTime } from './format'

const API = 'https://generativelanguage.googleapis.com/v1beta'
const KEY_LS = 'entreno.gemini.key'
const MODEL_LS = 'entreno.gemini.model'

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v == null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    } catch {
      /* ignorar */
    }
  },
}

export const coachKey = () => ls.get(KEY_LS)
export const coachModel = () => ls.get(MODEL_LS)
export function forgetCoach() {
  ls.set(KEY_LS, null)
  ls.set(MODEL_LS, null)
}

class CoachError extends Error {}

async function call(path: string, key: string, body?: unknown) {
  const res = await fetch(`${API}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let msg = ''
    try {
      msg = (await res.json())?.error?.message ?? ''
    } catch {
      /* sin cuerpo */
    }
    if (res.status === 429) throw new CoachError('Has llegado al límite gratuito de Gemini por ahora. Prueba en un rato.')
    if (res.status === 400 && /api key/i.test(msg)) throw new CoachError('La clave de Gemini no es válida.')
    if (res.status === 403) throw new CoachError('La clave no tiene permiso para usar Gemini. Revísala en Google AI Studio.')
    throw new CoachError(`Gemini respondió con un error (${res.status}). ${msg}`.trim())
  }
  return res.json()
}

/** Elige el mejor modelo «flash» disponible para la clave (los gratuitos más capaces). */
export async function connectCoach(key: string): Promise<string> {
  const data = await call('models?pageSize=200', key)
  const models: { name: string; supportedGenerationMethods?: string[] }[] = data.models ?? []
  const score = (n: string) => {
    const v = parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0')
    return v * 10 - (n.includes('lite') ? 3 : 0) - (/preview|exp/.test(n) ? 1 : 0)
  }
  const ok = models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !/image|tts|audio|live|thinking|embedding|native/.test(n))
    .sort((a, b) => score(b) - score(a))
  if (!ok.length) throw new CoachError('No encuentro un modelo Gemini Flash disponible para esta clave.')
  ls.set(KEY_LS, key)
  ls.set(MODEL_LS, ok[0])
  return ok[0]
}

// ── Contexto ────────────────────────────────────────────────────────────────

function sessionLine(st: State, s: Session): string {
  const d = `${DAY_NAME[weekday(s.date)].toLowerCase()} ${s.date}`
  let txt = `- [${s.id}] ${d} · ${s.kind} · ${s.title} · ${s.status}`
  if (s.kind === 'gym' && s.exercises) {
    txt += '\n' + s.exercises.map((b) => `    · ${exDef(st, b.id).name} (${b.id}) ${b.sets}×${b.targetReps}${b.targetKg ? ` @${fmtNum(b.targetKg)}kg` : ''}${b.log.some((l) => l.done) ? ` hecho: ${b.log.filter((l) => l.done).map((l) => `${l.kg ?? ''}×${l.reps}`).join(', ')}` : ''}`).join('\n')
  }
  if (s.kind === 'run') {
    if (s.runLog?.distanceKm && s.runLog.timeSec) txt += ` · ${s.runLog.distanceKm} km a ${fmtPace(s.runLog.timeSec / s.runLog.distanceKm)}/km`
    else if (s.run?.detail) txt += ` · ${s.run.detail}`
  }
  if (s.rpe) txt += ` · RPE ${s.rpe}`
  return txt
}

function profileText(p: Profile) {
  return [
    `Edad ${p.age}, ${p.heightCm} cm, ${fmtNum(p.weightKg)} kg. Objetivo ${fmtNum(p.goalWeightKg)} kg el ${p.goalDate} (físico atlético y estético, mejorar carrera y salto).`,
    `Basket: entrenos ${p.basketDays.map((d) => DAY_NAME[d]).join(', ') || 'ninguno'} (90'); partido ${p.weekendGame ? DAY_NAME[p.gameDay] : 'no habitual'} el finde.`,
    `Gimnasio ${p.gymPerWeek} días/semana; carrera ${p.runsPerWeek} salidas/semana; ritmo 5K ${fmtPace(p.pace5k)}/km.`,
    `Días sin gym ni carrera: ${p.blockedDays.map((d) => DAY_NAME[d]).join(', ') || 'ninguno'}.`,
  ].join('\n')
}

export function buildContext(st: State): string {
  const today = todayIso()
  const start = weekStart(today)
  const meta = st.weeks[start]
  const week = weekSessions(st, start)
  const recent = st.sessions.filter((s) => s.status === 'done' && s.date < start && s.date >= addDays(start, -21))
  const routines = (Object.keys(st.templates) as GymTemplate[])
    .map((t) => `${t} «${st.templates[t].title}»: ${st.templates[t].items.map((i) => `${exDef(st, i.id).name} (${i.id}) ${i.sets} series${i.repMin ? ` ${i.repMin}-${i.repMax}` : ''}`).join('; ')}`)
    .join('\n')
  const lib = Object.entries(GROUPS)
    .map(([g, label]) => {
      const list = allExercises(st).filter((e) => e.group === g)
      return list.length ? `${label}: ${list.map((e) => `${e.id}=${e.name}`).join(', ')}` : ''
    })
    .filter(Boolean)
    .join('\n')
  const weights = st.weights.slice(-6).map((w) => `${w.date} ${fmtNum(w.value)}kg`).join(', ')

  return `Hoy es ${DAY_NAME[weekday(today)].toLowerCase()} ${today}.

PERFIL
${profileText(st.profile)}

SEMANA ACTUAL (${start}) · bloque ${meta?.block ?? 1}/4 ${BLOCK_LABEL[meta?.block ?? 1]}${meta?.reduced ? ' · modo suave' : ''}${meta?.boost ? ' · modo +carga' : ''}${meta?.fatigue ? ` · cansancio declarado ${meta.fatigue}/5` : ''}
${week.map((s) => sessionLine(st, s)).join('\n') || '(vacía)'}

ÚLTIMAS 3 SEMANAS (hecho)
${recent.map((s) => sessionLine(st, s)).join('\n') || '(sin historial todavía)'}

RUTINAS DE GIMNASIO
${routines}

PESO: ${weights || 'sin registros'}

BIBLIOTECA DE EJERCICIOS (id=nombre)
${lib}`
}

const SYSTEM = `Eres el coach personal dentro de la app «Entreno». El usuario juega a baloncesto, va al gimnasio y corre; quiere un físico atlético y estético, correr mejor y saltar más.

Cómo funciona la app (no lo contradigas):
- Un motor coloca cada semana gym (A pierna+salto, B torso fuerza, C torso estética) y carreras (calidad + rodajes) alrededor del basket, evitando pierna el día antes de partido, etc. Si algo no se hace, lo recoloca solo.
- Bloques de 4 semanas: base, carga, pico, descarga. Doble progresión en gym. Ritmos de carrera desde el 5K.
- Modo suave (una serie menos, carreras más cortas) y modo +carga.

Tu forma de trabajar:
- Responde en español, cercano y breve (2–6 frases o una lista corta). Nada de relleno.
- Si el usuario pide un cambio, HAZLO con las herramientas en lugar de explicarle cómo hacerlo. Después confirma en una frase lo que has cambiado.
- Usa los ids exactos de sesiones y ejercicios del contexto. Para un ejercicio que no exista, créalo con create_exercise.
- Para cambios puntuales («hoy no puedo hacer sentadilla») usa scope "session"; para cambios permanentes, "always". Si no está claro, elige session y menciónalo.
- Si hay dolor, adapta (quita o cambia lo que moleste, modo suave) y, si es agudo o persiste, recomienda ver a un fisio o médico. No diagnostiques.
- No inventes datos que no estén en el contexto.`

// ── Herramientas ────────────────────────────────────────────────────────────

const S = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'STRING', description, ...extra })
const N = (description: string) => ({ type: 'INTEGER', description })
const scope = S('session = solo esa sesión; always = también en la rutina', { enum: ['session', 'always'] })

const TOOLS = [
  {
    name: 'move_session',
    description: 'Mueve una sesión (gym, carrera, basket) a otro día de la semana actual. El resto se reajusta.',
    parameters: { type: 'OBJECT', properties: { session_id: S('id de la sesión'), date: S('YYYY-MM-DD, hoy o posterior, dentro de esta semana') }, required: ['session_id', 'date'] },
  },
  {
    name: 'skip_session',
    description: 'Salta una sesión esta semana (o marca que no hay entreno/partido).',
    parameters: { type: 'OBJECT', properties: { session_id: S('id de la sesión') }, required: ['session_id'] },
  },
  {
    name: 'add_event',
    description: 'Añade un partido, un entreno de basket o una carrera libre en una fecha de esta semana.',
    parameters: { type: 'OBJECT', properties: { kind: S('tipo', { enum: ['match', 'basket', 'run'] }), date: S('YYYY-MM-DD') }, required: ['kind', 'date'] },
  },
  {
    name: 'swap_exercise',
    description: 'Cambia un ejercicio de una sesión de gym por otro.',
    parameters: {
      type: 'OBJECT',
      properties: { session_id: S('id de la sesión'), from_exercise_id: S('id del ejercicio actual'), to_exercise_id: S('id del nuevo ejercicio'), scope },
      required: ['session_id', 'from_exercise_id', 'to_exercise_id', 'scope'],
    },
  },
  {
    name: 'add_exercise',
    description: 'Añade un ejercicio a una sesión de gym.',
    parameters: { type: 'OBJECT', properties: { session_id: S('id de la sesión'), exercise_id: S('id del ejercicio'), sets: N('series (1-6)'), scope }, required: ['session_id', 'exercise_id', 'scope'] },
  },
  {
    name: 'remove_exercise',
    description: 'Quita un ejercicio de una sesión de gym.',
    parameters: { type: 'OBJECT', properties: { session_id: S('id de la sesión'), exercise_id: S('id del ejercicio'), scope }, required: ['session_id', 'exercise_id', 'scope'] },
  },
  {
    name: 'set_routine',
    description: 'Reescribe una rutina de gym completa (A, B o C). Afecta a todas las sesiones futuras.',
    parameters: {
      type: 'OBJECT',
      properties: {
        routine: S('rutina', { enum: ['A', 'B', 'C'] }),
        title: S('nombre de la rutina (opcional)'),
        exercises: {
          type: 'ARRAY',
          description: 'ejercicios en orden',
          items: { type: 'OBJECT', properties: { exercise_id: S('id'), sets: N('series'), rep_min: N('reps mínimas (opcional)'), rep_max: N('reps máximas (opcional)') }, required: ['exercise_id', 'sets'] },
        },
      },
      required: ['routine', 'exercises'],
    },
  },
  {
    name: 'create_exercise',
    description: 'Crea un ejercicio nuevo en la biblioteca y devuelve su id.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: S('nombre en español'),
        group: S('grupo', { enum: Object.keys(GROUPS) }),
        load: S('kg = con peso; bw = peso corporal; bw+ = corporal con lastre; plyo = salto', { enum: ['kg', 'bw', 'bw+', 'plyo'] }),
        rep_min: N('reps mínimas'),
        rep_max: N('reps máximas'),
      },
      required: ['name', 'group', 'load'],
    },
  },
  {
    name: 'set_week_mode',
    description: 'Modo de la semana actual: normal, reduced (suave: menos series y carrera) o boost (más carga).',
    parameters: { type: 'OBJECT', properties: { mode: S('modo', { enum: ['normal', 'reduced', 'boost'] }) }, required: ['mode'] },
  },
  {
    name: 'update_profile',
    description: 'Cambia la configuración del plan. Días: 0=lunes … 6=domingo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        basket_days: { type: 'ARRAY', items: { type: 'INTEGER' }, description: 'días de entreno de basket' },
        weekend_game: S('partido habitual', { enum: ['none', 'saturday', 'sunday'] }),
        gym_per_week: N('2 o 3'),
        runs_per_week: N('1, 2 o 3'),
        blocked_days: { type: 'ARRAY', items: { type: 'INTEGER' }, description: 'días sin gym ni carrera' },
        goal_weight_kg: { type: 'NUMBER', description: 'peso objetivo' },
        goal_date: S('YYYY-MM-DD'),
        pace_5k: S('ritmo 5K en m:ss por km'),
      },
    },
  },
  {
    name: 'log_weight',
    description: 'Registra el peso corporal de hoy.',
    parameters: { type: 'OBJECT', properties: { kg: { type: 'NUMBER', description: 'kg' } }, required: ['kg'] },
  },
]

type Args = Record<string, unknown>

function sessionById(id: unknown): Session {
  const s = getState().sessions.find((x) => x.id === id)
  if (!s) throw new Error(`No existe la sesión ${String(id)}`)
  return s
}

function exIndex(s: Session, exId: unknown): number {
  const i = s.exercises?.findIndex((b) => b.id === exId) ?? -1
  if (i < 0) throw new Error(`La sesión no tiene el ejercicio ${String(exId)}`)
  return i
}

function checkEx(id: unknown) {
  const st = getState()
  if (!allExercises(st).some((e) => e.id === id)) throw new Error(`Ejercicio desconocido: ${String(id)}`)
}

function thisWeekDate(date: unknown): string {
  const d = String(date)
  const today = todayIso()
  const start = weekStart(today)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < today || d > addDays(start, 6)) throw new Error(`Fecha fuera de esta semana o pasada: ${d}`)
  return d
}

/** Ejecuta una herramienta. Devuelve un texto corto para el usuario. */
function execute(name: string, a: Args): string {
  const st = getState()
  switch (name) {
    case 'move_session': {
      const s = sessionById(a.session_id)
      const d = thisWeekDate(a.date)
      actions.move(s.id, d)
      return `${s.title} → ${dayName(d)}`
    }
    case 'skip_session': {
      const s = sessionById(a.session_id)
      actions.skip(s.id)
      return `${s.title} del ${dayName(s.date)} saltada`
    }
    case 'add_event': {
      const d = String(a.date)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < weekStart(todayIso()) || d > addDays(weekStart(todayIso()), 6)) throw new Error('Fecha fuera de esta semana')
      const kind = a.kind as 'match' | 'basket' | 'run'
      actions.add(kind, d)
      return `${kind === 'match' ? 'Partido' : kind === 'basket' ? 'Entreno de basket' : 'Carrera'} añadido el ${dayName(d)}`
    }
    case 'swap_exercise': {
      const s = sessionById(a.session_id)
      checkEx(a.to_exercise_id)
      const i = exIndex(s, a.from_exercise_id)
      actions.swapExercise(s.id, i, String(a.to_exercise_id), a.scope === 'always' ? 'always' : 'session')
      return `${exDef(st, String(a.from_exercise_id)).name} → ${exDef(st, String(a.to_exercise_id)).name}${a.scope === 'always' ? ' (siempre)' : ' (hoy)'}`
    }
    case 'add_exercise': {
      const s = sessionById(a.session_id)
      checkEx(a.exercise_id)
      actions.addExercise(s.id, String(a.exercise_id), Math.min(6, Math.max(1, Number(a.sets) || 3)), a.scope === 'always' ? 'always' : 'session')
      return `Añadido ${exDef(st, String(a.exercise_id)).name}`
    }
    case 'remove_exercise': {
      const s = sessionById(a.session_id)
      const i = exIndex(s, a.exercise_id)
      actions.removeExercise(s.id, i, a.scope === 'always' ? 'always' : 'session')
      return `Quitado ${exDef(st, String(a.exercise_id)).name}${a.scope === 'always' ? ' de la rutina' : ' hoy'}`
    }
    case 'set_routine': {
      const t = String(a.routine) as GymTemplate
      if (!(t in st.templates)) throw new Error('Rutina desconocida')
      const items = (a.exercises as Args[]).map((e) => {
        checkEx(e.exercise_id)
        return {
          id: String(e.exercise_id),
          sets: Math.min(6, Math.max(1, Number(e.sets) || 3)),
          ...(e.rep_min ? { repMin: Number(e.rep_min) } : {}),
          ...(e.rep_max ? { repMax: Number(e.rep_max) } : {}),
        }
      })
      if (!items.length) throw new Error('La rutina no puede quedar vacía')
      const title = a.title ? String(a.title) : st.templates[t].title
      actions.setTemplate(t, { ...st.templates[t], title, items })
      return `Rutina «${title}» actualizada (${items.length} ejercicios)`
    }
    case 'create_exercise': {
      const load = (['kg', 'bw', 'bw+', 'plyo'].includes(String(a.load)) ? a.load : 'kg') as Load
      const group = String(a.group) in GROUPS ? String(a.group) : 'otro'
      const repMin = load === 'plyo' ? 3 : Number(a.rep_min) || 8
      const repMax = load === 'plyo' ? 3 : Math.max(repMin, Number(a.rep_max) || 12)
      const id = actions.createExercise({ name: String(a.name), group, load, repMin, repMax, inc: load === 'kg' ? 2.5 : load === 'bw+' ? 2.5 : 0 })
      return `id=${id} · Creado «${String(a.name)}»`
    }
    case 'set_week_mode': {
      const m = a.mode === 'reduced' || a.mode === 'boost' ? a.mode : 'normal'
      actions.setWeekMode(m)
      return m === 'reduced' ? 'Semana en modo suave' : m === 'boost' ? 'Semana con más carga' : 'Semana en modo normal'
    }
    case 'update_profile': {
      const patch: Partial<Profile> = {}
      const days = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map(Number).filter((n) => n >= 0 && n <= 6))].sort() : undefined)
      if (a.basket_days) patch.basketDays = days(a.basket_days)
      if (a.blocked_days) patch.blockedDays = days(a.blocked_days)
      if (a.weekend_game) {
        patch.weekendGame = a.weekend_game !== 'none'
        if (a.weekend_game === 'saturday') patch.gameDay = 5
        if (a.weekend_game === 'sunday') patch.gameDay = 6
      }
      if (a.gym_per_week) patch.gymPerWeek = Number(a.gym_per_week) >= 3 ? 3 : 2
      if (a.runs_per_week) patch.runsPerWeek = Math.min(3, Math.max(1, Number(a.runs_per_week))) as 1 | 2 | 3
      if (a.goal_weight_kg) patch.goalWeightKg = Number(a.goal_weight_kg)
      if (a.goal_date && /^\d{4}-\d{2}-\d{2}$/.test(String(a.goal_date))) patch.goalDate = String(a.goal_date)
      if (a.pace_5k) {
        const p = parseTime(String(a.pace_5k))
        if (p && p > 180 && p < 600) patch.pace5k = p
      }
      actions.setProfile(patch)
      return 'Plan reconfigurado'
    }
    case 'log_weight': {
      const kg = Number(a.kg)
      if (!(kg > 30 && kg < 250)) throw new Error('Peso no válido')
      actions.logWeight(kg)
      return `Peso registrado: ${fmtNum(kg)} kg`
    }
  }
  throw new Error(`Herramienta desconocida: ${name}`)
}

// ── Conversación ────────────────────────────────────────────────────────────

interface Part {
  text?: string
  thought?: boolean
  functionCall?: { name: string; args?: Args; id?: string }
  functionResponse?: unknown
  [k: string]: unknown
}
interface Content {
  role: 'user' | 'model'
  parts: Part[]
}

export async function askCoach(history: ChatMsg[], text: string): Promise<{ text: string; actions: string[] }> {
  const key = coachKey()
  const model = coachModel()
  if (!key || !model) throw new CoachError('Conecta el coach con tu clave de Gemini en Ajustes.')

  const contents: Content[] = history.slice(-14).map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
  contents.push({ role: 'user', parts: [{ text }] })
  const done: string[] = []

  for (let step = 0; step < 6; step++) {
    const res = await call(`models/${model}:generateContent`, key, {
      systemInstruction: { parts: [{ text: `${SYSTEM}\n\n${buildContext(getState())}` }] },
      contents,
      tools: [{ functionDeclarations: TOOLS }],
      generationConfig: { temperature: 0.4 },
    })
    const content: Content | undefined = res.candidates?.[0]?.content
    const parts = content?.parts ?? []
    const calls = parts.filter((p) => p.functionCall)
    if (!calls.length) {
      const out = parts
        .filter((p) => p.text && !p.thought)
        .map((p) => p.text)
        .join('')
        .trim()
      return { text: out || (done.length ? 'Hecho.' : 'No he sabido responder a eso. ¿Lo reformulas?'), actions: done }
    }
    contents.push({ role: 'model', parts }) // se devuelve tal cual (incluye firmas de razonamiento)
    const responses: Part[] = calls.map((p) => {
      const fc = p.functionCall!
      let response: Record<string, unknown>
      try {
        const msg = execute(fc.name, fc.args ?? {})
        done.push(msg.replace(/^id=\S+ · /, ''))
        response = { ok: true, result: msg }
      } catch (e) {
        response = { ok: false, error: (e as Error).message }
      }
      return { functionResponse: { name: fc.name, ...(fc.id ? { id: fc.id } : {}), response } }
    })
    // contexto actualizado tras las acciones (en la última respuesta)
    const last = responses[responses.length - 1].functionResponse as { response: Record<string, unknown> }
    last.response.updated_week = weekSessions(getState(), weekStart(todayIso())).map((s) => sessionLine(getState(), s)).join('\n')
    contents.push({ role: 'user', parts: responses })
  }
  return { text: done.length ? 'Hecho.' : 'Me he liado con demasiados pasos. ¿Lo intentamos más concreto?', actions: done }
}

export const isCoachError = (e: unknown): e is Error => e instanceof CoachError
