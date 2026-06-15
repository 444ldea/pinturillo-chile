// ============================================================================
// Validacion inteligente de adivinanzas (seccion 6 del prompt maestro).
// Tolera tildes, mayusculas y errores de tipeo; en frases ignora preposiciones.
// ============================================================================

/** Palabras vacias (preposiciones/articulos) que se pre-rellenan y no se exigen. */
export const PALABRAS_VACIAS = new Set([
  "el",
  "la",
  "los",
  "las",
  "de",
  "del",
  "y",
  "un",
  "una",
  "e",
  "o",
  "al",
]);

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes (marcas combinantes)
    .replace(/[^a-z0-9ñ ]/g, "") // quita simbolos (conserva la ñ = ñ)
    .replace(/\s+/g, " ") // colapsa espacios
    .trim();
}

/** Distancia de edicion estandar (Levenshtein). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const n = b.length;
  let fila = new Array<number>(n + 1);
  let siguiente = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) fila[j] = j;

  for (let i = 1; i <= a.length; i++) {
    siguiente[0] = i;
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      siguiente[j] = Math.min(
        fila[j] + 1, // borrado
        siguiente[j - 1] + 1, // insercion
        fila[j - 1] + costo // sustitucion
      );
    }
    [fila, siguiente] = [siguiente, fila];
  }

  return fila[n];
}

function umbralPorLargo(palabra: string): number {
  return palabra.length <= 5 ? 1 : 2; // palabras cortas toleran 1 error, largas 2
}

export type Resultado = { acierto: boolean; cerca: boolean };

export function validar(intento: string, secreta: string): Resultado {
  const ni = normalizar(intento);
  const ns = normalizar(secreta);
  if (!ni) return { acierto: false, cerca: false };
  if (ni === ns) return { acierto: true, cerca: false };

  const palSecreta = ns.split(" ");
  const esFrase = palSecreta.length > 1;

  if (!esFrase) {
    // Palabra unica: tolera errores de tipeo
    const dist = levenshtein(ni, ns);
    const u = umbralPorLargo(ns);
    if (dist <= u) return { acierto: true, cerca: false };
    if (dist <= u + 1) return { acierto: false, cerca: true };
    return { acierto: false, cerca: false };
  }

  // FRASE: el adivinador ve los guiones, asi que exigimos todas las palabras
  // CON CONTENIDO (ignoramos las preposiciones, que ya estan pre-rellenadas).
  const significativas = palSecreta.filter((w) => !PALABRAS_VACIAS.has(w));
  const palIntento = ni.split(" ");

  let aciertos = 0;
  for (const cs of significativas) {
    for (const ci of palIntento) {
      if (levenshtein(ci, cs) <= umbralPorLargo(cs)) {
        aciertos++;
        break;
      }
    }
  }

  if (aciertos === significativas.length) return { acierto: true, cerca: false };
  // Nota: la spec (6.3) usaba ceil(n*0.6), pero eso impide marcar "cerca" en
  // frases de 2 palabras (1 de 2 = 50% < 60%), contradiciendo los ejemplos de
  // 6.4 ("torres" -> cerca). Honramos 6.4: acertar alguna palabra de contenido
  // (pero no todas) cuenta como "cerca".
  if (aciertos > 0) return { acierto: false, cerca: true };
  return { acierto: false, cerca: false };
}
