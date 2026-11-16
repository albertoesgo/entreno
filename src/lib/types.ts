export type Kind = 'gym' | 'run' | 'basket' | 'match'
export type Status = 'planned' | 'done' | 'missed' | 'skipped'
export type GymTemplate = 'A' | 'B' | 'C'
export type RunTemplate = 'quality' | 'easy' | 'long' | 'free'
export type Template = GymTemplate | RunTemplate

export interface SetLog {
  kg: number | null
  reps: number | null
  done: boolean
}

export interface ExerciseBlock {
  id: string
  sets: number
  baseSets?: number // series antes de descarga/modo suave
  repMin: number
  repMax: number
  targetKg: number | null // null = calibrar (primera vez)
  targetReps: number
  deload?: boolean
  log: SetLog[]
}

export interface RunPlan {
  type: 'easy' | 'intervals' | 'tempo' | 'test' | 'free'
  title: string
  detail: string
  targetPace: number // s/km
}

export interface RunLog {
  distanceKm?: number
  timeSec?: number
}

export interface Session {
  id: string
  date: string // YYYY-MM-DD
  kind: Kind
  template?: Template
  title: string
  status: Status
  minutes: number
  fixed?: boolean // basket / partido
  auto?: boolean // generado desde el perfil
  manual?: boolean // añadido a mano
  pinned?: boolean // movido a mano: el planificador no lo toca
  assumed?: boolean // basket pasado sin marcar: se asume hecho
  avoid?: string // fecha a evitar al recolocar ("hoy no puedo")
  movedFrom?: string
  noRoomNoted?: boolean
  exercises?: ExerciseBlock[]
  customized?: boolean // ejercicios cambiados solo para esta sesión
  run?: RunPlan
  runLog?: RunLog
  rpe?: number
  note?: string
}

export interface Profile {
  onboarded: boolean
  age: number
  heightCm: number
  weightKg: number
  goalWeightKg: number
  goalDate: string
  startDate: string
  pace5k: number // s/km
  basketDays: number[] // 0 = lunes
  weekendGame: boolean
  gameDay: number // 5 sábado, 6 domingo
  gymPerWeek: 2 | 3
  runsPerWeek: 1 | 2 | 3
  gym: { lat: number; lng: number; radius: number } | null
  gymDetect: boolean
  blockedDays: number[] // días sin gym ni carrera
}

export interface Change {
  date: string
  text: string
}

export interface WeekMeta {
  start: string
  block: 1 | 2 | 3 | 4
  cycle: number
  reduced?: boolean
  boost?: boolean
  fatigue?: number
  checkin?: boolean
  compliance?: number
  closed?: boolean
  changes: Change[]
}

export interface Metric {
  date: string
  value: number
}

export type Load = 'kg' | 'bw+' | 'bw' | 'plyo'

export interface ExerciseDef {
  id: string
  name: string
  group: string
  repMin: number
  repMax: number
  inc: number // kg a subir al completar el rango
  load: Load
  cue?: string
  custom?: boolean
}

export interface TemplateItem {
  id: string
  sets: number
  repMin?: number
  repMax?: number
  maxSets?: number
}

export interface GymTemplateDef {
  title: string
  focus: string
  items: TemplateItem[]
}

export interface ChatMsg {
  role: 'user' | 'model'
  text: string
  actions?: string[]
  at: string
}

export interface State {
  v: 1
  profile: Profile
  templates: Record<GymTemplate, GymTemplateDef>
  custom: Record<string, ExerciseDef>
  chat: ChatMsg[]
  sessions: Session[]
  weeks: Record<string, WeekMeta>
  weights: Metric[]
  jumps: Metric[]
  paces: Metric[]
}
