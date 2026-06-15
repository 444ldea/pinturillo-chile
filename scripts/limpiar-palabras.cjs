// ============================================================================
// Limpia palabras.json quitando conceptos NO dibujables:
//  - marcas comerciales (no se dibujan, son logos)
//  - nombres de personas/proceres (no se dibujan reconociblemente)
//  - conceptos abstractos sueltos (himnos, ceremonias, chistes, etc.)
// Escribe palabras.json (raiz) y servidor/palabras.json.
//   Ejecutar:  node scripts/limpiar-palabras.cjs
// ============================================================================

const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const archivo = path.join(raiz, "palabras.json");
const data = JSON.parse(fs.readFileSync(archivo, "utf-8"));

// Categorias completas que se eliminan (marcas y personas).
const CATEGORIAS_FUERA = new Set([
  // marcas comerciales
  "Alimentos",
  "Banca",
  "Bebidas",
  "Combustibles",
  "Farmacias",
  "Retail",
  "Startups",
  "Telecom y medios",
  "Transporte",
  // personas / proceres / figuras historicas
  "Ciencia y sociedad",
  "Literatura y artes",
  "Política e historia",
  "Próceres y héroes",
  "Pueblos originarios",
]);

// Palabras sueltas abstractas/personas dentro de categorias que se conservan.
const PALABRAS_FUERA = new Set([
  // Cultura: abstractos y personas
  "Talla",
  "Minga",
  "Machitún",
  "Esquinazo",
  "Tonada",
  "Mistral",
  "Lautaro",
  // Historia: abstractos, personas y lugares
  "Himno",
  "Caupolicán",
  "Balmaceda",
  "Carrera",
  "Atacama",
  "Mapocho",
]);

const antes = data.palabras.length;
const removidas = [];
const palabras = data.palabras.filter((p) => {
  const fuera = CATEGORIAS_FUERA.has(p.categoria) || PALABRAS_FUERA.has(p.palabra);
  if (fuera) removidas.push(`${p.palabra} [${p.categoria}]`);
  return !fuera;
});

const salida = {
  version: (data.version || 0) + 1,
  cantidad: palabras.length,
  palabras,
};

fs.writeFileSync(archivo, JSON.stringify(salida, null, 2) + "\n", "utf-8");
fs.writeFileSync(
  path.join(raiz, "servidor", "palabras.json"),
  JSON.stringify(salida, null, 2) + "\n",
  "utf-8"
);

// resumen
const cats = {};
for (const p of palabras) cats[p.categoria] = (cats[p.categoria] || 0) + 1;
console.log(`Antes: ${antes}  ->  Despues: ${palabras.length}  (removidas: ${removidas.length})`);
console.log(`Categorias restantes: ${Object.keys(cats).length}`);
console.log("\nRemovidas:\n  " + removidas.join("\n  "));
console.log(
  "\nRestantes por categoria:\n  " +
    Object.keys(cats)
      .sort()
      .map((c) => `${c}: ${cats[c]}`)
      .join("\n  ")
);
