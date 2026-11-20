# Entreno · Especificaciones

PWA personal para organizar **basket, gimnasio y carrera** en una sola semana, con un plan que se **reajusta solo** cuando la semana cambia (partido imprevisto, sesión que no haces, cansancio).

---

## 1. Qué es y con qué está hecha

| | |
|---|---|
| Tipo | Progressive Web App instalable (iPhone: Safari → Compartir → *Añadir a pantalla de inicio*) |
| Stack | React 19 + TypeScript + Vite · `vite-plugin-pwa` (service worker de Workbox) |
| Funciona sin conexión | Sí. Todo el código queda cacheado tras la primera visita |
| Servidor / backend | Ninguno. Es una web estática en GitHub Pages |
| IA | El plan lo hace un motor de reglas determinista (gratis, sin conexión). Encima, un **coach opcional con Gemini** (tu propia clave gratuita) que conversa y ejecuta cambios en la app (§10) |
| Publicación | Cada push a `main` → GitHub Action → tests → build → GitHub Pages |

---

## 2. Datos: dónde viven y qué sale del móvil

- **Todo se guarda en el propio dispositivo** (`localStorage`, clave `entreno.v1`). No hay cuentas, servidor, analítica ni cookies de terceros.
- **Nada sale del móvil.** La app no hace peticiones de red con tus datos; solo descarga su propio código y, cuando abres la ficha de un ejercicio, sus dos fotos de demostración (desde jsDelivr, sin datos tuyos).
- **Ubicación:** solo se lee si guardas tu gimnasio y activas *Detectar al abrir la app*. Se consulta **una vez al abrir la app** (nunca en segundo plano) y se compara en el propio móvil con la ubicación guardada.
- **Coach IA (opcional):** solo si lo conectas. La clave de Gemini se guarda aparte (`entreno.gemini.key`), nunca se exporta. Al escribirle, se envía a Google un resumen de tu perfil, la semana actual, las 3 últimas semanas, tus rutinas y tus últimos pesos. En el nivel gratuito Google puede usarlo para mejorar sus modelos.
- **Copia de seguridad:** *Ajustes → Exportar* descarga un `.json` con todo; *Importar* lo restaura (sirve también para pasar los datos a otro móvil).
- **Borrar:** *Ajustes → Borrar todo*. Borrar los datos de Safari o desinstalar la app también los borra: exporta de vez en cuando.

### Qué se guarda

| Dato | Origen |
|---|---|
| Perfil: edad, altura, peso, objetivo, fecha, ritmo 5K, días de basket, partido del finde, días de gym y salidas a correr | Lo introduces tú (primera pantalla y Ajustes) |
| Sesiones: fecha, tipo, estado, series (kg/reps), carrera (km/tiempo), duración, RPE | Las genera el plan; los registros los pones tú |
| Semanas: bloque, ciclo, cumplimiento, cansancio, lista de reajustes | Las calcula el motor |
| Historial de peso, ritmo 5K y salto vertical | Tus registros (el ritmo también se actualiza solo, ver §7) |
| Ubicación del gimnasio (lat/lng, radio 150 m) | Botón en Ajustes, estando en el gimnasio |

---

## 3. De dónde sale cada cosa del plan

| Elemento | De dónde sale |
|---|---|
| Entrenos de basket | Días marcados en el perfil (fijos cada semana) |
| Partido del finde | Perfil (sábado, domingo o ninguno) |
| Partido o entreno entre semana | Lo añades tú en *Semana → Añadir*. Si cae en día de entreno, lo sustituye |
| Sesiones de gym | Plantillas A/B/C (§6), colocadas por el motor (§4) |
| Carreras | Calidad + rodaje(s), colocadas por el motor; ritmos según tu 5K (§7) |
| Pesos y reps objetivo | Tu último registro de ese ejercicio (doble progresión, §6) |
| Ritmos objetivo | Tu ritmo de 5K actual ± desplazamientos fijos (§7) |
| Bloque de la semana | Cumplimiento de la semana anterior (§5) |
| Semana más suave | Check-in de cansancio ≥ 4, o vuelta tras un parón (§5) |

