# PROMPT MAESTRO — Pinturillo Chile

> Copia este documento completo como instrucción para Claude Opus 4.8 (o el modelo
> que uses). Está escrito como un encargo de desarrollo: define qué construir, con
> qué tecnología, y con qué reglas exactas. El archivo `palabras.json` acompaña
> este prompt y contiene el banco de palabras. Entrega el proyecto completo y
> funcional.

---

## INSTRUCCIÓN PARA EL MODELO

Eres un ingeniero full-stack senior. Tu tarea es construir un juego web
multijugador en tiempo real llamado **Pinturillo Chile**: un juego de dibujar y
adivinar con temática chilena, al estilo de skribbl.io / Pinturillo. Debe quedar
completo, funcional y listo para desplegar. Construye todos los archivos del
proyecto, no solo fragmentos.

Sigue esta especificación al pie de la letra. Donde haya ambigüedad, prioriza la
simplicidad y que el juego sea jugable de inmediato.

---

## 1. Concepto del juego

Un grupo de amigos entra a una sala con un código. En cada ronda, un jugador (el
**dibujante**) elige una palabra entre 3 opciones y la dibuja en un lienzo
compartido. Los demás (**adivinadores**) escriben sus intentos en un chat. Quien
adivina más rápido gana más puntos. Tras varias rondas, gana quien acumule más
puntaje.

### Flujo de una ronda
1. El servidor elige al dibujante (rota por turnos).
2. Le ofrece **3 palabras de 3 categorías distintas**.
3. El dibujante elige una (o el servidor elige por él tras 10s).
4. Todos ven los guiones de la palabra (ver sección 5) y la categoría.
5. El dibujante dibuja; los demás adivinan contra el reloj.
6. El servidor valida cada intento, revela pistas con el tiempo y reparte puntaje.
7. Termina la ronda (todos aciertan o se acaba el tiempo) y pasa al siguiente.

---

## 2. Stack tecnológico obligatorio

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Lienzo | HTML5 `<canvas>` 2D nativo |
| Comunicación | Socket.IO 4.x |
| Backend | Node.js 20 + Express + Socket.IO 4.x + TypeScript |
| Estado | En memoria (Map de salas). Sin base de datos en v1. |

Usa TypeScript en cliente y servidor, compartiendo los tipos de los eventos para
garantizar el contrato. El juego debe funcionar en desktop y móvil (responsive).

---

## 3. Banco de palabras (`palabras.json`)

El archivo adjunto es un único pozo de palabras con esta estructura:

```json
{
  "version": 3,
  "cantidad": 498,
  "palabras": [
    { "palabra": "Empanada",         "categoria": "Comida",               "multipalabra": false },
    { "palabra": "Torres del Paine",  "categoria": "Maravillas naturales", "multipalabra": true  },
    ...
  ]
}
```

Cada palabra es un objeto con tres campos:
- `palabra`: el texto a dibujar/adivinar.
- `categoria`: etiqueta legible (sirve para elegir conceptos de categorías
  distintas y para mostrar la categoría al jugador). Hay ~30 categorías.
- `multipalabra`: `true` si tiene espacios (frases como "Torres del Paine"). Esto
  afecta cómo se muestran los guiones y cómo se validan los intentos (secciones 5
  y 6).

No hay modos de juego: es un solo pozo. La variedad la da la selección de 3
conceptos por ronda (el dibujante elige cuál dibujar).

### Selección de las 3 opciones por ronda
Elige 3 palabras del pozo que pertenezcan a **3 categorías distintas** (campo
`categoria`), para dar variedad. Ninguna palabra se repite dentro de la misma
partida (mantén un `Set` de palabras usadas). Si ya no quedan 3 categorías
distintas disponibles, relaja la restricción y elige 3 palabras cualesquiera no
usadas.

---

## 4. Modelo de datos (estado del servidor)

