// ============================================================================
// Guiones, mascara y pistas progresivas (seccion 5 del prompt maestro).
// ============================================================================

import { PALABRAS_VACIAS } from "./validacion";

export interface MascaraConstruida {
  mascara: (string | null)[]; // letra revelada | null (oculto) | " " (espacio)
  indicesRevelables: number[]; // posiciones en null que las pistas pueden revelar
}

/**
 * Construye la mascara caracter por caracter:
 *  - espacio        -> " "
 *  - palabra vacia  -> se revela desde el inicio (preposiciones/articulos)
 *  - palabra con contenido -> null (oculto), y su posicion entra a indicesRevelables.
 */
export function construirMascara(palabra: string): MascaraConstruida {
  const mascara: (string | null)[] = [];
  const indicesRevelables: number[] = [];

  const grupos = palabra.split(" ");
  let idx = 0;

  grupos.forEach((grupo, gi) => {
    if (gi > 0) {
      mascara.push(" ");
      idx++;
    }
    const esVacia = PALABRAS_VACIAS.has(grupo.toLowerCase());
    for (const ch of grupo) {
      if (esVacia) {
        mascara.push(ch); // revelada desde el inicio
      } else {
        mascara.push(null); // oculta
        indicesRevelables.push(idx);
      }
      idx++;
    }
  });

  return { mascara, indicesRevelables };
}

/**
 * Calcula CUANTAS pistas dar y EN QUE segundo (de tiempoRestante) caen.
 * - total = max(1, ceil(ocultas/3)) -> ~33-40% de las letras, mas generoso para
 *   conceptos largos; con tope min(total, floor(ocultas/2)) (nunca mas del 50%).
 * - se reparten uniformemente en la segunda mitad del reloj.
 */
export function calcularPistasProgramadas(
  ocultas: number,
  segundos: number
): number[] {
  let total = Math.max(1, Math.ceil(ocultas / 3));
  total = Math.min(total, Math.floor(ocultas / 2)); // nunca mas del 50% de las ocultas
  if (total <= 0) return [];

  const mitad = segundos / 2;
  const tiempos: number[] = [];
  for (let k = 1; k <= total; k++) {
    const t = Math.round((mitad * (total - k + 1)) / total);
    if (t > 0 && !tiempos.includes(t)) tiempos.push(t);
  }
  return tiempos;
}

/**
 * Revela UNA letra oculta al azar (de las que aun no se han revelado).
 * Muta `mascara` e `indicesYaRevelados`. Devuelve el indice revelado o null.
 */
export function revelarUnaPista(
  palabra: string,
  mascara: (string | null)[],
  indicesRevelables: number[],
  indicesYaRevelados: number[]
): number | null {
  const candidatos = indicesRevelables.filter(
    (i) => !indicesYaRevelados.includes(i)
  );
  if (candidatos.length === 0) return null;

  const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
  mascara[elegido] = [...palabra][elegido];
  indicesYaRevelados.push(elegido);
  return elegido;
}
