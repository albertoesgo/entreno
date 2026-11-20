import type { CSSProperties } from 'react'
import type { Kind, Session } from '../lib/types'
import { fmtPace } from '../lib/format'
import { fmtNum } from '../lib/format'
import { ICheck } from './Icons'

export const KIND: Record<Kind, { label: string; color: string }> = {
  gym: { label: 'Gimnasio', color: 'var(--gym)' },
  run: { label: 'Carrera', color: 'var(--run)' },
  basket: { label: 'Basket', color: 'var(--basket)' },
  match: { label: 'Partido', color: 'var(--match)' },
}

export const accent = (k: Kind) => ({ '--c': KIND[k].color }) as CSSProperties

export function summary(s: Session): string {
  if (s.kind === 'gym') {
    const n = s.exercises?.length ?? 0
    if (s.status === 'done') {
      const sets = s.exercises?.reduce((a, b) => a + b.log.filter((l) => l.done).length, 0) ?? 0
      return `${sets} series${s.rpe ? ` · RPE ${s.rpe}` : ''}`
    }
    return `${n} ejercicios · ~${s.minutes}'`
  }
  if (s.kind === 'run') {
    const km = s.runLog?.distanceKm
    const t = s.runLog?.timeSec
    if (km && t) return `${fmtNum(km, 2)} km · ${fmtPace(t / km)} /km`
    if (s.run?.targetPace) return `${s.run.type === 'easy' ? 'suave ' : ''}${fmtPace(s.run.targetPace)} /km · ~${s.minutes}'`
    return s.run?.detail ?? ''
  }
  if (s.note) return s.note
  if (s.assumed) return `${s.minutes}' · sin registrar`
  return `${s.minutes}'${s.rpe ? ` · RPE ${s.rpe}` : ''}`
}

const STATUS: Partial<Record<Session['status'], string>> = { missed: 'No hecho', skipped: 'Saltado' }

export function SessionCard({ s, onOpen, size = 'md' }: { s: Session; onOpen: (id: string) => void; size?: 'sm' | 'md' | 'big' }) {
  return (
    <button className={`session ${s.status} ${size}`} style={accent(s.kind)} onClick={() => onOpen(s.id)}>
      <div className="session-top">
        <span className="tag">{KIND[s.kind].label}</span>
        {s.status === 'done' && (
          <span className="check-badge">
            <ICheck />
          </span>
        )}
        {STATUS[s.status] && <span className="status">{STATUS[s.status]}</span>}
        {s.status === 'planned' && s.movedFrom && <span className="status">Recolocada</span>}
      </div>
      <div className="session-title">{s.title}</div>
      <div className="session-meta">{summary(s)}</div>
    </button>
  )
}