```typescript
type EstadoSala = "lobby" | "eligiendo" | "dibujando" | "fin_ronda" | "fin_partida";

interface Jugador {
  id: string;            // socket.id
  tokenJugador: string;  // UUID propio del cliente, persiste en localStorage (reconexión)
  nombre: string;        // máx 16 chars, sanitizado
  puntaje: number;
  esAnfitrion: boolean;
  conectado: boolean;
  haAcertadoEstaRonda: boolean;
  ordenAcierto: number | null;
  _puntosRondaActual?: number; // temporal, para el desglose
}

interface Trazo {
  puntos: { x: number; y: number }[]; // coords NORMALIZADAS 0..1
  color: string;   // hex
  grosor: number;  // 2..40
}

interface Sala {
  codigo: string;            // ej "PERR-1234"
  estado: EstadoSala;
  jugadores: Jugador[];
  anfitrionId: string;

  config: {
    totalVueltas: number;      // por defecto 3 (cada jugador dibuja 3 veces)
    segundosPorRonda: number;  // por defecto 80
    maxJugadores: number;      // por defecto 8
  };

  vueltaActual: number;          // 1-indexed
  indiceDibujante: number;       // posición en jugadores[]
  palabraSecreta: string | null; // SOLO servidor
  categoriaActual: string | null;
  opcionesPalabras: { palabra: string; categoria: string }[];

  // Estado de guiones y pistas (sección 5)
  mascara: (string | null)[];    // por carácter: la letra si está revelada, null si oculta, " " para espacios
  indicesRevelables: number[];   // posiciones de letras que pueden revelarse como pista
  indicesYaRevelados: number[];  // posiciones ya reveladas por pistas
  pistasProgramadas: number[];   // segundos (de tiempoRestante) en los que cae cada pista

  trazos: Trazo[];
  tiempoRestante: number;
  timerId: NodeJS.Timeout | null;

  palabrasUsadas: Set<string>;
}
```

---

## 5. Guiones y pistas (REGLAS CLAVE)

Esta es una parte central. Préstale especial atención.

### 5.1. Qué ve el adivinador

El adivinador ve la palabra como **guiones, con los espacios visibles entre
palabras**. Para "Torres del Paine" (6, 3, 5 letras) ve:

```
______ ___ _____
```

Esto significa que el adivinador **conoce el número de palabras y la longitud
exacta de cada una**. Es información que el validador debe asumir como conocida.

### 5.2. Preposiciones pre-rellenadas

Las palabras vacías (preposiciones y artículos) aparecen **ya escritas** en los
guiones, no ocultas. La lista de palabras vacías es:

```
el, la, los, las, de, del, y, un, una, e, o, al
```

Para "Torres del Paine", el adivinador ve desde el inicio:

```
______ del _____
```

Es decir, "del" se muestra completo. Solo "Torres" y "Paine" están ocultas.
Para "Valle de la Luna" vería: `_____ de la ____`.

### 5.3. Construcción de la máscara

Al iniciar la ronda, el servidor construye `mascara` carácter por carácter:
- Si el carácter es un espacio → `" "` (se muestra como separación entre grupos).
- Si el carácter pertenece a una palabra vacía → se revela desde el inicio (la letra).
- Si pertenece a una palabra con contenido → `null` (oculto, se muestra como `_`).

`indicesRevelables` = todas las posiciones que quedaron en `null` (las letras
ocultas de las palabras con contenido). Son las únicas que las pistas pueden
revelar.

### 5.4. Pistas progresivas (por azar, según longitud)

El servidor revela letras ocultas a lo largo del tiempo como pista. Reglas:

1. **Cuántas letras revelar en total** depende de la longitud de la palabra (solo
   contando letras ocultas, es decir `indicesRevelables.length`):

   ```
   const ocultas = indicesRevelables.length;
   const totalPistas = Math.max(1, Math.floor(ocultas / 4));
   ```
   Ejemplos: palabra con 4 letras ocultas → 1 pista; con 8 → 2 pistas; con 12 → 3.
   Nunca revelar más de, digamos, el 50% de las letras ocultas (pon un tope:
   `Math.min(totalPistas, Math.floor(ocultas/2))`).

2. **Cuándo caen**: reparte las pistas uniformemente en la segunda mitad del
   reloj. Si la ronda dura 80s y hay 2 pistas, podrían caer cuando
   `tiempoRestante` llega a ~40s y a ~20s. Calcula los instantes al iniciar la
   ronda y guárdalos en `pistasProgramadas`.

3. **Qué letra revelar**: se elige **al azar** entre las posiciones de
   `indicesRevelables` que aún no se han revelado (`indicesYaRevelados`). Nunca se
   revelan preposiciones (ya están visibles). Cada vez que cae una pista, se
   actualiza `mascara` en esa posición y se difunde a todos.

