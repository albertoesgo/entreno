import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Profile } from '../lib/types'
import { DAY_SHORT } from '../lib/dates'
import { fmtNum, fmtPace, num, parseTime } from '../lib/format'

export function ProfileForm({ initial, submitLabel, onSubmit, extra }: {
  initial: Profile
  submitLabel: string
  onSubmit: (p: Partial<Profile>) => void
  extra?: ReactNode
}) {
  const [age, setAge] = useState(String(initial.age))
  const [height, setHeight] = useState(String(initial.heightCm))
  const [weight, setWeight] = useState(fmtNum(initial.weightKg))
  const [goalW, setGoalW] = useState(fmtNum(initial.goalWeightKg))
  const [goalDate, setGoalDate] = useState(initial.goalDate)
  const [pace, setPace] = useState(fmtPace(initial.pace5k))
  const [days, setDays] = useState<number[]>(initial.basketDays)
  const [weekendGame, setWeekendGame] = useState(initial.weekendGame)
  const [gameDay, setGameDay] = useState(initial.gameDay)
  const [gym, setGym] = useState(initial.gymPerWeek)
  const [runs, setRuns] = useState(initial.runsPerWeek)

  const paceN = parseTime(pace)
  const valid = num(weight) && num(goalW) && paceN && paceN > 180 && paceN < 600

  const c = (v: string) => ({ '--c': v }) as CSSProperties

  return (
    <div className="form">
      <div className="form-group">
        <div className="eyebrow">Tú</div>
        <div className="grid3">
          <label className="field">
            <span>Edad</span>
            <input className="input" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
          </label>
          <label className="field">
            <span>Altura cm</span>
            <input className="input" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
          <label className="field">
            <span>Peso kg</span>
            <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="form-group">
        <div className="eyebrow">Objetivo</div>
        <div className="grid2">
          <label className="field">
            <span>Peso objetivo</span>
            <input className="input" inputMode="decimal" value={goalW} onChange={(e) => setGoalW(e.target.value)} />
          </label>
          <label className="field">
            <span>Fecha</span>
            <input className="input" type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="form-group">
        <div className="eyebrow" style={{ color: 'var(--basket)' }}>Basket</div>
        <div className="field">
          <span>Días de entreno</span>
          <div className="seg" style={c('var(--basket)')}>
            {DAY_SHORT.map((l, i) => (
              <button
                key={l}
                className={days.includes(i) ? 'on' : ''}
                onClick={() => setDays(days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort())}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Partido el fin de semana</span>
          <div className="seg" style={c('var(--match)')}>
            <button className={!weekendGame ? 'on' : ''} onClick={() => setWeekendGame(false)}>
              No suele
            </button>
            <button className={weekendGame && gameDay === 5 ? 'on' : ''} onClick={() => (setWeekendGame(true), setGameDay(5))}>
              Sábado
            </button>
            <button className={weekendGame && gameDay === 6 ? 'on' : ''} onClick={() => (setWeekendGame(true), setGameDay(6))}>
              Domingo
            </button>
          </div>
        </div>
      </div>

      <div className="form-group">
        <div className="eyebrow" style={{ color: 'var(--gym)' }}>Gimnasio</div>
        <div className="field">
          <span>Días por semana</span>
          <div className="seg" style={c('var(--gym)')}>
            {([2, 3] as const).map((n) => (
              <button key={n} className={gym === n ? 'on' : ''} onClick={() => setGym(n)}>
                {n} días
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="form-group">
        <div className="eyebrow" style={{ color: 'var(--run)' }}>Carrera</div>
        <div className="grid2">
          <div className="field">
            <span>Salidas / semana</span>
            <div className="seg" style={c('var(--run)')}>
              {([1, 2, 3] as const).map((n) => (
                <button key={n} className={runs === n ? 'on' : ''} onClick={() => setRuns(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Ritmo 5K (min/km)</span>
            <input className="input" inputMode="text" value={pace} onChange={(e) => setPace(e.target.value)} />
          </label>
        </div>
      </div>

      {extra}

      <button
        className="btn"
        disabled={!valid}
        onClick={() =>
          onSubmit({
            age: num(age) ?? initial.age,
            heightCm: num(height) ?? initial.heightCm,
            weightKg: num(weight)!,
            goalWeightKg: num(goalW)!,
            goalDate,
            pace5k: paceN!,
            basketDays: days,
            weekendGame,
            gameDay,
            gymPerWeek: gym,
            runsPerWeek: runs,
          })
        }
      >
        {submitLabel}
      </button>
    </div>
  )
}
