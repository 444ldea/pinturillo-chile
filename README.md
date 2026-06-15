# Pinturillo Chile 🎨🇨🇱

Juego web multijugador en tiempo real de **dibujar y adivinar** con temática
chilena, al estilo de skribbl.io / Pinturillo. Un jugador dibuja una palabra y
los demás intentan adivinarla en el chat contra el reloj.

- **Frontend:** React 18 + Vite + TypeScript + `<canvas>` 2D
- **Backend:** Node 20+ + Express + Socket.IO 4 + TypeScript
- **Estado:** en memoria (sin base de datos)
- **Banco:** 498 palabras chilenas en `palabras.json` (un solo pozo, ~30 categorías)

---

## Estructura

```
pinturillo-chile/
├── package.json        # workspaces: servidor + cliente
├── palabras.json       # banco de palabras
├── servidor/           # Express + Socket.IO (lógica del juego)
│   └── src/
│       ├── index.ts        tipos.ts      salas.ts     juego.ts
│       ├── pistas.ts       validacion.ts puntaje.ts   palabras.ts
│       └── eventos.ts
├── scripts/
│   └── generar-og.cjs  # genera cliente/public/og-image.png (sin dependencias)
└── cliente/            # React + Vite
    ├── public/og-image.png
    └── src/
        ├── App.tsx  main.tsx  socket.ts  estado.tsx  tipos.ts  dibujo.ts  estilos.css
        ├── pantallas/  (Inicio, Lobby, Juego, ResultadosRonda, Podio, EntradaLink)
        └── componentes/(Lienzo, Guiones, Chat, ListaJugadores, BarraSuperior,
                         SelectorPalabra, BotonInvitar, Galeria)
```

---

## Requisitos

- Node.js 20 o superior y npm 9+.

## Instalación

Desde la raíz del proyecto (instala servidor y cliente vía workspaces):

```bash
npm install
```

## Desarrollo

Levanta **servidor (puerto 3001)** y **cliente (puerto 5173)** a la vez:

```bash
npm run dev
```

O en dos terminales separadas:

```bash
npm run dev:servidor
npm run dev:cliente
```

Luego abre **http://localhost:5173**. Para probar el multijugador, abre dos o
más pestañas/navegadores: crea una sala en una y únete con el código en las
otras.

> El cliente toma la URL del backend de `VITE_SERVER_URL`. En desarrollo, si no
> la defines, usa `http://localhost:3001` automáticamente. Copia
> `cliente/.env.example` a `cliente/.env` si quieres personalizarla.

## Build de producción

```bash
npm run build          # compila servidor (tsc) y cliente (vite build)
npm start              # arranca el servidor en :3001
```

Si existe `cliente/dist`, el servidor **también sirve el frontend** desde el
mismo origen (despliegue todo-en-uno): tras `npm run build`, `npm start` deja el
juego completo en `http://localhost:3001`.

---

## Jugar online al toque (túnel, sin desplegar)

Para una partida rápida con amigos sin subir nada a un servidor, expón tu PC con
un túnel público (usa [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/),
gratis y sin cuenta):

```bash
# requiere cloudflared:  winget install Cloudflare.cloudflared
npm run online
```

El comando hace `build`, levanta el servidor en el puerto 8787 y abre un túnel.
En la terminal verás algo así:

```
=================================================
  🎮  Comparte este link con tus amigos:
      https://xxxx-xxxx.trycloudflare.com
  (deja esta ventana abierta mientras juegan)
=================================================
```

Comparte ese link, crea una sala y manda el botón **"Invitar amigos"**. Mientras
la ventana siga abierta, el juego está online. El link es temporal: cada vez que
lo corres cambia. Tu PC debe permanecer encendida.

> Para un link **fijo y siempre disponible** (que no dependa de tu PC), usa el
> despliegue en Render/Railway de la sección siguiente.

## Despliegue

El estado vive en memoria y el WebSocket debe mantenerse abierto, así que el
backend **no** funciona en entornos serverless. Una sola instancia basta para
cientos de jugadores.

### Backend (Render.com / Railway.app)

1. Servicio **Web Service** (no serverless), Node 20.
2. Build: `npm install && npm run build --workspace=servidor`
3. Start: `npm start`
4. Variables de entorno:
   - `PORT` — lo provee la plataforma (el server lo respeta).
   - `CLIENT_URL` — dominio del frontend para CORS (ej. `https://tujuego.vercel.app`). Usa `*` solo para pruebas.
   - `PALABRAS_PATH` — opcional; ruta a `palabras.json` si no está junto al server.

### Frontend (Vercel / Netlify)

1. Root del proyecto: `cliente/`.
2. Build: `npm install && npm run build`
3. Output: `dist`
4. Variable de entorno: `VITE_SERVER_URL` = URL pública del backend.