---

## 4. Cómo trabaja el motor (`src/lib/engine.ts`)

Se ejecuta **cada vez que abres la app**, al volver a ella, al cambiar de día y tras cualquier cambio (mover, saltar, añadir partido, guardar ajustes).

1. **Cierra semanas pasadas.** Lo planificado y no hecho queda como *No hecho*; el basket sin marcar se **asume hecho** (para no contar carga de menos).
2. **Decide el bloque** de la semana nueva (§5).
3. **Marca lo de días pasados** de esta semana: gym/carrera sin registrar → *No hecho*.
4. **Retira lo planificado a futuro** que el motor puede mover. Respeta lo que has movido a mano, lo ya empezado y lo añadido por ti.
5. **Vuelve a colocar** las sesiones que faltan, **incluidas las no hechas de esta semana**, por prioridad:
   `Pierna + Salto` → `Calidad (series/tempo)` → `Torso · Fuerza` → `Torso · Estética` → `Rodaje` → `Rodaje largo`.
   Cada una va al día (desde hoy hasta el domingo) con **menor coste de fatiga**. Si ningún día baja de 100, esa sesión **sale de la semana** para no sobrecargarte.
6. **Recalcula objetivos** (pesos, reps, ritmos) de lo que aún no has empezado.
7. **Explica cada cambio** en *Hoy → Reajustes de la semana* (p. ej. «Pierna + Salto: miércoles → domingo para cuadrar la carga»).

Para que el plan sea **estable**, moverse de su día actual cuesta +6: solo cambia si hay un motivo real.

### Tabla de costes (≥ 100 = prohibido)

Base: **+100 en tus días bloqueados** (Ajustes → Disponibilidad) · **+6 por cada sesión** que ya haya ese día · **+100** si ya hay 2 sesiones de gym/carrera · **+25** si ocupar ese día deja la semana **sin ningún día libre**.

| Sesión | Penalizaciones principales |
|---|---|
| **Pierna + Salto** | Mismo día que basket/partido +100 · otro gym o series el mismo día +100 · rodaje el mismo día +30 · **día antes de partido +80** · día antes de entreno +30 · día después de partido +40 · series el día antes o después +25 |
| **Torso (B y C)** | Otro gym el mismo día +100 · mismo día que partido +30 / que entreno +12 · series el mismo día +15 · otro torso el día antes o después +10 |
| **Calidad (series/tempo)** | Otra carrera, pierna o partido el mismo día +100 · entreno el mismo día +70 · torso el mismo día +15 · día antes de partido +45 / de entreno +15 · día antes de pierna +20 · día después de partido +30 / de entreno +10 / de pierna +30 |
| **Rodajes** | Otra carrera el mismo día +100 · mismo día que partido +60 / que entreno +35 · pierna el mismo día +40 · torso +8 · día antes de partido +20 · (largo) junto a series +10 |

El motor también mira el **domingo anterior** y el **lunes siguiente** para no encadenar cargas entre semanas.

---

## 5. Periodización: bloques de 4 semanas

| Bloque | Nombre | Gym | Carrera de calidad |
|---|---|---|---|
| 1 | Base | Normal | Series de 400 m |
| 2 | Carga | Normal | Tempo |
| 3 | Pico | Normal | Series de 1 km |
| 4 | Descarga | Series ×0,6 (mín. 2) · peso ×0,9 | **Test 5K** |

