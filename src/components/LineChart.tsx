import type { Metric } from '../lib/types'
import { diffDays } from '../lib/dates'

interface Props {
  data: Metric[]
  color: string
  goal?: number
  height?: number
  format?: (v: number) => string
  invert?: boolean // menor = mejor (ritmo): se dibuja hacia arriba
}

export function LineChart({ data, color, goal, height = 120, format = String, invert }: Props) {
  if (data.length < 2) return <div className="chart-empty">Necesito al menos dos registros</div>
  const W = 320
  const H = height
  const pad = { t: 10, b: 18, l: 2, r: 36 }
  const t0 = data[0].date
  const span = Math.max(1, diffDays(t0, data[data.length - 1].date))
  const vals = data.map((d) => d.value)
  if (goal != null) vals.push(goal)
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (hi - lo < 1e-6) {
    lo -= 1
    hi += 1
  }
  const m = (hi - lo) * 0.12
  lo -= m
  hi += m
  const x = (date: string) => pad.l + (diffDays(t0, date) / span) * (W - pad.l - pad.r)
  const y = (v: number) => {
    const k = (v - lo) / (hi - lo)
    return pad.t + (invert ? k : 1 - k) * (H - pad.t - pad.b)
  }
  const pts = data.map((d) => [x(d.date), y(d.value)] as const)
  const path = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ')
  const area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${H - pad.b} L${pts[0][0].toFixed(1)},${H - pad.b} Z`
  const last = pts[pts.length - 1]
  const id = `g${color.replace(/[^a-z]/gi, '')}`

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--line)" />
      {goal != null && (
        <>
          <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--mut)" strokeDasharray="3 4" strokeWidth="1" />
          <text x={W - pad.r + 6} y={y(goal) + 4} fill="var(--mut)" fontSize="11" fontWeight="600">
            {format(goal)}
          </text>
        </>
      )}
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} />
      <text x={W - pad.r + 6} y={last[1] + 4} fill="var(--tx)" fontSize="11" fontWeight="700">
        {format(data[data.length - 1].value)}
      </text>
    </svg>
  )
}