### Alternativa todo-en-uno

Despliega solo el backend con el `cliente/dist` ya compilado al lado; el servidor
sirve el frontend y la API por el mismo origen (no necesitas configurar CORS ni
`VITE_SERVER_URL`).

---

## Cómo se juega

1. Escribe tu nombre y **crea una sala** (o únete con un código tipo `PALT-1234`).
2. En el lobby, el anfitrión ajusta vueltas, segundos por ronda y máximo de
   jugadores, y pulsa **Iniciar** (mínimo 2 jugadores).
3. En cada ronda, el dibujante elige 1 de **3 palabras de 3 categorías** y dibuja.
4. Los demás ven los **guiones con espacios** y las **preposiciones
   pre-rellenadas** (de, del, la…), y escriben sus intentos en el chat.
5. El servidor revela **pistas** (letras al azar) a lo largo del tiempo.
6. Adivinar más rápido da más puntos; el dibujante gana según cuántos aciertan.
7. Tras completar todas las vueltas se muestra el **podio**.

## Features de crecimiento (retención e invitación)

Además de la mecánica, el juego está pensado para crecer por invitación:

- **Link de invitación instantáneo** (`/sala/CODIGO`). Abrir el link entra directo
  a la sala: pide el nombre solo si no lo tienes guardado; si ya lo tienes, entra
  de un clic. Si la sala no existe → mensaje amable + "Crear sala nueva"; si está
  llena → "Entrar como espectador" o "Crear otra sala"; si la partida ya empezó,
  entras y juegas desde la ronda siguiente.
- **Botón "Invitar amigos"** (en el lobby y siempre visible durante el juego). En
  móvil usa `navigator.share()` (WhatsApp, etc.); en desktop copia el link y
  ofrece un botón directo a WhatsApp Web.
- **Previsualización Open Graph.** El backend sirve `GET /sala/:codigo` con
  metatags OG dinámicos, así que al pegar el link en WhatsApp/Discord aparece una
  tarjeta con título, descripción e imagen. La imagen vive en
  `cliente/public/og-image.png` (1200×630) y se regenera con:
  ```bash
  node scripts/generar-og.cjs
  ```
- **Galería compartible.** Al terminar la partida, el podio muestra "La galería"
  con los dibujos de cada ronda (palabra + autor). Cada uno se puede **guardar
  como PNG** (o compartir en móvil), y hay un botón **"Compartir la galería"** que
  arma un collage con el link del juego. Los dibujos viven en memoria y se exportan
  localmente (no se guardan en disco ni base de datos).
- **Modo espectador.** Si la sala está llena, puedes entrar a mirar: ves el juego
  y el chat, pero no dibujas, no puntúas y no puedes spoilear la palabra.
- **Cero fricción.** Sin cuentas ni email; el nombre se recuerda; crear sala = un
  clic y el link queda listo para compartir; reconexión automática al recargar.

> Nota de despliegue para OG: las tarjetas dinámicas por sala las sirve el backend
> (`/sala/:codigo`), así que para que WhatsApp lea la imagen correcta, el link
> compartido debe apuntar al backend (modo todo-en-uno) o usar `PUBLIC_URL`. En
> hosting estático (Vercel) funciona la tarjeta genérica de `index.html`.

### Detalles del juego implementados

- **Validación inteligente:** tolera tildes, mayúsculas y 1–2 errores de tipeo
  (Levenshtein). En frases no exige las preposiciones, pero sí todas las
  palabras con contenido.
- **Anti-trampa:** la palabra nunca viaja a los adivinadores (solo la máscara);
  el dibujante no puede chatear; quien ya acertó no revela la palabra en público.
- **Reconexión:** el token del jugador se guarda en `localStorage`; al recargar
  la página, vuelves a tu sala conservando puntaje y el lienzo.
- **Responsive:** funciona en desktop y móvil (lienzo con coordenadas
  normalizadas 0..1).
- **Rate limiting** (≈30 trazos/s, ≈5 mensajes/s) y limpieza de salas vacías a
  los 5 minutos.

---

## Variables de entorno (resumen)

| Variable          | Lado     | Por defecto             | Descripción                          |
|-------------------|----------|-------------------------|--------------------------------------|
| `PORT`            | servidor | `3001`                  | Puerto HTTP/WebSocket                |
| `CLIENT_URL`      | servidor | `*`                     | Origen permitido para CORS           |
| `PUBLIC_URL`      | servidor | (deriva del request)    | URL pública base para los metatags OG |
| `PALABRAS_PATH`   | servidor | autodetección          | Ruta a `palabras.json`               |
| `VITE_SERVER_URL` | cliente  | `http://localhost:3001` | URL del backend                      |
