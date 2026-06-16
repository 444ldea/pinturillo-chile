// ============================================================================
// Carga del banco palabras.json y seleccion de 3 opciones por ronda (seccion 3).
// ============================================================================

import { readFileSync } from "fs";
import { join } from "path";

interface EntradaPalabra {
  palabra: string;
  categoria: string;
  multipalabra: boolean;
}

interface BancoPalabras {
  version: number;
  cantidad: number;
  palabras: EntradaPalabra[];
}

let banco: EntradaPalabra[] = [];

/** Rutas candidatas donde puede vivir palabras.json (dev y produccion). */
function rutasCandidatas(): string[] {
  const rutas: string[] = [];
  if (process.env.PALABRAS_PATH) rutas.push(process.env.PALABRAS_PATH);
  rutas.push(join(process.cwd(), "palabras.json")); // cwd del proceso
  rutas.push(join(process.cwd(), "..", "palabras.json")); // raiz del monorepo
  rutas.push(join(__dirname, "palabras.json")); // junto al codigo compilado
  rutas.push(join(__dirname, "..", "palabras.json"));
  rutas.push(join(__dirname, "..", "..", "palabras.json"));
  return rutas;
}

export function cargarPalabras(): number {
  let ultimoError: unknown = null;
  for (const ruta of rutasCandidatas()) {
    try {
      const raw = readFileSync(ruta, "utf-8");
      const data: BancoPalabras = JSON.parse(raw);
      banco = data.palabras.filter(
        (p) => p && typeof p.palabra === "string" && p.palabra.trim().length > 0
      );
      console.log(
        `[palabras] Banco cargado desde ${ruta} (${banco.length} palabras).`
      );
      return banco.length;
    } catch (err) {
      ultimoError = err;
    }
  }
  console.error(
    "[palabras] No se pudo cargar palabras.json. Define PALABRAS_PATH.",
    ultimoError
  );
  throw new Error("No se encontro palabras.json");
}

function mezclar<T>(arr: T[]): T[] {
  const copia = arr.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export interface OpcionPalabra {
  palabra: string;
  categoria: string;
}

/**
 * Elige `cantidad` palabras de categorias distintas, sin repetir las ya usadas.
 * Si no quedan suficientes categorias distintas, relaja la restriccion.
 * Si el pozo se agoto del todo, reutiliza el banco completo.
 */
export function elegirOpciones(
  usadas: Set<string>,
  cantidad = 5
): OpcionPalabra[] {
  const disponibles = mezclar(banco.filter((p) => !usadas.has(p.palabra)));
  const elegidas: EntradaPalabra[] = [];
  const cats = new Set<string>();

  // 1) categorias distintas
  for (const p of disponibles) {
    if (cats.has(p.categoria)) continue;
    elegidas.push(p);
    cats.add(p.categoria);
    if (elegidas.length === cantidad) break;
  }

  // 2) relajar: cualquier palabra no usada
  if (elegidas.length < cantidad) {
    for (const p of disponibles) {
      if (elegidas.includes(p)) continue;
      elegidas.push(p);
      if (elegidas.length === cantidad) break;
    }
  }

  // 3) pozo agotado: reutilizar banco completo
  if (elegidas.length < cantidad) {
    for (const p of mezclar(banco)) {
      if (elegidas.includes(p)) continue;
      elegidas.push(p);
      if (elegidas.length === cantidad) break;
    }
  }

  return elegidas.map((p) => ({ palabra: p.palabra, categoria: p.categoria }));
}
