import { useState } from 'react'
import { actions, useStore } from '../lib/store'
import { ProfileForm } from '../components/ProfileForm'
import { num } from '../lib/format'

export function Onboarding() {
  const st = useStore()
  const [ran, setRan] = useState(false)
  const [km, setKm] = useState('5')

  return (
    <div className="app" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
      <div className="head" style={{ marginBottom: 8 }}>
        <div>
          <div className="eyebrow">Entreno</div>
          <h1>Montemos tu plan</h1>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 26 }}>
        Basket, gimnasio y carrera en una sola semana. Si algo cambia, el plan se reajusta solo. Revisa los datos y ajusta lo que no cuadre.
      </p>

      <ProfileForm
        initial={st.profile}
        submitLabel="Crear mi plan"
        onSubmit={(p) => {
          const k = num(km)
          actions.onboard(p, ran && k ? { km: k, timeSec: Math.round(k * (p.pace5k ?? st.profile.pace5k)) } : undefined)
        }}
        extra={
          <div className="form-group">
            <div className="eyebrow">Hoy</div>
            <div className="toggle">
              <span>Ya he salido a correr hoy</span>
              <div className="seg" style={{ '--c': 'var(--run)' } as React.CSSProperties}>
                <button className={!ran ? 'on' : ''} onClick={() => setRan(false)}>
                  No
                </button>
                <button className={ran ? 'on' : ''} onClick={() => setRan(true)}>
                  Sí
                </button>
              </div>
            </div>
            {ran && (
              <label className="field">
                <span>Kilómetros (al ritmo de arriba)</span>
                <input className="input" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} />
              </label>
            )}
          </div>
        }
      />
    </div>
  )
}