- **Avance:** si la semana anterior cumpliste **≥ 60 %** pasas al siguiente bloque; si no, **se repite el bloque**. Tras la descarga empieza un **ciclo nuevo** (sube el escalón de volumen).
- **Cumplimiento** = sesiones de gym y carrera del plan hechas ÷ total planificadas (las saltadas cuentan como no hechas; lo que añades a mano y el basket no cuentan).
- **Vuelta tras un parón** (≥ 2 semanas sin abrir la app): vuelves al bloque 1 en modo suave.
- **Check-in semanal** (*Hoy*): cansancio 1–5 y peso. Con **4 o 5**, esa semana va en **modo suave**: −1 serie por ejercicio (mín. 2), carreras ×0,85 de duración y menos repeticiones en las series. Con **1 (fresco)**, **modo +carga**: +1 serie en los dos primeros ejercicios de fuerza (máx. 5) y carreras ×1,1.
- **Autorregulación por RPE:** al empezar semana, se mira el RPE medio de las sesiones de gym y carrera de la anterior (mín. 2 valoradas). **≥ 8,7 → modo suave**; **≤ 6,5 con ≥ 90 % de cumplimiento → modo +carga**. No se aplica en la semana de descarga.
- **Modo manual:** en *Semana* puedes elegir Normal / Suave / + Carga cuando quieras.

---

## 6. Gimnasio (`src/lib/program.ts`)

### Plantillas

| A · Pierna + Salto | B · Torso · Fuerza | C · Torso · Estética |
|---|---|---|
| Salto al cajón 3×3 (hasta 5 series) | Press banca 4 × 6–8 | Press inclinado mancuernas 4 × 8–12 |
| Saltos horizontales 2×3 (hasta 4) | Dominadas 4 × 6–10 (+lastre) | Remo en polea baja 3 × 10–12 |
| Sentadilla trasera 4 × 5–8 | Press militar mancuernas 3 × 8–10 | Elevaciones laterales 4 × 12–20 |
| Peso muerto rumano 3 × 8–10 | Remo con barra 3 × 8–10 | Curl inclinado 3 × 10–12 |
| Sentadilla búlgara 3 × 8–10 | Elevaciones laterales 3 × 12–20 | Extensión tríceps polea 3 × 10–12 |
| Gemelo de pie 3 × 10–15 | Face pull 2 × 15–20 | Elevación de piernas colgado 3 × 10–15 |
| Pallof press 3 × 10–12 | | |

Con **2 días de gym** se hacen A y B, y B añade curl y tríceps (2 series cada uno).

### Rutinas editables

*Ajustes → Rutinas*: cambia el nombre, añade, quita, reordena o sustituye ejercicios y ajusta series y rango de reps de cada uno. Al guardar, el motor recalcula todas las sesiones futuras.

Dentro de una sesión (menú ⋯ de cada ejercicio) puedes **cambiar** el ejercicio, **quitarlo** o **añadir** otro, eligiendo **solo hoy** (la sesión queda «personalizada» y conserva sus cambios aunque el plan la mueva de día) o **siempre** (se guarda en la rutina). También puedes subir o bajar las series de hoy.

**Biblioteca:** 141 ejercicios en 16 grupos (pliometría, pierna rodilla/cadera/unilateral, aductores, gemelo, pecho, hombro empuje/lateral/posterior, espalda vertical/remo, bíceps, tríceps, core, trapecio y agarre), con versiones de barra, mancuerna, polea, máquina, multipower y peso corporal para casi todo. Al cambiar uno, primero salen las **alternativas del mismo grupo**. Puedes **crear ejercicios propios** (nombre, grupo, tipo de carga y rango de reps); el incremento se elige solo según el tipo.

### Ficha de técnica

Tocando el nombre de un ejercicio (en la sesión, en el buscador con ⓘ, o «Técnica» en el editor de rutinas) se abre su ficha:

- **Demostración animada:** dos fotos (posición inicial y final) que se alternan con un fundido; toca para pausar. Con «reducir movimiento» activado en el iPhone no se anima y el toque cambia de foto. Las fotos son de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público), en una versión fijada.
- **Músculos, 3 pasos de técnica en español** y la indicación del ejercicio.
- **Vídeo:** abre una búsqueda en YouTube del ejercicio.
- **Ejercicios propios:** *Elegir imagen* busca en ~750 demostraciones de la misma base (los términos en español se traducen solos: «remo polea alta» → *high pulley row*) y puedes **pegar tu propio enlace de vídeo**.

