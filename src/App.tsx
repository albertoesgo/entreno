import { useEffect, useState } from 'react'
import { actions, getState, gymSessionFor, useStore } from './lib/store'
import { currentPosition, isInside } from './lib/geo'
import { todayIso } from './lib/dates'
import { Today } from './screens/Today'
import { Week } from './screens/Week'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'
import { Onboarding } from './screens/Onboarding'
import { SessionView } from './screens/SessionView'
import { Coach } from './screens/Coach'
import { IProgress, ISettings, ISpark, IToday, IWeek } from './components/Icons'

type Tab = 'hoy' | 'semana' | 'coach' | 'progreso' | 'ajustes'

const TABS: { id: Tab; label: string; icon: () => React.JSX.Element }[] = [
  { id: 'hoy', label: 'Hoy', icon: IToday },
  { id: 'semana', label: 'Semana', icon: IWeek },
  { id: 'coach', label: 'Coach', icon: ISpark },
  { id: 'progreso', label: 'Progreso', icon: IProgress },
  { id: 'ajustes', label: 'Ajustes', icon: ISettings },
]

export default function App() {
  const st = useStore()
  const [tab, setTab] = useState<Tab>('hoy')
  const [open, setOpen] = useState<string | null>(null)
  const [atGym, setAtGym] = useState(false)
  const [draft, setDraft] = useState<string | undefined>()

  // Replanifica al abrir y cada vez que vuelves a la app (o cambia el día)
  useEffect(() => {
    let last = todayIso()

    // Si estás en tu gimnasio, abre directamente la rutina de hoy (una vez al día)
    const checkGym = async () => {
      const p = getState().profile
      if (!p.onboarded || !p.gym || !p.gymDetect) return
      try {
        const near = isInside(await currentPosition(), p.gym)
        setAtGym(near)
        if (!near) return
        const today = todayIso()
        const hit = gymSessionFor(getState(), today)
        const key = `entreno.gymOpened.${today}`
        let seen = false
        try {
          seen = !!localStorage.getItem(key)
          localStorage.setItem(key, '1')
        } catch {
          /* ignorar */
        }
        if (hit?.isToday && !seen) {
          setTab('hoy')
          setOpen(hit.session.id)
        }
      } catch {
        setAtGym(false)
      }
    }

    actions.sync()
    checkGym()
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      last = todayIso()
      actions.sync()
      checkGym()
    }
    const timer = setInterval(() => {
      if (todayIso() !== last) onVis()
    }, 60_000)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (!st.profile.onboarded) return <Onboarding />

  return (
    <>
      <main className={`app ${tab === 'coach' ? 'app-coach' : ''}`}>
        {tab === 'hoy' && <Today open={setOpen} goWeek={() => setTab('semana')} atGym={atGym} ask={(q) => (setDraft(q), setTab('coach'))} />}
        {tab === 'semana' && <Week open={setOpen} />}
        {tab === 'coach' && <Coach draft={draft} clearDraft={() => setDraft(undefined)} />}
        {tab === 'progreso' && <Progress />}
        {tab === 'ajustes' && <Settings />}
      </main>

      <nav className="nav">
        <div>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              <Icon />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {open && <SessionView key={open} id={open} onClose={() => setOpen(null)} />}
    </>
  )
}
