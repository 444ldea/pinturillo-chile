// ============================================================================
// Gestion de salas: creacion, union, reconexion, salida y vista publica.
// El estado vive en memoria (Map de salas), sin base de datos (v1).
// ============================================================================

import {
  ConfigSala,
  Jugador,
  JugadorPublico,
  Sala,
  SalaPublica,
} from "./tipos";

export const salas = new Map<string, Sala>();

const CONFIG_POR_DEFECTO: ConfigSala = {
  totalVueltas: 3,
  segundosPorRonda: 80,
  maxJugadores: 8,
};

// Prefijos con sabor chileno para los codigos de sala.
const PREFIJOS = [
  "PALT",
  "WENA",
  "CACH",
  "LUCA",
  "MOTE",
  "CUEC",
  "COPI",
  "ROTO",
  "BKN",
  "FOME",
  "POLO",
  "PIPO",
  "NECA",
  "MOAI",
];

/** Quita caracteres de control (code points < 32 y el 127 DEL). */
function quitarControles(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (c >= 32 && c !== 127) out += ch;
  }
  return out;
}

export function sanitizarNombre(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  s = quitarControles(s);
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > 16) s = s.slice(0, 16);
  return s || "Anonimo";
}

export function sanitizarTexto(raw: unknown, max: number): string {
  let s = typeof raw === "string" ? raw : "";
  s = quitarControles(s).trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

function generarCodigo(): string {
  let intentos = 0;
  while (intentos < 10000) {
    const prefijo = PREFIJOS[Math.floor(Math.random() * PREFIJOS.length)];
    const numero = Math.floor(1000 + Math.random() * 9000); // 1000..9999
    const codigo = `${prefijo}-${numero}`;
    if (!salas.has(codigo)) return codigo;
    intentos++;
  }
  // fallback extremadamente improbable
  return `SALA-${Date.now().toString().slice(-6)}`;
}

export function jugadorPublico(j: Jugador): JugadorPublico {
  return {
    id: j.id,
    nombre: j.nombre,
    puntaje: j.puntaje,
    esAnfitrion: j.esAnfitrion,
    conectado: j.conectado,
    espectador: j.espectador,
    avatar: j.avatar,
    haAcertadoEstaRonda: j.haAcertadoEstaRonda,
    ordenAcierto: j.ordenAcierto,
  };
}

/** Jugadores reales (no espectadores) conectados. Cuentan para capacidad/inicio. */
export function jugadoresReales(sala: Sala): Jugador[] {
  return sala.jugadores.filter((j) => j.conectado && !j.espectador);
}

export function vistaPublica(sala: Sala): SalaPublica {
  const dibujante = sala.jugadores[sala.indiceDibujante];
  const enRonda = sala.estado === "dibujando" || sala.estado === "eligiendo";

  // Votos de expulsion por jugador (solo los que tienen >0).
  const votosExpulsion: Record<string, number> = {};
  for (const j of sala.jugadores) {
    const n = sala.votosExpulsion.get(j.tokenJugador)?.size ?? 0;
    if (n > 0) votosExpulsion[j.id] = n;
  }
  const reales = jugadoresReales(sala).length;
  const umbralExpulsion = reales >= 3 ? Math.floor((reales - 1) / 2) + 1 : 0;

  return {
    codigo: sala.codigo,
    estado: sala.estado,
    jugadores: sala.jugadores.map(jugadorPublico),
    config: sala.config,
    vueltaActual: sala.vueltaActual,
    totalVueltas: sala.config.totalVueltas,
    dibujanteId: enRonda && dibujante ? dibujante.id : null,
    categoriaActual: sala.categoriaActual,
    mascara: sala.estado === "dibujando" ? sala.mascara : null,
    tiempoRestante: sala.tiempoRestante,
    votosExpulsion,
    umbralExpulsion,
  };
}

export function jugadorPorToken(sala: Sala, token: string): Jugador | undefined {
  return sala.jugadores.find((j) => j.tokenJugador === token);
}

export function jugadorPorSocket(
  sala: Sala,
  socketId: string
): Jugador | undefined {
  return sala.jugadores.find((j) => j.id === socketId);
}

export function crearSala(
  nombre: string,
  token: string,
  socketId: string
): { sala: Sala; jugador: Jugador } {
  const codigo = generarCodigo();
  const jugador: Jugador = {
    id: socketId,
    tokenJugador: token,
    nombre: sanitizarNombre(nombre),
    puntaje: 0,
    esAnfitrion: true,
    conectado: true,
    espectador: false,
    avatar: null,
    haAcertadoEstaRonda: false,
    ordenAcierto: null,
  };

  const sala: Sala = {
    codigo,
    estado: "lobby",
    jugadores: [jugador],
    anfitrionId: socketId,
    config: { ...CONFIG_POR_DEFECTO },
    vueltaActual: 0,
    indiceDibujante: 0,
    palabraSecreta: null,
    categoriaActual: null,
    opcionesPalabras: [],
    mascara: [],
    indicesRevelables: [],
    indicesYaRevelados: [],
    pistasProgramadas: [],
    trazos: [],
    tiempoRestante: 0,
    timerId: null,
    galeria: [],
    votosExpulsion: new Map<string, Set<string>>(),
    baneados: new Set<string>(),
    palabrasUsadas: new Set<string>(),
    timerEleccion: null,
    timerFinRonda: null,
    timerDesconexionDibujante: null,
    timerLimpieza: null,
  };

  salas.set(codigo, sala);
  return { sala, jugador };
}

export type ResultadoUnion =
  | { ok: true; sala: Sala; jugador: Jugador; reconexion: boolean }
  | { ok: false; codigo: string; mensaje: string };

export function unirseOReconectar(
  codigoRaw: string,
  nombre: string,
  token: string,
  socketId: string,
  comoEspectador = false
): ResultadoUnion {
  const codigo = (codigoRaw || "").toUpperCase().trim();
  const sala = salas.get(codigo);
  if (!sala) {
    return { ok: false, codigo: "SALA_NO_EXISTE", mensaje: "La sala no existe." };
  }

  // Jugadores expulsados no pueden volver a esta sala.
  if (sala.baneados.has(token)) {
    return {
      ok: false,
      codigo: "EXPULSADO",
      mensaje: "Fuiste expulsado de esta sala.",
    };
  }

  // Reconexion por token (mismo jugador que vuelve).
  const existente = jugadorPorToken(sala, token);
  if (existente) {
    existente.id = socketId;
    existente.conectado = true;
    if (nombre) existente.nombre = sanitizarNombre(nombre);
    return { ok: true, sala, jugador: existente, reconexion: true };
  }

  // Jugador nuevo: validar capacidad (los espectadores no ocupan cupo).
  const reales = jugadoresReales(sala).length;
  const lleno = reales >= sala.config.maxJugadores;
  if (lleno && !comoEspectador) {
    return { ok: false, codigo: "SALA_LLENA", mensaje: "La sala esta llena." };
  }

  const jugador: Jugador = {
    id: socketId,
    tokenJugador: token,
    nombre: sanitizarNombre(nombre),
    puntaje: 0,
    esAnfitrion: false,
    conectado: true,
    espectador: lleno || comoEspectador,
    avatar: null,
    haAcertadoEstaRonda: false,
    ordenAcierto: null,
  };
  sala.jugadores.push(jugador);
  return { ok: true, sala, jugador, reconexion: false };
}

/** Reasigna el anfitrion al primer jugador conectado si el actual ya no esta. */
export function asegurarAnfitrion(sala: Sala): void {
  const anfitrionActual = sala.jugadores.find(
    (j) => j.id === sala.anfitrionId && j.conectado
  );
  if (anfitrionActual) return;

  const nuevo = sala.jugadores.find((j) => j.conectado);
  sala.jugadores.forEach((j) => (j.esAnfitrion = false));
  if (nuevo) {
    nuevo.esAnfitrion = true;
    sala.anfitrionId = nuevo.id;
  }
}

export function eliminarSala(sala: Sala): void {
  if (sala.timerId) clearInterval(sala.timerId);
  if (sala.timerEleccion) clearTimeout(sala.timerEleccion);
  if (sala.timerFinRonda) clearTimeout(sala.timerFinRonda);
  if (sala.timerDesconexionDibujante)
    clearTimeout(sala.timerDesconexionDibujante);
  if (sala.timerLimpieza) clearTimeout(sala.timerLimpieza);
  salas.delete(sala.codigo);
}