**Rendimiento:** nada de esto se carga al abrir la app. Los textos de técnica van en un módulo aparte (~7 KB) que se pide al abrir la primera ficha; cada foto pesa ~70 KB y solo se descarga al ver esa ficha; el índice de demostraciones (`public/demos.json`, ~11 KB comprimido) solo al usar *Elegir imagen*. El service worker guarda las fotos ya vistas (hasta 400, 6 meses), así que después funcionan sin conexión.

Cada ejercicio guarda su propio historial: si cambias A por B y vuelves a A, A retoma donde lo dejaste.

### Durante la sesión

- **«Última vez»** bajo cada ejercicio: peso y reps de tu último registro.
- **Cronómetro de descanso** al marcar una serie: 150" si el rango es ≤ 8 reps, 90" en pliometría y ejercicios medios, 60" en aislamiento (hombro, brazos, core). +15" o saltar; aviso con sonido al acabar.
- Barra de progreso de series.

### Doble progresión (cómo calcula el peso de hoy)

Toma **tu último registro** de ese ejercicio (ignorando semanas de descarga):

1. **Sin historial:** te pide elegir peso (con ~2 reps en reserva) y empieza en el mínimo del rango.
2. **Todas las series al máximo del rango** con el mismo peso → **sube el peso** (sentadilla/rumano/gemelo +5 kg · banca/remo/polea/lastre +2,5 · mancuernas +2 · laterales/curl +1) y vuelves al mínimo de reps.
3. **Dentro del rango** → mismo peso, objetivo = tus reps más bajas + 1.
4. **Fallas** (menos series de las previstas o reps por debajo del mínimo) → mismo peso, mínimo del rango.
5. **Fallas dos sesiones seguidas** → **−5 %** de peso.

Pesos redondeados a 0,5 kg. Al escribir un peso, se copia a las series siguientes que aún no has hecho.

### Pliometría (salto)

Series = base + 1 por ciclo completado, hasta el máximo. Si esa semana hay **4 o más sesiones de basket/partido**, −1 serie (ya saltas mucho en pista).

---

## 7. Carrera

Todos los ritmos salen de **tu ritmo de 5K** (`P`, en min/km). Progresión `p = ciclo × 3 + (bloque − 1)`.

| Sesión | Duración / volumen | Ritmo |
|---|---|---|
| Rodaje suave | `30 + 3·p` min (máx. 55) · descarga 30 | `P + 1:05` a `P + 1:30` |
| Rodaje largo (3 salidas) | rodaje + 15 min (máx. 75) · descarga 40 | igual |
| Bloque 1 · Series | `6 + ciclo` × 400 m (máx. 10), 90" trotando | `P − 0:20` |
| Bloque 2 · Tempo | `15 + 3·ciclo` min (máx. 30) | `P + 0:20` |
| Bloque 3 · Series | `3 + ciclo` × 1 km (máx. 6), 2' trotando | `P − 0:05` |
| Bloque 4 · Test 5K | 5 km a tope regular | objetivo: bajar de `P` |

**Actualización automática de `P`:**
- **Test 5K** (≥ 4,5 km): si mejoras, se toma el nuevo ritmo; si empeoras, la media entre el antiguo y el nuevo (un mal día no te hunde los ritmos).
- **Cualquier carrera** de ≥ 4,5 km más rápida que `P` → nuevo `P`.

Con `P = 6:20`: rodaje a 7:25–7:50, 400 m a 6:00, tempo a 6:40, 1 km a 6:15.

---

## 8. Progreso

| Métrica | Cálculo |
|---|---|
| Semanas restantes | Días hasta la fecha objetivo ÷ 7 |
| Tendencia de peso | Regresión lineal de los registros de los últimos 28 días (mín. 3 registros que abarquen ≥ 10 días), en kg/semana |
| Consejo de peso | Si la bajada se frena (> −0,15 kg/sem) → −150 kcal o +2.000 pasos · si bajas muy rápido (< −0,9) → +150 kcal · si no, buen ritmo |
| Proteína | 2 g × peso objetivo |
| Fuerza (1RM estimado) | Fórmula de Epley: `kg × (1 + reps / 30)`, la mejor serie de cada sesión |
| Salto vertical | Tus mediciones (alcance con salto − alcance de pie, en cm) |
| Constancia | Cumplimiento de las últimas 8 semanas (verde ≥ 80 %, amarillo ≥ 60 %, rojo < 60 %; la semana en curso en gris) |

