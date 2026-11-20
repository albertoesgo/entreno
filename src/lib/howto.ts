// Técnica de cada ejercicio de la biblioteca. Este módulo se carga solo al abrir
// la ficha de un ejercicio (import dinámico), así que no pesa en el arranque.
//
// `demo` es la carpeta del ejercicio en free-exercise-db (dominio público,
// github.com/yuhonas/free-exercise-db): dos fotos, posición inicial y final.

export interface HowTo {
  demo?: string
  muscles: string
  steps: string[]
}

const h = (demo: string | undefined, muscles: string, ...steps: string[]): HowTo => ({ demo, muscles, steps })

export const HOWTO: Record<string, HowTo> = {
  // Pliometría
  boxjump: h('Front_Box_Jump', 'Cuádriceps, glúteo, gemelo', 'De pie frente al cajón, pies a la anchura de cadera.', 'Baja rápido a cuarto de sentadilla con los brazos atrás.', 'Salta con todo, aterriza suave en el cajón con las rodillas flexionadas y baja andando.'),
  bounds: h('Standing_Long_Jump', 'Glúteo, cuádriceps, isquios', 'Salta hacia delante lo más lejos que puedas con los dos pies.', 'Al caer, rebota enseguida en el siguiente salto.', 'Encadena 3 y frena estable en el último.'),
  cmj: h('Freehand_Jump_Squat', 'Cuádriceps, glúteo, gemelo', 'De pie, bajada rápida a media sentadilla.', 'Sin pausa, salta lo más alto posible lanzando los brazos.', 'Aterriza blando y resetea antes del siguiente.'),
  approach: h(undefined, 'Cuádriceps, glúteo, gemelo', 'Coge 2–3 pasos de carrera.', 'Último paso largo, planta los dos pies y baja la cadera.', 'Salta hacia arriba con los brazos, como para coger un rebote.'),
  singleleg: h('Single-Leg_Hop_Progression', 'Cuádriceps, glúteo, gemelo, estabilidad', 'Apoyado en una pierna, rodilla ligeramente flexionada.', 'Salta hacia delante o arriba con esa pierna.', 'Aterriza sobre la misma pierna y aguanta 1" estable.'),
  depthjump: h('Linear_Depth_Jump', 'Cuádriceps, gemelo, tendones', 'Sube a un cajón bajo (30–40 cm).', 'Déjate caer (no saltes) y aterriza con los dos pies.', 'Rebota hacia arriba lo más rápido posible: menos tiempo en el suelo = mejor.'),
  pogo: h(undefined, 'Gemelo, tendón de Aquiles', 'De pie, rodillas casi rectas.', 'Bota sobre la punta de los pies con el tobillo rígido.', 'Contactos cortos y rápidos, como una pelota.'),
  tuckjump: h('Knee_Tuck_Jump', 'Cuádriceps, flexores de cadera, core', 'De pie, brazos delante.', 'Salta y lleva las rodillas al pecho.', 'Aterriza blando y encadena el siguiente.'),
  lateralbound: h('Lateral_Bound', 'Glúteo medio, cuádriceps, aductores', 'Sobre una pierna, flexiona y empuja hacia el lado.', 'Cae sobre la otra pierna, como un patinador.', 'Clava la caída 1" y vuelve.'),
  hurdlehops: h('Hurdle_Hops', 'Gemelo, cuádriceps, coordinación', 'Coloca 4–6 vallas bajas en fila.', 'Sáltalas a dos pies sin pausa entre ellas.', 'Rodillas arriba, contacto corto en el suelo.'),
  splitjump: h('Split_Jump', 'Cuádriceps, glúteo', 'En posición de zancada.', 'Salta hacia arriba y cambia de pierna en el aire.', 'Cae en zancada con la otra pierna delante.'),
  lateralbox: h('Lateral_Box_Jump', 'Glúteo medio, cuádriceps', 'De lado junto a un cajón bajo.', 'Salta lateralmente encima.', 'Baja y repite hacia el otro lado.'),
  medball: h('Medicine_Ball_Scoop_Throw', 'Cadena posterior, potencia total', 'Balón entre las piernas, en media sentadilla.', 'Extiende cadera y rodillas de golpe.', 'Lanza el balón arriba y adelante con los brazos rectos.'),

  // Rodilla
  squat: h('Barbell_Squat', 'Cuádriceps, glúteo, aductores', 'Barra sobre los trapecios, pies a la anchura de hombros.', 'Baja con la cadera atrás y las rodillas hacia fuera hasta romper el paralelo.', 'Sube empujando el suelo, pecho arriba.'),
  frontsquat: h('Front_Barbell_Squat', 'Cuádriceps, glúteo, core', 'Barra sobre los deltoides delanteros, codos altos.', 'Baja recto, torso vertical.', 'Sube sin dejar caer los codos.'),
  hacksquat: h('Hack_Squat', 'Cuádriceps, glúteo', 'Espalda apoyada en el respaldo, pies en la plataforma.', 'Baja controlado hasta 90° o más.', 'Empuja con todo el pie sin bloquear las rodillas.'),
  legpress: h('Leg_Press', 'Cuádriceps, glúteo', 'Pies a la anchura de hombros en la plataforma.', 'Baja hasta que las rodillas se acerquen al pecho sin despegar la lumbar.', 'Empuja sin bloquear del todo las rodillas.'),
  goblet: h('Goblet_Squat', 'Cuádriceps, glúteo', 'Sujeta una mancuerna o kettlebell pegada al pecho.', 'Baja entre las piernas con el torso recto.', 'Sube empujando con los talones.'),
  legext: h('Leg_Extensions', 'Cuádriceps', 'Sentado, rodillo sobre los tobillos.', 'Extiende las piernas hasta arriba y aprieta 1".', 'Baja lento.'),
  smithsquat: h('Smith_Machine_Squat', 'Cuádriceps, glúteo', 'Barra guiada sobre los trapecios, pies un poco adelantados.', 'Baja controlado hasta el paralelo.', 'Sube empujando el suelo.'),
  boxsquat: h('Box_Squat', 'Glúteo, isquios, cuádriceps', 'Cajón detrás a la altura del paralelo.', 'Baja con la cadera atrás hasta sentarte sin relajarte.', 'Sube explosivo desde el cajón.'),
  sissy: h('Weighted_Sissy_Squat', 'Cuádriceps', 'De pie, sujétate a algo con una mano.', 'Ponte de puntillas y lleva las rodillas adelante inclinando el cuerpo atrás.', 'Sube estirando las rodillas, cuerpo en línea recta.'),

  // Cadera
  rdl: h('Romanian_Deadlift', 'Isquios, glúteo, lumbar', 'Barra en las manos, rodillas un poco flexionadas.', 'Lleva la cadera atrás deslizando la barra por los muslos hasta sentir los isquios.', 'Sube empujando la cadera adelante, espalda neutra.'),
  trapbar: h('Trap_Bar_Deadlift', 'Glúteo, cuádriceps, isquios', 'Dentro de la barra, agarra las asas.', 'Pecho arriba, espalda neutra.', 'Empuja el suelo y sube rápido hasta quedar de pie.'),
  deadlift: h('Barbell_Deadlift', 'Isquios, glúteo, espalda', 'Pies bajo la barra, agarre por fuera de las piernas.', 'Tensa la espalda y saca la holgura de la barra.', 'Sube con la barra pegada a las piernas y bloquea con la cadera.'),
  sumo: h('Sumo_Deadlift', 'Glúteo, aductores, cuádriceps', 'Pies muy abiertos, puntas hacia fuera, agarre por dentro.', 'Cadera baja, pecho arriba.', 'Empuja el suelo hacia los lados y sube.'),
  dbrdl: h('Stiff-Legged_Dumbbell_Deadlift', 'Isquios, glúteo', 'Mancuernas delante de los muslos.', 'Cadera atrás bajando las mancuernas cerca de las piernas.', 'Sube apretando el glúteo.'),
  hipthrust: h('Barbell_Hip_Thrust', 'Glúteo', 'Espalda alta en un banco, barra sobre la cadera.', 'Empuja con los talones hasta quedar en línea hombros-rodillas.', 'Pausa 1" arriba y baja controlado.'),
  glutebridge: h('Barbell_Glute_Bridge', 'Glúteo', 'Tumbado en el suelo, barra sobre la cadera.', 'Eleva la cadera apretando glúteo.', 'Baja sin apoyar del todo.'),
  legcurl: h('Lying_Leg_Curls', 'Isquios', 'Tumbado boca abajo, rodillo sobre los tobillos.', 'Flexiona las rodillas llevando los talones al glúteo.', 'Baja lento.'),
  seatedlegcurl: h('Seated_Leg_Curl', 'Isquios', 'Sentado, rodillo encima y debajo de las piernas.', 'Flexiona las rodillas hacia abajo y atrás.', 'Vuelve lento.'),
  nordic: h('Natural_Glute_Ham_Raise', 'Isquios', 'De rodillas, tobillos sujetos.', 'Déjate caer hacia delante lo más lento posible con el cuerpo recto.', 'Frena con las manos y empuja para volver.'),
  ghr: h('Glute_Ham_Raise', 'Isquios, glúteo', 'En la máquina GHR, pies sujetos.', 'Baja el torso con el cuerpo recto.', 'Sube flexionando las rodillas con los isquios.'),
  goodmorning: h('Good_Morning', 'Isquios, lumbar', 'Barra en los trapecios, rodillas un poco flexionadas.', 'Inclina el torso llevando la cadera atrás.', 'Vuelve arriba con la espalda neutra.'),
  hyperext: h('Hyperextensions_Back_Extensions', 'Lumbar, glúteo, isquios', 'En el banco de hiperextensiones, cadera en el borde.', 'Baja el torso doblando por la cadera.', 'Sube hasta la línea recta, sin pasarte.'),
  pullthrough: h('Pull_Through', 'Glúteo, isquios', 'De espaldas a la polea baja, cuerda entre las piernas.', 'Cadera atrás dejando pasar la cuerda.', 'Extiende la cadera de golpe apretando glúteo.'),
  kbswing: h('One-Arm_Kettlebell_Swings', 'Glúteo, isquios, core', 'Kettlebell delante, cadera atrás.', 'Pásala entre las piernas.', 'Extiende la cadera de golpe para lanzarla a la altura del pecho.'),
  powerclean: h('Power_Clean', 'Cadena posterior, trapecio, potencia', 'Barra en el suelo, agarre a la anchura de hombros.', 'Sube como un peso muerto y al pasar la rodilla extiende cadera de golpe.', 'Métete bajo la barra y recíbela sobre los hombros.'),
  hangclean: h('Hang_Clean', 'Cadena posterior, trapecio, potencia', 'Barra colgando por encima de las rodillas.', 'Extiende cadera y rodillas de golpe y encoge hombros.', 'Gira los codos rápido y recibe la barra sobre los hombros.'),

  // Unilateral
  bulgarian: h('Split_Squat_with_Dumbbells', 'Cuádriceps, glúteo', 'Pie trasero sobre un banco, mancuernas a los lados.', 'Baja recto hasta que la rodilla trasera casi toque el suelo.', 'Sube empujando con la pierna delantera.'),
  lunge: h('Dumbbell_Lunges', 'Cuádriceps, glúteo', 'Mancuernas a los lados.', 'Da un paso largo y baja hasta casi tocar con la rodilla trasera.', 'Empuja y avanza con la otra pierna.'),
  reverselunge: h('Dumbbell_Rear_Lunge', 'Glúteo, cuádriceps', 'De pie con mancuernas.', 'Da un paso atrás y baja.', 'Vuelve empujando con la pierna delantera.'),
  stepup: h('Dumbbell_Step_Ups', 'Cuádriceps, glúteo', 'Frente a un cajón, un pie encima.', 'Sube empujando solo con esa pierna.', 'Baja controlado.'),
  slrdl: h('Kettlebell_One-Legged_Deadlift', 'Isquios, glúteo, equilibrio', 'Sobre una pierna, peso en la mano contraria.', 'Inclina el torso y lleva la pierna libre atrás.', 'Vuelve apretando el glúteo de la pierna de apoyo.'),
  smithsplit: h('Smith_Single-Leg_Split_Squat', 'Cuádriceps, glúteo', 'Barra guiada en la espalda, pie trasero en un banco.', 'Baja en vertical.', 'Sube con la pierna delantera.'),
  sidelunge: h('Barbell_Side_Split_Squat', 'Aductores, glúteo, cuádriceps', 'Pies muy abiertos.', 'Baja sobre una pierna con la otra estirada.', 'Vuelve al centro y cambia de lado.'),
  pistolbox: h('Single-Leg_High_Box_Squat', 'Cuádriceps, glúteo, equilibrio', 'Sobre una pierna delante de un cajón.', 'Baja hasta rozar el cajón con la otra pierna adelante.', 'Sube sin apoyarte.'),

  // Aductores
  adductor: h('Thigh_Adductor', 'Aductores', 'Sentado con las almohadillas por dentro de las rodillas.', 'Junta las piernas.', 'Abre lento.'),
  abductor: h('Thigh_Abductor', 'Glúteo medio', 'Sentado con las almohadillas por fuera de las rodillas.', 'Abre las piernas.', 'Vuelve lento.'),
  cableadduct: h('Cable_Hip_Adduction', 'Aductores', 'Tobillera en la polea baja, de lado.', 'Cruza la pierna por delante de la otra.', 'Vuelve controlado.'),

  // Gemelo
  calf: h('Standing_Calf_Raises', 'Gemelo', 'De pie en la máquina, talones fuera del escalón.', 'Sube de puntillas lo más alto posible y aguanta 1".', 'Baja hasta estirar del todo.'),
  seatedcalf: h('Seated_Calf_Raise', 'Sóleo', 'Sentado, almohadilla sobre las rodillas.', 'Sube los talones al máximo.', 'Baja estirando.'),
  presscalf: h('Calf_Press_On_The_Leg_Press_Machine', 'Gemelo', 'En la prensa, solo la punta de los pies en la plataforma.', 'Empuja con los tobillos.', 'Baja estirando del todo.'),
  slcalf: h('Standing_Dumbbell_Calf_Raise', 'Gemelo', 'Sobre un escalón con una pierna, mancuerna en la mano.', 'Sube de puntillas.', 'Baja lento hasta estirar.'),

  // Pecho
  bench: h('Barbell_Bench_Press_-_Medium_Grip', 'Pecho, tríceps, hombro', 'Tumbado, escápulas juntas, pies firmes.', 'Baja la barra al pecho controlada.', 'Empuja hacia arriba y un poco atrás.'),
  dbbench: h('Dumbbell_Bench_Press', 'Pecho, tríceps, hombro', 'Tumbado con una mancuerna en cada mano.', 'Baja hasta los lados del pecho.', 'Empuja juntándolas arriba.'),
  incline: h('Incline_Dumbbell_Press', 'Pecho superior, hombro', 'Banco a 30–45°.', 'Baja las mancuernas a la altura del pecho alto.', 'Empuja arriba.'),
  inclinebench: h('Barbell_Incline_Bench_Press_-_Medium_Grip', 'Pecho superior, hombro, tríceps', 'Banco inclinado, agarre medio.', 'Baja la barra a la parte alta del pecho.', 'Empuja arriba.'),
  smithincline: h('Smith_Machine_Incline_Bench_Press', 'Pecho superior', 'Banco inclinado bajo la barra guiada.', 'Baja al pecho alto.', 'Empuja.'),
  declinebench: h('Decline_Barbell_Bench_Press', 'Pecho inferior, tríceps', 'Banco declinado, piernas sujetas.', 'Baja la barra a la parte baja del pecho.', 'Empuja.'),
  machinepress: h('Machine_Bench_Press', 'Pecho, tríceps', 'Sentado, agarres a la altura del pecho.', 'Empuja hacia delante.', 'Vuelve lento.'),
  inclinemachine: h('Leverage_Incline_Chest_Press', 'Pecho superior', 'Sentado, agarres a la altura del pecho alto.', 'Empuja arriba y adelante.', 'Vuelve lento.'),
  dips: h('Dips_-_Chest_Version', 'Pecho, tríceps', 'En paralelas, brazos estirados.', 'Inclínate un poco adelante y baja hasta 90° de codo.', 'Empuja hasta arriba.'),
  pushup: h('Pushups', 'Pecho, tríceps, core', 'Manos algo más anchas que los hombros, cuerpo recto.', 'Baja el pecho casi al suelo.', 'Empuja sin hundir la cadera.'),
  cablefly: h('Cable_Crossover', 'Pecho', 'Entre dos poleas altas, un paso adelante.', 'Junta las manos delante con los codos un poco flexionados.', 'Abre lento hasta notar el estiramiento.'),
  lowcablefly: h('Low_Cable_Crossover', 'Pecho superior', 'Poleas bajas.', 'Sube las manos hasta juntarlas a la altura de la cara.', 'Baja controlado.'),
  dbfly: h('Dumbbell_Flyes', 'Pecho', 'Tumbado, mancuernas arriba, codos un poco flexionados.', 'Abre en arco hasta estirar el pecho.', 'Cierra como abrazando un árbol.'),
  pecdeck: h('Butterfly', 'Pecho', 'Sentado, antebrazos o manos en los agarres.', 'Junta los brazos delante.', 'Abre lento.'),

  // Hombro empuje
  ohp: h('Dumbbell_Shoulder_Press', 'Hombro, tríceps', 'Sentado o de pie, mancuernas a la altura de los hombros.', 'Empuja hasta estirar los brazos.', 'Baja controlado.'),
  barbellohp: h('Standing_Military_Press', 'Hombro, tríceps, core', 'De pie, barra sobre la clavícula.', 'Empuja hacia arriba apartando la cabeza.', 'Bloquea arriba con la barra sobre la cabeza.'),
  arnold: h('Arnold_Dumbbell_Press', 'Hombro', 'Mancuernas delante de la cara, palmas hacia ti.', 'Gira las palmas mientras empujas hacia arriba.', 'Deshaz el giro al bajar.'),
  machineohp: h('Machine_Shoulder_Military_Press', 'Hombro, tríceps', 'Sentado, agarres a la altura de los hombros.', 'Empuja arriba.', 'Baja lento.'),
  smithohp: h('Smith_Machine_Overhead_Shoulder_Press', 'Hombro, tríceps', 'Sentado bajo la barra guiada.', 'Empuja arriba.', 'Baja hasta la barbilla.'),
  pushpress: h('Push_Press', 'Hombro, piernas, potencia', 'Barra sobre los hombros.', 'Flexiona un poco las rodillas y extiende de golpe.', 'Aprovecha el impulso para llevar la barra arriba.'),
  landmine: h('Landmine_Linear_Jammer', 'Hombro, pecho superior, core', 'Extremo de la barra anclado, el otro en tu mano a la altura del hombro.', 'Empuja hacia arriba y adelante.', 'Baja controlado.'),
  frontraise: h('Front_Dumbbell_Raise', 'Hombro anterior', 'De pie, mancuernas delante de los muslos.', 'Sube con los brazos casi rectos hasta la altura de los ojos.', 'Baja lento.'),

  // Espalda vertical
  pullup: h('Pullups', 'Dorsal, bíceps', 'Cuelga con agarre prono algo más ancho que los hombros.', 'Tira hasta pasar la barbilla de la barra.', 'Baja hasta estirar los brazos.'),
  chinup: h('Chin-Up', 'Dorsal, bíceps', 'Cuelga con las palmas hacia ti.', 'Tira llevando el pecho a la barra.', 'Baja controlado.'),
  assistpull: h('Band_Assisted_Pull-Up', 'Dorsal, bíceps', 'Goma en la barra y bajo la rodilla o el pie.', 'Tira hasta pasar la barbilla.', 'Baja lento.'),
  latpull: h('Wide-Grip_Lat_Pulldown', 'Dorsal, bíceps', 'Sentado, agarre ancho.', 'Tira de la barra hasta la parte alta del pecho sacando pecho.', 'Sube controlado hasta estirar.'),
  closepull: h('V-Bar_Pulldown', 'Dorsal, bíceps', 'Agarre estrecho o triángulo.', 'Tira hacia el pecho con los codos pegados.', 'Sube estirando.'),
  onearmpull: h('One_Arm_Lat_Pulldown', 'Dorsal', 'Un agarre en la polea alta.', 'Tira llevando el codo a la cadera.', 'Estira del todo arriba.'),
  straightarm: h('Straight-Arm_Pulldown', 'Dorsal', 'De pie frente a la polea alta, brazos casi rectos.', 'Lleva la barra hasta los muslos.', 'Sube controlado.'),
  dbpullover: h('Bent-Arm_Dumbbell_Pullover', 'Dorsal, pecho', 'Tumbado, mancuerna sobre el pecho con las dos manos.', 'Bájala por detrás de la cabeza en arco.', 'Vuelve arriba.'),

  // Espalda remo
  row: h('Bent_Over_Barbell_Row', 'Espalda media, dorsal', 'Inclinado a unos 45°, espalda neutra.', 'Tira de la barra hacia el ombligo.', 'Baja controlado.'),
  cablerow: h('Seated_Cable_Rows', 'Espalda media, dorsal', 'Sentado, pies apoyados, espalda recta.', 'Tira hacia el abdomen juntando escápulas.', 'Estira los brazos sin encorvarte.'),
  dbrow: h('One-Arm_Dumbbell_Row', 'Dorsal, espalda media', 'Rodilla y mano en un banco.', 'Tira de la mancuerna hacia la cadera.', 'Baja estirando.'),
  chestrow: h('Dumbbell_Incline_Row', 'Espalda media', 'Pecho apoyado en un banco inclinado.', 'Tira de las mancuernas hacia atrás.', 'Baja lento.'),
  tbarrow: h('T-Bar_Row_with_Handle', 'Espalda media, dorsal', 'Sobre la barra en T, inclinado.', 'Tira del agarre hacia el pecho.', 'Baja controlado.'),
  machinerow: h('Leverage_Iso_Row', 'Espalda media', 'Pecho en el apoyo.', 'Tira de los agarres hacia atrás.', 'Vuelve lento.'),
  highrow: h('Leverage_High_Row', 'Dorsal, espalda alta', 'Sentado, agarres arriba.', 'Tira hacia abajo y atrás.', 'Vuelve lento.'),
  meadows: h('One-Arm_Long_Bar_Row', 'Dorsal, espalda media', 'Barra anclada en una esquina, agarra el extremo.', 'Tira hacia la cadera.', 'Baja estirando.'),
  onearmcablerow: h('Seated_One-arm_Cable_Pulley_Rows', 'Dorsal', 'Sentado con un agarre en la polea baja.', 'Tira hacia la cadera girando un poco el torso.', 'Estira del todo.'),
  invrow: h('Inverted_Row', 'Espalda media, bíceps', 'Bajo una barra baja, cuerpo recto.', 'Tira hasta tocar la barra con el pecho.', 'Baja controlado.'),

  // Hombro lateral
  lateral: h('Side_Lateral_Raise', 'Deltoides lateral', 'De pie, mancuernas a los lados.', 'Sube los brazos hacia los lados hasta la altura de los hombros.', 'Baja lento.'),
  cablelateral: h('Standing_Low-Pulley_Deltoid_Raise', 'Deltoides lateral', 'De lado a la polea baja.', 'Sube el brazo hacia el lado.', 'Baja controlado.'),
  seatedlateral: h('Seated_Side_Lateral_Raise', 'Deltoides lateral', 'Sentado, mancuernas a los lados.', 'Sube hasta la altura de los hombros.', 'Baja lento.'),
  leanlateral: h('One-Arm_Incline_Lateral_Raise', 'Deltoides lateral', 'Inclinado de lado sujetándote o en banco.', 'Sube el brazo hacia el lado.', 'Baja lento.'),
  uprightrow: h('Upright_Barbell_Row', 'Deltoides lateral, trapecio', 'Barra delante, agarre ancho.', 'Sube los codos hasta la altura de los hombros.', 'Baja controlado.'),

  // Hombro posterior
  facepull: h('Face_Pull', 'Deltoides posterior, manguito', 'Cuerda en la polea alta.', 'Tira hacia la cara separando las manos.', 'Codos altos, vuelve lento.'),
  reardelt: h('Seated_Bent-Over_Rear_Delt_Raise', 'Deltoides posterior', 'Sentado inclinado hacia delante.', 'Abre los brazos hacia los lados.', 'Baja lento.'),
  reversepec: h('Reverse_Machine_Flyes', 'Deltoides posterior', 'En el contractor, pecho al respaldo.', 'Abre los brazos hacia atrás.', 'Vuelve lento.'),
  cablerear: h('Cable_Rear_Delt_Fly', 'Deltoides posterior', 'Poleas cruzadas a la altura del hombro.', 'Abre los brazos hacia atrás.', 'Vuelve lento.'),
  bandpull: h('Band_Pull_Apart', 'Deltoides posterior, escápulas', 'Goma delante a la altura del pecho.', 'Ábrela hasta tocar el pecho.', 'Vuelve controlado.'),

  // Bíceps
  curl: h('Incline_Dumbbell_Curl', 'Bíceps', 'Sentado en banco inclinado, brazos colgando.', 'Flexiona los codos sin moverlos.', 'Baja hasta estirar del todo.'),
  dbcurl: h('Dumbbell_Bicep_Curl', 'Bíceps', 'De pie, mancuernas a los lados.', 'Sube girando las palmas hacia ti.', 'Baja lento.'),
  barbellcurl: h('Barbell_Curl', 'Bíceps', 'De pie, barra con agarre supino.', 'Sube sin balancear el cuerpo.', 'Baja lento.'),
  ezcurl: h('EZ-Bar_Curl', 'Bíceps', 'Barra Z con agarre supino.', 'Sube con los codos quietos.', 'Baja controlado.'),
  hammer: h('Hammer_Curls', 'Braquial, antebrazo', 'Mancuernas con agarre neutro.', 'Sube sin girar las muñecas.', 'Baja lento.'),
  ropehammer: h('Cable_Hammer_Curls_-_Rope_Attachment', 'Braquial, antebrazo', 'Cuerda en la polea baja.', 'Sube con agarre neutro.', 'Baja lento.'),
  preacher: h('Preacher_Curl', 'Bíceps', 'Brazos apoyados en el banco Scott.', 'Sube la barra.', 'Baja hasta casi estirar.'),
  machinecurl: h('Machine_Preacher_Curls', 'Bíceps', 'Brazos en el apoyo de la máquina.', 'Flexiona los codos.', 'Baja lento.'),
  cablecurl: h('Standing_Biceps_Cable_Curl', 'Bíceps', 'Frente a la polea baja.', 'Sube con los codos pegados.', 'Baja lento.'),
  spider: h('Spider_Curl', 'Bíceps', 'Pecho apoyado en un banco inclinado, brazos colgando.', 'Sube la barra.', 'Baja controlado.'),
  concentration: h('Concentration_Curls', 'Bíceps', 'Sentado, codo apoyado en el muslo.', 'Sube la mancuerna.', 'Baja lento.'),
  reversecurl: h('Reverse_Barbell_Curl', 'Braquial, antebrazo', 'Barra con agarre prono.', 'Sube con los codos quietos.', 'Baja lento.'),

  // Tríceps
  triceps: h('Triceps_Pushdown', 'Tríceps', 'Frente a la polea alta, codos pegados.', 'Empuja hacia abajo hasta estirar.', 'Sube sin separar los codos.'),
  ropepush: h('Triceps_Pushdown_-_Rope_Attachment', 'Tríceps', 'Cuerda en la polea alta.', 'Empuja abajo separando las manos al final.', 'Sube controlado.'),
  skullcrusher: h('EZ-Bar_Skullcrusher', 'Tríceps', 'Tumbado, barra sobre el pecho con brazos estirados.', 'Flexiona los codos bajando la barra a la frente.', 'Estira de nuevo.'),
  overheadext: h('Cable_Rope_Overhead_Triceps_Extension', 'Tríceps (cabeza larga)', 'De espaldas a la polea, cuerda detrás de la cabeza.', 'Estira los brazos hacia delante y arriba.', 'Vuelve lento.'),
  dboverhead: h('Standing_Dumbbell_Triceps_Extension', 'Tríceps (cabeza larga)', 'Mancuerna con las dos manos sobre la cabeza.', 'Bájala por detrás de la cabeza.', 'Estira arriba.'),
  closebench: h('Close-Grip_Barbell_Bench_Press', 'Tríceps, pecho', 'Tumbado, agarre a la anchura de hombros.', 'Baja con los codos pegados.', 'Empuja.'),
  kickback: h('Tricep_Dumbbell_Kickback', 'Tríceps', 'Inclinado, codo pegado al cuerpo.', 'Estira el brazo hacia atrás.', 'Vuelve lento.'),
  benchdip: h('Bench_Dips', 'Tríceps', 'Manos en un banco detrás de ti.', 'Baja flexionando los codos.', 'Empuja arriba.'),
  dipmachine: h('Dip_Machine', 'Tríceps, pecho', 'Sentado en la máquina de fondos.', 'Empuja los agarres abajo.', 'Vuelve lento.'),

  // Core
  pallof: h('Pallof_Press', 'Core antirrotación', 'De lado a la polea, agarre en el pecho.', 'Estira los brazos delante sin dejar que el cuerpo gire.', 'Vuelve al pecho.'),
  legraise: h('Hanging_Leg_Raise', 'Abdomen, flexores de cadera', 'Colgado de la barra.', 'Sube las piernas sin balancearte.', 'Baja lento.'),
  kneeraise: h('Knee_Hip_Raise_On_Parallel_Bars', 'Abdomen', 'Apoyado en paralelas o silla romana.', 'Sube las rodillas al pecho.', 'Baja controlado.'),
  abwheel: h('Ab_Roller', 'Abdomen', 'De rodillas con la rueda delante.', 'Rueda hacia delante sin hundir la lumbar.', 'Vuelve con el abdomen.'),
  cablecrunch: h('Cable_Crunch', 'Abdomen', 'De rodillas, cuerda junto a la cabeza.', 'Encógete llevando los codos a los muslos.', 'Vuelve lento.'),
  machinecrunch: h('Ab_Crunch_Machine', 'Abdomen', 'Sentado en la máquina.', 'Encógete hacia delante.', 'Vuelve lento.'),
  reversecrunch: h('Reverse_Crunch', 'Abdomen inferior', 'Tumbado, rodillas flexionadas arriba.', 'Lleva las rodillas al pecho despegando la cadera.', 'Baja lento.'),
  plank: h('Plank', 'Core', 'Antebrazos en el suelo, cuerpo recto.', 'Aprieta abdomen y glúteo.', 'Aguanta el tiempo marcado.'),
  sideplank: h('Side_Bridge', 'Oblicuos, glúteo medio', 'De lado sobre un antebrazo.', 'Eleva la cadera en línea recta.', 'Aguanta.'),
  deadbug: h('Dead_Bug', 'Core', 'Boca arriba, brazos y rodillas arriba.', 'Estira brazo y pierna contrarios sin despegar la lumbar.', 'Vuelve y cambia de lado.'),
  woodchop: h('Standing_Cable_Wood_Chop', 'Oblicuos, core', 'De lado a la polea alta.', 'Tira en diagonal hacia la cadera contraria girando el tronco.', 'Vuelve controlado.'),
  russian: h('Russian_Twist', 'Oblicuos', 'Sentado, torso inclinado atrás.', 'Gira el tronco de lado a lado.', 'Con peso si quieres más.'),

  // Otros
  farmer: h('Farmers_Walk', 'Agarre, trapecio, core', 'Coge dos mancuernas pesadas.', 'Camina erguido con pasos cortos.', 'No dejes que los hombros caigan.'),
  shrug: h('Dumbbell_Shrug', 'Trapecio', 'De pie, mancuernas a los lados.', 'Sube los hombros hacia las orejas.', 'Baja lento.'),
  barbellshrug: h('Barbell_Shrug', 'Trapecio', 'Barra delante de los muslos.', 'Encoge los hombros.', 'Baja lento.'),
  wristcurl: h('Seated_Dumbbell_Palms-Up_Wrist_Curl', 'Antebrazo', 'Antebrazos sobre los muslos, palmas arriba.', 'Flexiona las muñecas.', 'Baja lento.'),
}
