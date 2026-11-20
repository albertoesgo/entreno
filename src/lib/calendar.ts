// Sincronización del calendario de partidos (.ics).
// iCloud no deja que otra web lea el calendario directamente (CORS), así que la
// petición pasa por un Worker mínimo de Cloudflare (carpeta worker/) que solo
// reenvía el .ics; no guarda nada.

import { actions, getState } from './store'
import { isMatch, parseICS, type CalEvent } from './ics'
import { addDays, todayIso, weekStart } from './dates'

export const CAL_PROXY: string = import.meta.env.VITE_CAL_PROXY || 'https://entreno-cal.albertoesgo76.workers.dev'

/** webcal://… → https://… */
export const normalizeCalUrl = (u: string) => u.trim().replace(/^webcals?:\/\//i, 'https://')

export const looksLikeCalUrl = (u: string) => /^(webcals?|https?):\/\/[^\s/]+\.[^\s/]+\/\S*$/i.test(u.trim())

/** Descarga el calendario y devuelve los eventos de esta semana y las próximas 10. */
export async function fetchEvents(url: string): Promise<CalEvent[]> {
  let res: Response
  try {
    res = await fetch(`${CAL_PROXY}/?url=${encodeURIComponent(normalizeCalUrl(url))}`, { signal: AbortSignal.timeout(20_000) })
  } catch {
    throw new Error('Sin conexión: lo intento la próxima vez que abras la app.')
  }
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Error ${res.status}`)
  const today = todayIso()
  return parseICS(await res.text(), weekStart(today), addDays(today, 70))
}

let running: Promise<void> | null = null

/** Sincroniza al abrir la app (como mucho una vez cada 30 min) o cuando se fuerza. */
export function syncCalendar(force = false): Promise<void> {
  const c = getState().calendar
  if (!c || !getState().profile.onboarded) return Promise.resolve()
  if (!force && c.lastSync && Date.now() - Date.parse(c.lastSync) < 30 * 60_000) return Promise.resolve()
  running ??= (async () => {
    try {
      const events = await fetchEvents(c.url)
      const now = getState().calendar
      if (now) actions.applyCalendar(events.filter((e) => isMatch(e, now.words, now.all)))
    } catch (e) {
      actions.calendarError((e as Error).message)
    } finally {
      running = null
    }
  })()
  return running
}