---

## 9. Coach IA (Gemini)

Pestaña *Coach*. Se conecta con tu clave gratuita de Google AI Studio; la app elige sola el mejor modelo **Gemini Flash** disponible para esa clave. Las llamadas van directas del móvil a Google, sin servidor intermedio.

En cada mensaje recibe tu perfil, la semana (con ids de sesiones y ejercicios), las 3 últimas semanas, tus rutinas, tus pesos y la biblioteca de ejercicios. Puede **actuar** con estas herramientas, que usan las mismas funciones que la interfaz (así el motor replanifica igual):

| Herramienta | Qué hace |
|---|---|
| `move_session` / `skip_session` | Mover o saltar una sesión de esta semana |
| `add_event` | Añadir partido, entreno de basket o carrera |
| `swap_exercise` / `add_exercise` / `remove_exercise` | Editar ejercicios de una sesión, solo hoy o siempre |
| `set_routine` | Reescribir una rutina completa |
| `create_exercise` | Crear un ejercicio nuevo |
| `set_week_mode` | Semana normal, suave o con más carga |
| `update_profile` | Días de basket, partido, días bloqueados, gym/carreras por semana, objetivo, ritmo 5K |
| `log_weight` | Registrar peso |

Cada acción aparece como una etiqueta verde bajo la respuesta. Máximo 6 pasos por mensaje. Ante dolor, adapta y recomienda profesional si es agudo o persiste; no diagnostica.

## 10. Gimnasio y avisos por ubicación

- **Guardar gimnasio:** *Ajustes → Mi gimnasio*, estando allí. Radio de 150 m más la imprecisión del GPS (hasta +100 m).
- **Al abrir la app allí:** abre directamente la rutina de hoy (una vez al día) y muestra el aviso *Estás en el gimnasio*. Si hoy no tocaba gym, ofrece traer a hoy la siguiente sesión de la semana.
- **Notificación al llegar:** iOS no permite que una web lea la ubicación en segundo plano, así que el aviso lo da una **automatización de Atajos** (*Llegar* → *Mostrar notificación*). La guía está en la propia app.

---

## 11. Límites conocidos

- No lee el calendario del iPhone. Los partidos entre semana se añaden a mano (posible v2: calendario público de iCloud + proxy).
- No sincroniza entre dispositivos. Para pasar los datos, exportar e importar.
- Al tocar la notificación de Atajos se abre Atajos, no Entreno. Para abrir la app directamente haría falta push con servidor (posible v2).
- El coach necesita conexión y depende de los límites del nivel gratuito de Gemini (si se agotan, avisa y vuelve a funcionar al rato).

---

## 12. Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # tests del motor (planificación, reajustes, progresión)
npm run build    # build de producción en dist/
npm run icons    # regenerar iconos
node scripts/demos.mjs  # regenerar el índice de demostraciones (public/demos.json)
```

| Archivo | Qué contiene |
|---|---|
| `src/lib/engine.ts` | Motor: semanas, bloques, colocación, reajustes |
| `src/lib/program.ts` | Ejercicios, plantillas, progresión de gym y carrera |
| `src/lib/howto.ts` | Técnica de cada ejercicio y su demostración (carga diferida) |
| `src/components/ExerciseInfo.tsx` | Ficha del ejercicio, animación y buscador de demostraciones |
| `src/lib/store.ts` | Estado, persistencia y acciones |
| `src/lib/coach.ts` | Coach IA: conexión con Gemini, contexto y herramientas |
| `src/lib/geo.ts` | Distancias y ubicación |
| `src/screens/*` | Pantallas: Hoy, Semana, Sesión, Coach, Progreso, Ajustes, Editor de rutinas, Inicio |
| `src/components/Pickers.tsx` | Buscador de ejercicios, creación, selectores |
