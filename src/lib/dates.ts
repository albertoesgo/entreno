const pad = (n: number) => String(n).padStart(2, '0')

export const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const DAY_NAME = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const MONTH_NAME = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayIso = () => iso(new Date())

export function addDays(s: string, n: number): string {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

/** 0 = lunes … 6 = domingo */
export const weekday = (s: string) => (parse(s).getDay() + 6) % 7

export const weekStart = (s: string) => addDays(s, -weekday(s))

/** días de a → b */
export const diffDays = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000)

export const monthName = (s: string) => MONTH_NAME[parse(s).getMonth()]

export const dayName = (s: string) => DAY_NAME[weekday(s)].toLowerCase()

export function fmtDay(s: string): string {
  const d = parse(s)
  return `${DAY_NAME[weekday(s)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function fmtShort(s: string): string {
  const d = parse(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function fmtRange(start: string): string {
  const a = parse(start)
  const b = parse(addDays(start, 6))
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`
}
