// Puente mínimo para leer un calendario .ics desde la app (iCloud no permite CORS).
// Solo reenvía calendarios: comprueba el origen, que el destino sea HTTPS público
// y que la respuesta sea un VCALENDAR. No guarda ni registra nada.
//   cd worker && npx wrangler deploy

const ORIGIN = /^(https:\/\/albertoesgo\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/
const MAX = 3_000_000

export default {
  async fetch(req) {
    const origin = req.headers.get('Origin') ?? ''
    const cors = ORIGIN.test(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : null
    const reply = (body, status, extra = {}) => new Response(body, { status, headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8', ...extra } })

    if (!cors) return new Response('Origen no permitido', { status: 403 })
    if (req.method === 'OPTIONS') return reply(null, 204, { 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' })
    if (req.method !== 'GET') return reply('Método no permitido', 405)

    let target
    try {
      target = new URL((new URL(req.url).searchParams.get('url') ?? '').trim().replace(/^webcals?:\/\//i, 'https://'))
    } catch {
      return reply('El enlace no es válido.', 400)
    }
    const host = target.hostname
    if (target.protocol !== 'https:' || host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.'))
      return reply('El enlace tiene que ser una dirección webcal:// o https:// pública.', 400)

    let res
    try {
      res = await fetch(target, { headers: { Accept: 'text/calendar, */*', 'User-Agent': 'EntrenoCalendar/1.0' }, redirect: 'follow', cf: { cacheTtl: 300 } })
    } catch {
      return reply('No he podido conectar con ese calendario.', 502)
    }
    if (res.status === 404 || res.status === 403) return reply('Ese calendario no existe o ya no es público. Revisa el enlace.', 404)
    if (!res.ok) return reply(`El servidor del calendario respondió ${res.status}.`, 502)
    const text = await res.text()
    if (text.length > MAX) return reply('El calendario es demasiado grande.', 413)
    if (!text.trimStart().startsWith('BEGIN:VCALENDAR')) return reply('Ese enlace no es un calendario (.ics).', 422)
    return reply(text, 200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' })
  },
}
