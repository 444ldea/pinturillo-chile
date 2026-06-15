// ============================================================================
// Agrega los clubes de Primera A y Primera B (futbol chileno) al banco, para
// que la gente dibuje sus escudos. Escribe palabras.json y servidor/palabras.json.
// La division de cada club puede cambiar por temporada: mover un club entre las
// dos listas es trivial.
//   Ejecutar:  node scripts/agregar-equipos.cjs
// ============================================================================

const fs = require("fs");
const path = require("path");

const PRIMERA_A = [
  "Colo-Colo",
  "Universidad de Chile",
  "Universidad Católica",
  "Unión Española",
  "Audax Italiano",
  "Palestino",
  "O'Higgins",
  "Everton",
  "Huachipato",
  "Coquimbo Unido",
  "Deportes Iquique",
  "Ñublense",
  "Unión La Calera",
  "Cobresal",
  "Deportes La Serena",
  "Deportes Limache",
];

const PRIMERA_B = [
  "Santiago Wanderers",
  "Magallanes",
  "Cobreloa",
  "Deportes Copiapó",
  "Deportes Temuco",
  "Rangers de Talca",
  "San Marcos de Arica",
  "Universidad de Concepción",
  "Unión San Felipe",
  "Curicó Unido",
  "San Luis de Quillota",
  "Deportes Antofagasta",
  "Deportes Recoleta",
  "Deportes Santa Cruz",
  "Barnechea",
  "Deportes Concepción",
];

const raiz = path.join(__dirname, "..");
const archivo = path.join(raiz, "palabras.json");
const data = JSON.parse(fs.readFileSync(archivo, "utf-8"));

const existentes = new Set(data.palabras.map((p) => p.palabra));
let agregadas = 0;

function agregar(lista, categoria) {
  for (const nombre of lista) {
    if (existentes.has(nombre)) continue;
    data.palabras.push({
      palabra: nombre,
      categoria,
      multipalabra: nombre.includes(" "),
    });
    existentes.add(nombre);
    agregadas++;
  }
}

agregar(PRIMERA_A, "Fútbol Primera A");
agregar(PRIMERA_B, "Fútbol Primera B");

const salida = {
  version: (data.version || 0) + 1,
  cantidad: data.palabras.length,
  palabras: data.palabras,
};

fs.writeFileSync(archivo, JSON.stringify(salida, null, 2) + "\n", "utf-8");
fs.writeFileSync(
  path.join(raiz, "servidor", "palabras.json"),
  JSON.stringify(salida, null, 2) + "\n",
  "utf-8"
);

console.log(`Agregadas: ${agregadas} | Total ahora: ${salida.cantidad}`);
