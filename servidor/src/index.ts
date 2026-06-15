// ============================================================================
// Punto de entrada: Express + Socket.IO. Carga el banco de palabras y arranca.
// Tambien sirve los metatags Open Graph por sala (Feature 2 del complemento).
// ============================================================================

import { createServer } from "http";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { Request } from "express";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import {
  EventosClienteAServidor,
  EventosServidorACliente,
} from "./tipos";
import { cargarPalabras } from "./palabras";
import { registrarEventos } from "./eventos";

const PUERTO = Number(process.env.PORT) || 3001;
// Origenes permitidos para CORS. "*" en dev; en produccion define CLIENT_URL.
const ORIGEN = process.env.CLIENT_URL || "*";

interface DatosOG {
  title: string;
  description: string;
  image: string;
  url: string;
}

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Quita metatags og/twitter existentes e inyecta los dinamicos antes de </head>. */
function inyectarOG(html: string, og: DatosOG): string {
  const limpio = html.replace(
    /\s*<meta[^>]+(property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/g,
    ""
  );
  const tags = `
    <meta property="og:title" content="${escapar(og.title)}" />
    <meta property="og:description" content="${escapar(og.description)}" />
    <meta property="og:image" content="${escapar(og.image)}" />
    <meta property="og:url" content="${escapar(og.url)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapar(og.title)}" />
    <meta name="twitter:description" content="${escapar(og.description)}" />
    <meta name="twitter:image" content="${escapar(og.image)}" />
  `;
  return limpio.replace(/<\/head>/i, `${tags}\n</head>`);
}

function baseURL(req: Request): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function main(): void {
  const cantidad = cargarPalabras();
  console.log(`[servidor] ${cantidad} palabras cargadas.`);

  const app = express();
  app.set("trust proxy", true); // respeta x-forwarded-proto en Render/Railway
  app.use(cors({ origin: ORIGEN }));

  // Healthcheck simple (util en Render/Railway).
  app.get("/salud", (_req, res) => {
    res.json({ ok: true, palabras: cantidad });
  });

  const dirCliente = join(__dirname, "..", "..", "cliente", "dist");
  const rutaIndex = join(dirCliente, "index.html");
  const hayCliente = existsSync(rutaIndex);
  const plantillaIndex = hayCliente ? readFileSync(rutaIndex, "utf-8") : "";

  // -------------------------------------------------------------- Open Graph
  // El link de invitacion /sala/:codigo devuelve el HTML del SPA con metatags
  // dinamicos, para que WhatsApp/Discord muestren una tarjeta atractiva.
  app.get("/sala/:codigo", (req, res) => {
    const codigo = String(req.params.codigo || "").toUpperCase().slice(0, 16);
    const base = baseURL(req);
    const og: DatosOG = {
      title: "¡Vente a dibujar! — Pinturillo Chile",
      description:
        "Únete a esta sala y adivina dibujos bien chilenos con tus amigos.",
      image: `${base}/og-image.png`,
      url: `${base}/sala/${codigo}`,
    };

    if (hayCliente) {
      res.set("Content-Type", "text/html; charset=utf-8");
      res.send(inyectarOG(plantillaIndex, og));
      return;
    }

    // Sin build del cliente (modo dev del backend): HTML minimo con OG.
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(
      `<!doctype html><html lang="es"><head><meta charset="utf-8" />` +
        `<title>${escapar(og.title)}</title>` +
        `<meta property="og:title" content="${escapar(og.title)}" />` +
        `<meta property="og:description" content="${escapar(og.description)}" />` +
        `<meta property="og:image" content="${escapar(og.image)}" />` +
        `<meta property="og:url" content="${escapar(og.url)}" />` +
        `<meta property="og:type" content="website" />` +
        `<meta name="twitter:card" content="summary_large_image" />` +
        `</head><body><p>Abre el juego en el cliente (Vite, puerto 5173): ` +
        `<a href="http://localhost:5173/sala/${codigo}">entrar a la sala ${escapar(
          codigo
        )}</a>.</p></body></html>`
    );
  });

  // Servir el build estatico del cliente si existe (despliegue todo-en-uno).
  if (hayCliente) {
    app.use(express.static(dirCliente));
    app.get("*", (_req, res) => {
      res.sendFile(rutaIndex);
    });
    console.log(`[servidor] Sirviendo cliente estatico desde ${dirCliente}`);
  }

  const httpServer = createServer(app);
  const io = new Server<EventosClienteAServidor, EventosServidorACliente>(
    httpServer,
    {
      cors: { origin: ORIGEN, methods: ["GET", "POST"] },
    }
  );

  registrarEventos(io);

  httpServer.listen(PUERTO, () => {
    console.log(`[servidor] Pinturillo Chile escuchando en :${PUERTO}`);
  });
}

main();
