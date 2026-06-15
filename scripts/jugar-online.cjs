// ============================================================================
// Levanta el juego para jugar online con amigos: arranca el servidor de
// produccion y un tunel cloudflared (sin cuenta), e imprime el link a compartir.
// Deja la terminal abierta mientras juegan; Ctrl+C cierra todo.
//
//   npm run online        (hace build y luego corre esto)
//   node scripts/jugar-online.cjs   (si ya hiciste build)
//
// Requiere cloudflared instalado:  winget install Cloudflare.cloudflared
// ============================================================================

const { spawn } = require("child_process");
const { existsSync } = require("fs");
const net = require("net");
const path = require("path");

const raiz = path.join(__dirname, "..");
const indexServer = path.join(raiz, "servidor", "dist", "index.js");

if (!existsSync(indexServer)) {
  console.error(
    "No existe servidor/dist. Corre primero:  npm run build\n(o usa:  npm run online)"
  );
  process.exit(1);
}

/** Busca el primer puerto libre desde `inicio` (evita choques con dev/otros). */
function puertoLibre(inicio) {
  return new Promise((resolve) => {
    const probar = (p) => {
      const s = net.createServer();
      s.once("error", () => probar(p + 1));
      s.once("listening", () => s.close(() => resolve(p)));
      s.listen(p, "0.0.0.0");
    };
    probar(inicio);
  });
}

(async () => {
  const PORT = String(process.env.PORT || (await puertoLibre(8787)));
  console.log(`\nIniciando Pinturillo Chile en el puerto ${PORT}...\n`);

  // 1) Servidor de produccion (sirve cliente + sockets en un solo puerto)
  const server = spawn(process.execPath, [indexServer], {
    cwd: raiz,
    env: { ...process.env, PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => process.stdout.write("[juego] " + d));
  server.stderr.on("data", (d) => process.stderr.write("[juego] " + d));

  // 2) Tunel publico con cloudflared (TryCloudflare, sin cuenta).
  //    Comando como string + shell:true para resolverlo del PATH en cualquier SO.
  const tunel = spawn(
    `cloudflared tunnel --url http://localhost:${PORT} --no-autoupdate`,
    { stdio: ["ignore", "pipe", "pipe"], shell: true }
  );

  let mostrada = false;
  function buscarURL(buf) {
    const m = String(buf).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !mostrada) {
      mostrada = true;
      console.log("\n=================================================");
      console.log("  🎮  Comparte este link con tus amigos:");
      console.log("      " + m[0]);
      console.log("  (deja esta ventana abierta mientras juegan)");
      console.log("=================================================\n");
    }
  }
  tunel.stdout.on("data", buscarURL);
  tunel.stderr.on("data", buscarURL);
  tunel.on("error", (e) =>
    console.error(
      "\nNo se pudo iniciar cloudflared. Instalalo con:\n" +
        "  winget install Cloudflare.cloudflared\n",
      e.message
    )
  );

  function salir() {
    try {
      server.kill();
    } catch {}
    try {
      tunel.kill();
    } catch {}
    process.exit(0);
  }
  process.on("SIGINT", salir);
  process.on("SIGTERM", salir);
  server.on("exit", (code) => {
    if (code) console.error(`\n[juego] el servidor se cerro (codigo ${code}).`);
    salir();
  });
})();