4. **Las pistas siguen cayendo aunque alguien ya haya adivinado.** No se congelan.
   El que ya acertó se llevó sus puntos; los demás siguen recibiendo ayuda.

5. Cuando cae una pista, el servidor difunde el evento `pista_revelada` con la
   máscara actualizada (las posiciones reveladas, no la palabra completa).

### 5.5. Importante sobre seguridad

El servidor **nunca** envía la palabra completa a los adivinadores hasta que la
ronda termina. Solo envía la `mascara` (con los `null` representados como `_` en
el cliente, o como un arreglo de letras/espacios/null). La palabra completa se
revela en `ronda_terminada`.

---

## 6. Validación de adivinanzas (VALIDADOR INTELIGENTE)

El validador debe tolerar errores de tipeo y, en frases, no exigir las
preposiciones. Implementa exactamente esta lógica.

### 6.1. Normalización

```typescript
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9ñ ]/g, "")                       // quita símbolos
    .replace(/\s+/g, " ")                              // colapsa espacios
    .trim();
}
```

Así "Cóndor", "condor" y "CÓNDOR" son equivalentes.

### 6.2. Distancia de edición (Levenshtein)

Implementa `levenshtein(a, b)` (distancia de edición estándar). Se usa para
tolerar errores de tipeo.

### 6.3. Lógica de validación

```typescript
const PALABRAS_VACIAS = new Set(["el","la","los","las","de","del","y","un","una","e","o","al"]);

function umbralPorLargo(palabra: string): number {
  return palabra.length <= 5 ? 1 : 2; // palabras cortas toleran 1 error, largas 2
}

type Resultado = { acierto: boolean; cerca: boolean };

function validar(intento: string, secreta: string): Resultado {
  const ni = normalizar(intento);
  const ns = normalizar(secreta);
  if (!ni) return { acierto: false, cerca: false };
  if (ni === ns) return { acierto: true, cerca: false };

  const palSecreta = ns.split(" ");
  const esFrase = palSecreta.length > 1;

  if (!esFrase) {
    // Palabra única: tolera errores de tipeo
    const dist = levenshtein(ni, ns);
    const u = umbralPorLargo(ns);
    if (dist <= u) return { acierto: true, cerca: false };
    if (dist <= u + 1) return { acierto: false, cerca: true };
    return { acierto: false, cerca: false };
  }

  // FRASE: el adivinador ve los guiones, así que exigimos todas las palabras
  // CON CONTENIDO (ignoramos las preposiciones, que ya están pre-rellenadas).
  const significativas = palSecreta.filter(w => !PALABRAS_VACIAS.has(w));
  const palIntento = ni.split(" ");

  let aciertos = 0;
  for (const cs of significativas) {
    for (const ci of palIntento) {
      if (levenshtein(ci, cs) <= umbralPorLargo(cs)) { aciertos++; break; }
    }
  }

  if (aciertos === significativas.length) return { acierto: true, cerca: false };
  if (aciertos >= Math.ceil(significativas.length * 0.6)) return { acierto: false, cerca: true };
  return { acierto: false, cerca: false };
}
```

### 6.4. Comportamiento esperado

Para "Torres del Paine" (significativas: "torres", "paine"):
- "torres del paine" → acierto
- "Torres Del Paine" → acierto (normalización)
- "torres paine" → acierto (ignora "del")
- "torrez paine" → acierto (1 error de tipeo en "torres")
- "torres" → NO (falta "paine"); marcar como "cerca"
- "paine" → NO (falta "torres"); marcar como "cerca"

Para "Empanada" (palabra única):
- "empanada" → acierto
- "empnada" → acierto (1 error)
- "pino" → no

### 6.5. Reglas de chat durante validación

- El **dibujante** no puede escribir en el chat durante `dibujando` (el servidor
  ignora sus mensajes).
- Si un mensaje es acierto → no se muestra en el chat público (para no revelar la
  palabra). Se emite `jugador_acerto` (sin la palabra).
- Si un jugador **ya acertó**, sus mensajes posteriores solo los ven otros que
  también acertaron (chat privado de "los que ya saben").
- Si un mensaje está "cerca" (pero no es acierto), opcionalmente enviar al emisor
  un aviso privado "¡Estás muy cerca!" sin revelar nada. El mensaje sí se muestra
  en el chat público como intento normal.

