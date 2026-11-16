const pad = (n: number) => String(n).padStart(2, '0')

export function fmtPace(sec: number): string {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

export function fmtTime(sec: number): string {
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const x = s % 60
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`
}

/** "6:20" → 380 · "31:40" → 1900 · "1:02:10" → 3730 · "32" → 1920 (minutos) */
export function parseTime(t: string): number | null {
  const parts = t.trim().split(/[:.'’]/).filter(Boolean).map(Number)
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return null
  if (parts.length === 1) return parts[0] * 60
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

export function num(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export const fmtNum = (n: number, d = 1) => {
  const f = 10 ** d
  return String(Math.round(n * f) / f).replace('.', ',')
}
