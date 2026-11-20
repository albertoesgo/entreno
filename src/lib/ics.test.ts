import { describe, expect, it } from 'vitest'
import { isMatch, parseICS, DEFAULT_WORDS } from './ics'

// Los tests corren con TZ=Europe/Madrid (ver package.json)
const cal = (...events: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events.flatMap((e) => ['BEGIN:VEVENT', e.trim(), 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n')

describe('lector de calendarios (.ics)', () => {
  it('evento con zona horaria, lugar con comas escapadas y líneas plegadas', () => {
    const ics = cal(`UID:a1
DTSTART;TZID=Europe/Madrid:20261121T180000
SUMMARY:Partido vs CB Ejem
 plo
LOCATION:Pabellón Municipal\\, Málaga
BEGIN:VALARM
TRIGGER:-PT1H
DESCRIPTION:Recordatorio
END:VALARM`)
    expect(parseICS(ics, '2026-11-16', '2026-12-31')).toEqual([{ key: 'a1', date: '2026-11-21', time: '18:00', title: 'Partido vs CB Ejemplo', location: 'Pabellón Municipal, Málaga' }])
  })

  it('UTC (Z) se pasa a la hora local y otra zona se convierte', () => {
    const ics = cal('UID:z\nDTSTART:20261121T170000Z\nSUMMARY:Partido', 'UID:ny\nDTSTART;TZID=America/New_York:20261121T120000\nSUMMARY:Partido NY')
    const [a, b] = parseICS(ics, '2026-11-16', '2026-12-31')
    expect(a.time).toBe('18:00')
    expect(b.time).toBe('18:00')
  })

  it('día completo, cancelados y fuera de rango', () => {
    const ics = cal(
      'UID:d\nDTSTART;VALUE=DATE:20261122\nSUMMARY:Torneo',
      'UID:c\nDTSTART:20261123T190000\nSTATUS:CANCELLED\nSUMMARY:Partido',
      'UID:o\nDTSTART:20270301T190000\nSUMMARY:Partido',
    )
    const out = parseICS(ics, '2026-11-16', '2026-12-31')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ date: '2026-11-22', time: undefined, title: 'Torneo' })
  })

  it('repeticiones semanales con excepción y una ocurrencia movida', () => {
    const ics = cal(
      'UID:liga\nDTSTART;TZID=Europe/Madrid:20261121T100000\nRRULE:FREQ=WEEKLY;COUNT=4\nEXDATE;TZID=Europe/Madrid:20261128T100000\nSUMMARY:Partido de liga',
      'UID:liga\nRECURRENCE-ID;TZID=Europe/Madrid:20261205T100000\nDTSTART;TZID=Europe/Madrid:20261206T120000\nSUMMARY:Partido de liga (aplazado)',
    )
    const out = parseICS(ics, '2026-11-16', '2026-12-31')
    expect(out.map((e) => `${e.date} ${e.time} ${e.key}`)).toEqual([
      '2026-11-21 10:00 liga@2026-11-21',
      '2026-12-06 12:00 liga@2026-12-05',
      '2026-12-12 10:00 liga@2026-12-12',
    ])
  })

  it('reconoce partidos por palabras clave sin falsos positivos', () => {
    const ev = (title: string) => ({ key: title, date: '2026-11-21', title })
    expect(isMatch(ev('Jornada 7: CB A - CB B'), DEFAULT_WORDS, false)).toBe(true)
    expect(isMatch(ev('CB Málaga vs. Unicaja'), DEFAULT_WORDS, false)).toBe(true)
    expect(isMatch(ev('PARTIDO amistoso'), DEFAULT_WORDS, false)).toBe(true)
    expect(isMatch(ev('Entreno'), DEFAULT_WORDS, false)).toBe(false)
    expect(isMatch(ev('Cena con vsco'), DEFAULT_WORDS, false)).toBe(false)
    expect(isMatch(ev('Entreno'), DEFAULT_WORDS, true)).toBe(true)
  })
})
