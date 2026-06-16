// ============================================================================
// Carga de los packs de palabras y seleccion de opciones por ronda.
// Cada pack es un archivo JSON; el "clasico" es el banco base, y se pueden
// sumar packs (ej. "carrete +18", o futuros packs premium/patrocinados).
// ============================================================================

import { readFileSync } from "fs";
import { join } from "path";

interface EntradaPalabra {
  palabra: string;
  categoria: string;
  multipalabra: boolean;
}

interface DefPack {
  id: string;
  nombre: string;
  adulto: boolean;
  archivo: string;
}

/** Catalogo de packs disponibles. Agregar uno nuevo = una linea aqui + su JSON. */
const PACKS: DefPack[] = [
  { id: "clasico", nombre: "Chileno clásico", adulto: false, archivo: "palabras.json" },
  { id: "carrete", nombre: "Carrete +18", adulto: true, archivo: "palabras-carrete.json" },
];

const bancos: Record<string, EntradaPalabra[]> = {};

function rutasCandidatas(archivo: string): string[] {
  const rutas: string[] = [];
  if (process.env.PALABRAS_PATH && archivo === "palabras.json") {
    rutas.push(process.env.PALABRAS_PATH);
  }
  rutas.push(join(process.cwd(), archivo));
  rutas.push(join(process.cwd(), "..", archivo));
  rutas.push(join(__dirname, archivo));
  rutas.push(join(__dirname, "..", archivo));
  rutas.push(join(__dirname, "..", "..", archivo));
  return rutas;
}

function cargarArchivo(archivo: string): EntradaPalabra[] {
  for (const ruta of rutasCandidatas(archivo)) {
    try {
      const data = JSON.parse(readFileSync(ruta, "utf-8"));
      const palabras: EntradaPalabra[] = (data.palabras || []).filter(
        (p: EntradaPalabra) =>
          p && typeof p.palabra === "string" && p.palabra.trim().length > 0
      );
      console.log(`[palabras] ${archivo}: ${palabras.length} palabras (${ruta}).`);
      return palabras;
    } catch {
      /* probar siguiente ruta */
    }
  }
  console.error(`[palabras] No se pudo cargar ${archivo}.`);
  return [];
}

export function cargarPalabras(): number {
  let total = 0;
  for (const pack of PACKS) {
    bancos[pack.id] = cargarArchivo(pack.archivo);
    total += bancos[pack.id].length;
  }
  if ((bancos["clasico"]?.length ?? 0) === 0) {
    throw new Error("No se encontro el banco clasico (palabras.json)");
  }
  return total;
}

/** Catalogo publico (id, nombre, adulto) para que el cliente liste los packs. */
export function catalogoPacks(): { id: string; nombre: string; adulto: boolean }[] {
  return PACKS.map((p) => ({ id: p.id, nombre: p.nombre, adulto: p.adulto }));
}

export function packsValidos(ids: unknown): string[] {
  const conocidos = new Set(PACKS.map((p) => p.id));
  const lista = Array.isArray(ids) ? ids.filter((x) => conocidos.has(x)) : [];
  return lista.length ? Array.from(new Set(lista)) : ["clasico"];
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
 * Elige `cantidad` palabras de categorias distintas desde los packs activos,
 * sin repetir las ya usadas. Relaja la restriccion si hace falta.
 */
export function elegirOpciones(
  usadas: Set<string>,
  cantidad = 5,
  packsActivos: string[] = ["clasico"]
): OpcionPalabra[] {
  const ids = packsValidos(packsActivos);
  const fuente = ids.flatMap((id) => bancos[id] ?? []);
  const disponibles = mezclar(fuente.filter((p) => !usadas.has(p.palabra)));
  const elegidas: EntradaPalabra[] = [];
  const cats = new Set<string>();

  for (const p of disponibles) {
    if (cats.has(p.categoria)) continue;
    elegidas.push(p);
    cats.add(p.categoria);
    if (elegidas.length === cantidad) break;
  }
  if (elegidas.length < cantidad) {
    for (const p of disponibles) {
      if (elegidas.includes(p)) continue;
      elegidas.push(p);
      if (elegidas.length === cantidad) break;
    }
  }
  if (elegidas.length < cantidad) {
    for (const p of mezclar(fuente)) {
      if (elegidas.includes(p)) continue;
      elegidas.push(p);
      if (elegidas.length === cantidad) break;
    }
  }

  return elegidas.map((p) => ({ palabra: p.palabra, categoria: p.categoria }));
}