---

## 7. Sistema de puntaje

### 7.1. Adivinadores (premia velocidad)

```typescript
function puntosAdivinador(sala: Sala): number {
  const total = sala.config.segundosPorRonda;
  const restante = sala.tiempoRestante;
  const base = 50;
  const bonus = Math.round((restante / total) * 100); // 0..100
  return base + bonus; // rango 50..150
}
```

Ejemplo (ronda de 80s): acertar con 70s restantes → 138 pts; con 40s → 100; con
5s → 56.

### 7.2. Dibujante (premia claridad)

```typescript
function puntosDibujante(sala: Sala): number {
  const cuantos = sala.jugadores.filter(j => j.haAcertadoEstaRonda).length;
  return cuantos * 25;
}
```

### 7.3. Casos borde
- Nadie adivina → dibujante y adivinadores ganan 0.
- Cada adivinador conserva lo que ganó al momento de acertar.
- El puntaje se acumula en `jugador.puntaje` durante toda la partida.

---

## 8. Protocolo de eventos Socket.IO

### Cliente → Servidor

| Evento | Payload | Validación |
|---|---|---|
| `crear_sala` | `{ nombre, tokenJugador }` | Sanitiza nombre, genera código único |
| `unirse_sala` | `{ codigo, nombre, tokenJugador }` | Sala existe, no llena (o reconexión por token) |
| `actualizar_config` | `{ totalVueltas?, segundosPorRonda?, maxJugadores? }` | Emisor anfitrión, estado=lobby |
| `iniciar_partida` | `{}` | Emisor anfitrión, ≥2 jugadores, estado=lobby |
| `elegir_palabra` | `{ indice: 0\|1\|2 }` | Emisor dibujante, estado=eligiendo |
| `dibujar_trazo` | `{ trazo }` | Emisor dibujante, estado=dibujando |
| `limpiar_lienzo` | `{}` | Emisor dibujante, estado=dibujando |
| `enviar_mensaje` | `{ texto }` | No vacío, máx 100 chars |
| `volver_lobby` | `{}` | Emisor anfitrión, estado=fin_partida |
| `salir_sala` | `{}` | — |

### Servidor → Cliente

| Evento | Payload | Destinatario |
|---|---|---|
| `sala_creada` | `{ codigo, jugador }` | Creador |
| `estado_sala` | `{ sala: SalaPublica }` | Toda la sala |
| `jugador_unido` | `{ jugador }` | Toda la sala |
| `jugador_salio` | `{ jugadorId }` | Toda la sala |
| `elige_palabra` | `{ opciones: {palabra,categoria}[] }` | Solo dibujante |
| `esperando_dibujante` | `{ nombreDibujante }` | Todos menos dibujante |
| `ronda_iniciada` | `{ mascara, categoria, nombreDibujante, segundos }` | Toda la sala |
| `trazo_nuevo` | `{ trazo }` | Todos menos dibujante |
| `lienzo_limpiado` | `{}` | Todos menos dibujante |
| `tiempo_actualizado` | `{ tiempoRestante }` | Toda la sala |
| `pista_revelada` | `{ mascara }` | Toda la sala |
| `mensaje_chat` | `{ jugadorId, nombre, texto }` | Toda la sala (o solo acertadores) |
| `casi_aciertas` | `{}` | Solo el emisor |
| `jugador_acerto` | `{ jugadorId, nombre, orden }` | Toda la sala |
| `ronda_terminada` | `{ palabra, categoria, resultados }` | Toda la sala |
| `partida_terminada` | `{ podio }` | Toda la sala |
| `error_juego` | `{ codigo, mensaje }` | Emisor |

### Tipos auxiliares

```typescript
interface SalaPublica {
  codigo: string;
  estado: EstadoSala;
  jugadores: Jugador[];
  config: Sala["config"];
  vueltaActual: number;
  totalVueltas: number;
  dibujanteId: string | null;
  categoriaActual: string | null;
  mascara: (string | null)[] | null; // letras visibles, null = oculto, " " = espacio
  tiempoRestante: number;
  // NUNCA incluye palabraSecreta ni opcionesPalabras
}

interface ResultadoRonda {
  jugadorId: string;
  nombre: string;
  puntosGanados: number;
  puntajeTotal: number;
  acerto: boolean;
  orden: number | null;
}
```

