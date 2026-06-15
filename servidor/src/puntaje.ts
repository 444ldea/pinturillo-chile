// ============================================================================
// Sistema de puntaje (seccion 7 del prompt maestro).
// ============================================================================

import { Sala } from "./tipos";

/** Adivinadores: premia velocidad. Rango 50..150. */
export function puntosAdivinador(sala: Sala): number {
  const total = sala.config.segundosPorRonda;
  const restante = sala.tiempoRestante;
  const base = 50;
  const bonus = Math.round((restante / total) * 100); // 0..100
  return base + bonus;
}

/** Dibujante: premia claridad. 25 puntos por cada jugador que acerto. */
export function puntosDibujante(sala: Sala): number {
  const cuantos = sala.jugadores.filter((j) => j.haAcertadoEstaRonda).length;
  return cuantos * 25;
}
