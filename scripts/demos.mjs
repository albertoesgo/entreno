// Genera public/demos.json: índice ligero de free-exercise-db (dominio público)
// para buscar una demostración para tus ejercicios propios. Se descarga en la app
// solo cuando abres ese buscador.
//   node scripts/demos.mjs
import { writeFileSync } from 'node:fs'

const REV = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5'
const MUSCLE = {
  abdominals: 'abdomen', abductors: 'abductores', adductors: 'aductores', biceps: 'bíceps', calves: 'gemelo',
  chest: 'pecho', forearms: 'antebrazo', glutes: 'glúteo', hamstrings: 'isquios', lats: 'dorsal',
  'lower back': 'lumbar', 'middle back': 'espalda media', neck: 'cuello', quadriceps: 'cuádriceps',
  shoulders: 'hombro', traps: 'trapecio', triceps: 'tríceps',
}
const EQUIP = {
  barbell: 'barra', dumbbell: 'mancuernas', cable: 'polea', machine: 'máquina', 'body only': 'peso corporal',
  kettlebells: 'kettlebell', bands: 'goma', 'e-z curl bar': 'barra Z', 'medicine ball': 'balón medicinal',
  'exercise ball': 'fitball', 'foam roll': 'rodillo', other: '',
}

const res = await fetch(`https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${REV}/dist/exercises.json`)
const all = await res.json()
const out = all
  .filter((e) => e.images?.length >= 2 && e.category !== 'stretching')
  .map((e) => [e.id, e.name, MUSCLE[e.primaryMuscles[0]] ?? '', EQUIP[e.equipment] ?? ''])
writeFileSync(new URL('../public/demos.json', import.meta.url), JSON.stringify(out))
console.log(`${out.length} demostraciones`)