---

## 9. Máquina de estados

```
lobby → eligiendo → dibujando → fin_ronda → (eligiendo | fin_partida)
fin_partida → lobby (al reiniciar)
```

- **lobby → eligiendo**: anfitrión emite `iniciar_partida` (≥2 jugadores). Resetea
  puntajes, fija `vueltaActual=1`, `indiceDibujante=0`, genera 3 opciones, las
  envía al dibujante, inicia sub-timer de 10s.
- **eligiendo → dibujando**: dibujante emite `elegir_palabra` (o auto tras 10s).
  Fija `palabraSecreta`, construye `mascara`, calcula `pistasProgramadas`, limpia
  trazos, resetea flags, inicia el reloj.
- **dibujando → fin_ronda**: todos aciertan o `tiempoRestante=0`. Detiene reloj,
  calcula puntajes, difunde `ronda_terminada` con la palabra revelada. Espera 6s.
- **fin_ronda → eligiendo**: avanza `indiceDibujante`. Si volvió a 0, incrementa
  vuelta. Si se completaron `totalVueltas` → `fin_partida`.
- **fin_ronda → fin_partida**: última ronda. Difunde `partida_terminada` con podio
  ordenado por puntaje.

### Reconexión
El cliente guarda `tokenJugador` (UUID) en localStorage. Al volver, `unirse_sala`
incluye el token; si hay un jugador desconectado con ese token, se reactiva
conservando su puntaje y se le reenvía `estado_sala` + historial de `trazos`. Si
el dibujante se desconecta >15s a mitad de ronda, termina la ronda sin puntos.

---

## 10. Frontend (pantallas y lienzo)

### Pantallas
1. **Inicio**: campo de nombre + "Crear sala" / "Unirse con código".
2. **Lobby**: código grande y copiable, lista de jugadores, panel de config (solo
   anfitrión): vueltas, segundos por ronda, máximo de jugadores. Botón "Iniciar".
3. **Juego**: barra superior (vuelta, categoría, guiones de la palabra con
   espacios visibles, reloj) + lienzo central + panel derecho (lista de jugadores
   con puntaje y check, chat). Solo el dibujante ve paleta de color/grosor y la
   palabra completa; para él el chat se desactiva.
4. **Resultados de ronda**: overlay con palabra revelada y desglose de puntos.
5. **Podio final**: top 3 + tabla completa, botón "Jugar de nuevo".

### Lienzo (canvas)
- Coordenadas NORMALIZADAS (0..1): `x = (clientX - rect.left) / rect.width`. Al
  renderizar se multiplican por el tamaño real. Así el dibujo se ve igual en
  cualquier pantalla.
- El dibujante captura trazos con eventos `pointerdown/move/up` y emite el trazo
  completo al soltar (`dibujar_trazo`). Feedback local inmediato mientras dibuja.
- Los adivinadores reciben `trazo_nuevo` y lo dibujan. Al reconectar, reciben todo
  `sala.trazos` y los re-renderizan en orden.
- Herramientas mínimas del dibujante: selector de color (paleta de ~8 colores +
  negro/goma), selector de grosor (3 tamaños), botón limpiar.

### Render de los guiones
Recibe `mascara` (arreglo de letras/espacios/null). Renderiza cada posición:
- letra → muestra la letra (preposición pre-rellenada o pista revelada)
- `null` → muestra `_`
- `" "` → muestra un espacio mayor entre grupos
Mantén el monoespaciado para que los guiones se alineen.

---

## 11. Estructura de archivos

