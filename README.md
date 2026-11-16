# Entreno

PWA personal para organizar basket, gimnasio y carrera con un plan que se reajusta solo.

- **Plan semanal** generado desde tu perfil: entrenos de basket fijos, partido del finde, 2–3 días de gym y 1–3 carreras.
- **Reajuste automático** (`src/lib/engine.ts`): cada vez que abres la app se recolocan las sesiones pendientes y las no hechas según un coste de fatiga por día (nada de pierna antes de un partido, series lejos de la pierna, al menos un día libre…). Cada cambio queda explicado en «Reajustes de la semana».
- **Progresión** (`src/lib/program.ts`): bloques de 4 semanas (base → carga → pico → descarga). Gym con doble progresión por ejercicio; carrera con ritmos derivados del 5K y test en la semana de descarga. Si cumples menos del 60 %, se repite el bloque.
- Datos solo en el dispositivo (localStorage) con exportar/importar JSON.

Especificaciones completas (datos, cálculos, reglas): [docs/ESPECIFICACIONES.md](docs/ESPECIFICACIONES.md)

**App:** https://albertoesgo.github.io/entreno/ (iPhone: Safari → Compartir → Añadir a pantalla de inicio)

```bash
npm install
npm run dev      # desarrollo
npm test         # tests del motor
npm run build    # build de producción en dist/
npm run icons    # regenerar iconos
```
