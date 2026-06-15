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

  ctx.beginPath();
  ctx.moveTo(t.puntos[0].x * ancho, t.puntos[0].y * alto);
  for (let i = 1; i < t.puntos.length; i++) {
    ctx.lineTo(t.puntos[i].x * ancho, t.puntos[i].y * alto);
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