```
pinturillo-chile/
├── package.json                 # workspaces: cliente + servidor
├── palabras.json                # banco adjunto (cópialo a servidor/src/ o /public)
├── README.md                    # instrucciones de instalación y despliegue
│
├── servidor/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # Express + Socket.IO
│       ├── tipos.ts             # interfaces (secciones 4, 8)
│       ├── salas.ts             # Map de salas, crear/unir/salir, códigos
│       ├── juego.ts             # máquina de estados, rondas, reloj
│       ├── pistas.ts            # construcción de máscara y pistas (sección 5)
│       ├── validacion.ts        # normalizar, levenshtein, validar (sección 6)
│       ├── puntaje.ts           # fórmulas (sección 7)
│       ├── palabras.ts          # carga JSON, selección de 3 opciones
│       └── eventos.ts           # handlers Socket.IO
│
└── cliente/
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx              # router de pantallas según estado
        ├── socket.ts           # instancia Socket.IO + wrappers
        ├── tipos.ts            # MISMO contrato de eventos que el servidor
        ├── pantallas/
        │   ├── Inicio.tsx
        │   ├── Lobby.tsx
        │   ├── Juego.tsx
        │   ├── ResultadosRonda.tsx
        │   └── Podio.tsx
        └── componentes/
            ├── Lienzo.tsx
            ├── Guiones.tsx       # render de la máscara con espacios
            ├── Chat.tsx
            ├── ListaJugadores.tsx
            ├── BarraSuperior.tsx
            └── SelectorPalabra.tsx
```

---

## 12. Seguridad y anti-trampa

- La palabra secreta **nunca** se envía a adivinadores (solo `mascara`).
- El servidor valida todo; el cliente no decide aciertos ni puntajes.
- El dibujante no puede chatear durante su ronda.
- Quien ya acertó no revela la palabra en el chat público.
- Sanitiza nombres y mensajes (escapa HTML, limita longitud).
- Rate limit por socket: máx ~30 trazos/s, ~5 mensajes/s.
- Elimina salas con 0 conectados tras 5 min.

---

## 13. Despliegue

Incluye en el README instrucciones para:
- **Frontend**: build estático de Vite, desplegable en Vercel o Netlify.
- **Backend**: Node con WebSocket persistente, desplegable en Render.com o
  Railway.app (NO serverless, porque el estado vive en memoria y el WebSocket debe
  mantenerse). Una sola instancia basta para cientos de jugadores.
- Variables de entorno: URL del backend en el cliente, puerto del servidor.
- Configurar CORS en el servidor para aceptar el dominio del frontend.

---

## 14. Orden de construcción sugerido

1. Servidor base (Express + Socket.IO levantado, carga `palabras.json`).
2. Salas y lobby (`crear_sala`, `unirse_sala`, `estado_sala`). Probar con 2
   pestañas.
3. Máquina de estados sin dibujo (ciclo eligiendo→dibujando→fin_ronda→siguiente).
4. Lienzo (dibujar y difundir trazos).
5. Guiones y máscara (sección 5), incluyendo preposiciones pre-rellenadas.
6. Chat y validación inteligente (sección 6).
7. Pistas progresivas (sección 5.4).
8. Puntaje, resultados de ronda, podio final (sección 7).
9. Reconexión (token en localStorage).
10. Pulido: rate limiting, sanitización, responsive móvil, sonidos/animaciones.

---

## 15. Criterios de aceptación (debe cumplirse todo)

- [ ] 2+ navegadores entran a la misma sala con un código.
- [ ] El dibujante recibe 3 palabras de 3 categorías distintas y elige una.
- [ ] Los adivinadores ven los guiones CON ESPACIOS VISIBLES entre palabras.
- [ ] Las preposiciones (de, del, la…) aparecen pre-rellenadas en los guiones.
- [ ] El servidor revela letras al azar como pista, en cantidad proporcional a la
      longitud de la palabra, repartidas en el tiempo.
- [ ] Las pistas siguen cayendo aunque alguien ya haya adivinado.
- [ ] Escribir la palabra (tolerando tildes, mayúsculas y 1-2 errores de tipeo)
      cuenta como acierto.
- [ ] En frases, no es necesario escribir las preposiciones, pero sí todas las
      palabras con contenido.
- [ ] El dibujante no puede chatear ni revelar la palabra durante su ronda.
- [ ] Quien ya acertó no puede revelar la palabra en el chat público.
- [ ] Adivinar más rápido da más puntos; el dibujante gana según cuántos aciertan.
- [ ] El turno de dibujante rota entre todos.
- [ ] Al terminar todas las vueltas se muestra un podio ordenado por puntaje.
- [ ] Recargar la página reconecta al jugador conservando su puntaje y el lienzo.
- [ ] Funciona en pantalla de celular.

---

*Construye el proyecto completo siguiendo esta especificación. El archivo
`palabras.json` está adjunto y contiene las 498 palabras del banco temático
chileno en un único pozo.*
