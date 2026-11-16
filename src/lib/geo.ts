export interface Place {
  lat: number
  lng: number
  radius: number // metros
}

export interface Position {
  lat: number
  lng: number
  acc: number
}

/** Distancia en metros (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function currentPosition(timeout = 10_000): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Sin geolocalización'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout, maximumAge: 60_000 },
    )
  })
}

/** ¿Estás dentro del radio? Tolera la imprecisión del GPS (hasta 100 m extra). */
export const isInside = (pos: Position, place: Place) => distanceM(pos, place) <= place.radius + Math.min(pos.acc, 100)
