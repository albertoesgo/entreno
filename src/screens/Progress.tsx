import { useState } from 'react'
import type { Metric, State } from '../lib/types'
import { actions, useStore } from '../lib/store'
import { EXERCISES } from '../lib/program'
import { diffDays, monthName, todayIso } from '../lib/dates'
import { fmtNum, fmtPace, num } from '../lib/format'
import { LineChart } from '../components/LineChart'

function liftSeries(st: State, id: string): Metric[] {
  const out: Metric[] = []
  for (const s of st.sessions) {
    if (s.status !== 'done' || !s.exercises) continue
    for (const b of s.exercises) {
      if (b.id !== id) continue
      const best = Math.max(0, ...b.log.filter((l) => l.done && l.kg && l.reps).map((l) => l.kg! * (1 + l.reps! / 30)))
      if (best > 0) out.push({ date: s.date, value: Math.round(best) })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** kg/semana por regresión lineal de las últimas 4 semanas */
function weeklyTrend(data: Metric[]): number | null {
  const today = todayIso()
  const pts = data.filter((d) => diffDays(d.date, today) <= 28)
  if (pts.length < 3 || diffDays(pts[0].date, pts[pts.length - 1].date) < 10) return null
  const xs = pts.map((p) => diffDays(pts[0].date, p.date))
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = pts.reduce((a, p) => a + p.value, 0) / pts.length
  let n = 0
  let d = 0
  xs.forEach((x, i) => {
    n += (x - mx) * (pts[i].value - my)
    d += (x - mx) ** 2
  })
  return d ? (n / d) * 7 : null
}

export function Progress() {
  const st = useStore()
  const p = st.profile
  const today = todayIso()
  const totalDays = Math.max(1, diffDays(p.startDate, p.goalDate))
  const elapsed = Math.min(totalDays, Math.max(0, diffDays(p.startDate, today)))
  const weeksLeft = Math.max(0, Math.ceil(diffDays(today, p.goalDate) / 7))
  const currentKg = st.weights.at(-1)?.value ?? p.weightKg
  const trend = weeklyTrend(st.weights)
  const needed = weeksLeft ? (p.goalWeightKg - currentKg) / weeksLeft : 0

  let weightHint = `Proteína: ~${Math.round(p.goalWeightKg * 2)} g/día. Pésate 2–3 veces por semana en ayunas; la tendencia manda, no el día.`
  if (trend != null) {
    if (trend > -0.15 && needed < -0.1) weightHint = 'La bajada se ha frenado: quita ~150 kcal/día o suma 2.000 pasos diarios.'
    else if (trend < -0.9) weightHint = 'Bajas rápido: sube ~150 kcal/día para no perder músculo ni rendimiento.'
    else weightHint = 'Buen ritmo: entre 0,3 y 0,8 kg/semana mantienes fuerza mientras pierdes grasa.'
  }

  const weeks = Object.values(st.weeks)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(-8)

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Objetivo {monthName(p.goalDate)}</div>
          <h1>Progreso</h1>
        </div>
      </div>

      <div className="card">
        <div className="kpi">
          <div>
            <div className="eyebrow">Quedan</div>
            <div className="v" style={{ marginTop: 6 }}>
              {weeksLeft}
              <small>semanas</small>
            </div>
          </div>
          <span className="muted small">{Math.round((elapsed / totalDays) * 100)} % del camino</span>
        </div>
        <div className="progress-track">
          <div style={{ width: `${(elapsed / totalDays) * 100}%` }} />
        </div>
      </div>

      <MetricCard
        title="Peso"
        unit="kg"
        color="var(--gym)"
        data={st.weights}
        goal={p.goalWeightKg}
        value={fmtNum(currentKg)}
        trend={trend != null ? `${trend > 0 ? '+' : ''}${fmtNum(trend)} kg/sem` : null}
        hint={weightHint}
        onAdd={actions.logWeight}
        placeholder="Peso de hoy"
      />

      <MetricCard
        title="Ritmo 5K"
        unit="/km"
        color="var(--run)"
        data={st.paces}
        value={fmtPace(p.pace5k)}
        format={fmtPace}
        invert
        trend={st.paces.length > 1 ? `${fmtPace(st.paces[0].value)} → ${fmtPace(p.pace5k)}` : null}
        hint="Se actualiza con el test 5K de cada semana de descarga o si corres ≥4,5 km más rápido."
      />

      <div className="section">
        <div className="section-head">
          <span className="section-title">Fuerza · 1RM estimado</span>
        </div>
        <div className="lifts">
          {['squat', 'bench', 'rdl', 'incline'].map((id) => {
            const data = liftSeries(st, id)
            return (
              <div key={id} className="card lift">
                <div className="name">{EXERCISES[id].name}</div>
                <div className="v">{data.length ? `${data.at(-1)!.value} kg` : '—'}</div>
                {data.length > 1 && <LineChart data={data} color="var(--gym)" height={60} format={(v) => `${v}`} />}
              </div>
            )
          })}
        </div>
      </div>

      <MetricCard
        title="Salto vertical"
        unit="cm"
        color="var(--jump)"
        data={st.jumps}
        value={st.jumps.length ? fmtNum(st.jumps.at(-1)!.value) : '—'}
        trend={st.jumps.length > 1 ? `${st.jumps.at(-1)!.value - st.jumps[0].value >= 0 ? '+' : ''}${fmtNum(st.jumps.at(-1)!.value - st.jumps[0].value)} cm` : null}
        hint="Mídelo cada 4 semanas: marca con tiza tu alcance de pie y tu mejor salto con dos pies. La diferencia en cm."
        onAdd={actions.logJump}
        placeholder="Salto (cm)"
      />

      <div className="section">
        <div className="section-head">
          <span className="section-title">Constancia · últimas semanas</span>
        </div>
        <div className="card">
          {weeks.length ? (
            <div className="bars">
              {weeks.map((w) => {
                const c = w.compliance ?? 0
                return <div key={w.start} className={!w.closed ? '' : c >= 0.8 ? 'ok' : c >= 0.6 ? 'mid' : 'low'} style={{ height: `${Math.max(6, c * 100)}%` }} title={w.start} />
              })}
            </div>
          ) : (
            <div className="chart-empty">Aún no hay semanas</div>
          )}
          <div className="hint">Por encima del 60 % el plan sube de bloque; por debajo, repite para consolidar.</div>
        </div>
      </div>
    </>
  )
}

function MetricCard(props: {
  title: string
  unit: string
  color: string
  data: Metric[]
  value: string
  goal?: number
  trend?: string | null
  hint?: string
  format?: (v: number) => string
  invert?: boolean
  onAdd?: (v: number) => void
  placeholder?: string
}) {
  const [v, setV] = useState('')
  return (
    <div className="section">
      <div className="section-head">
        <span className="section-title">{props.title}</span>
        {props.trend && (
          <span className="trend" style={{ color: props.color }}>
            {props.trend}
          </span>
        )}
      </div>
      <div className="card">
        <div className="kpi">
          <div className="v">
            {props.value}
            <small>{props.unit}</small>
          </div>
          {props.goal != null && (
            <span className="muted small">
              objetivo {fmtNum(props.goal)} {props.unit}
            </span>
          )}
        </div>
        <LineChart data={props.data} color={props.color} goal={props.goal} format={props.format ?? ((x) => fmtNum(x))} invert={props.invert} />
        {props.onAdd && (
          <div className="inline-add">
            <input className="input" inputMode="decimal" placeholder={props.placeholder} value={v} onChange={(e) => setV(e.target.value)} />
            <button
              className="btn sm"
              disabled={num(v) == null}
              onClick={() => {
                props.onAdd!(num(v)!)
                setV('')
              }}
            >
              Guardar
            </button>
          </div>
        )}
        {props.hint && <div className="hint">{props.hint}</div>}
      </div>
    </div>
  )
}
