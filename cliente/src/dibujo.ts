// ============================================================================
// Render compartido de trazos sobre un canvas. Las coordenadas son normalizadas
// (0..1), asi que el mismo dibujo se ve igual en cualquier tamaño (lienzo grande
// o miniatura de la galeria).
// ============================================================================

import type { Trazo } from "./tipos";

export function dibujarUnTrazo(
  ctx: CanvasRenderingContext2D,
  t: Trazo,
  ancho: number,
  alto: number
) {
  if (!t.puntos || t.puntos.length === 0) return;
  ctx.strokeStyle = t.color;
  ctx.fillStyle = t.color;
  ctx.lineWidth = t.grosor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (t.puntos.length === 1) {
    const p = t.puntos[0];
    ctx.beginPath();
    ctx.arc(p.x * ancho, p.y * alto, t.grosor / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Suavizado: curvas cuadraticas pasando por los puntos medios entre vertices,
  // para que el trazo se vea fluido y no "quebrado" en segmentos rectos.
  const px = (i: number) => t.puntos[i].x * ancho;
  const py = (i: number) => t.puntos[i].y * alto;
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  if (t.puntos.length === 2) {
    ctx.lineTo(px(1), py(1));
  } else {
    for (let i = 1; i < t.puntos.length - 1; i++) {
      const mx = (px(i) + px(i + 1)) / 2;
      const my = (py(i) + py(i + 1)) / 2;
      ctx.quadraticCurveTo(px(i), py(i), mx, my);
    }
    const n = t.puntos.length - 1;
    ctx.quadraticCurveTo(px(n - 1), py(n - 1), px(n), py(n));
  }
  ctx.stroke();
}

/** Limpia el canvas (fondo blanco) y dibuja todos los trazos en orden. */
export function renderLienzo(
  ctx: CanvasRenderingContext2D,
  trazos: Trazo[],
  ancho: number,
  alto: number
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);
  for (const t of trazos) dibujarUnTrazo(ctx, t, ancho, alto);
}
