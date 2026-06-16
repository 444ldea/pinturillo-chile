// ============================================================================
// Handlers de Socket.IO: traduce eventos del cliente a transiciones del juego.
// Aqui vive la seguridad: validacion de emisor, rate limiting y sanitizacion.
// ============================================================================

import { randomUUID } from "crypto";
import { Server, Socket } from "socket.io";
import {
  DatosSocket,
  EventosClienteAServidor,
  EventosServidorACliente,
  Jugador,
  Sala,
  Trazo,
} from "./tipos";
import {
  asegurarAnfitrion,
  crearSala,
  eliminarSala,
  jugadoresReales,
  jugadorPorSocket,
  jugadorPublico,
  salas,
  sanitizarNombre,
  sanitizarTexto,
  unirseOReconectar,
} from "./salas";
import {
  avanzarRonda,
  cancelarGraciaDibujante,
  difundirEstado,
  elegirPalabra,
  expulsarJugador,
  iniciarPartida,
  inicializarJuego,
  manejarDesconexionDibujante,
  registrarAcierto,
  terminarPartida,
  volverLobby,
} from "./juego";
import { validar } from "./validacion";

type IO = Server<EventosClienteAServidor, EventosServidorACliente>;
type SocketJuego = Socket<EventosClienteAServidor, EventosServidorACliente>;

const MS_LIMPIEZA_SALA_VACIA = 5 * 60 * 1000;
const MAX_PUNTOS_TRAZO = 5000;
const MAX_TRAZOS_SALA = 8000;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
function clamp01(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return clamp(n, 0, 1);
}

/** Ventana deslizante simple para rate limiting. */
function permitir(arr: number[], max: number, ventanaMs = 1000): boolean {
  const ahora = Date.now();
  while (arr.length && arr[0] <= ahora - ventanaMs) arr.shift();
  if (arr.length >= max) return false;
  arr.push(ahora);
  return true;
}

function datos(socket: SocketJuego): DatosSocket {
  return socket.data as unknown as DatosSocket;
}

function contexto(
  socket: SocketJuego
): { sala: Sala; jugador: Jugador } | null {
  const codigo = datos(socket).codigoSala;
  if (!codigo) return null;
  const sala = salas.get(codigo);
  if (!sala) return null;
  const jugador = jugadorPorSocket(sala, socket.id);
  if (!jugador) return null;
  return { sala, jugador };
}

function esDibujante(sala: Sala, socketId: string): boolean {
  const d = sala.jugadores[sala.indiceDibujante];
  return !!d && d.id === socketId;
}

function sanearTrazo(t: unknown): Trazo | null {
  if (!t || typeof t !== "object") return null;
  const obj = t as Partial<Trazo>;
  if (!Array.isArray(obj.puntos)) return null;
  const grosor = clamp(Number(obj.grosor) || 2, 2, 40);
  const color =
    typeof obj.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(obj.color)
      ? obj.color
      : "#000000";
  const puntos = obj.puntos
    .slice(0, MAX_PUNTOS_TRAZO)
    .map((p) => ({ x: clamp01((p as any)?.x), y: clamp01((p as any)?.y) }));
  if (puntos.length === 0) return null;
  return { puntos, color, grosor };
}

function cancelarLimpieza(sala: Sala): void {
  if (sala.timerLimpieza) {
    clearTimeout(sala.timerLimpieza);
    sala.timerLimpieza = null;
  }
}

function programarLimpiezaSiVacia(sala: Sala): void {
  const conectados = sala.jugadores.filter((j) => j.conectado).length;
  if (conectados > 0) return;
  if (sala.timerLimpieza) clearTimeout(sala.timerLimpieza);
  sala.timerLimpieza = setTimeout(() => {
    if (sala.jugadores.filter((j) => j.conectado).length === 0) {
      eliminarSala(sala);
    }
  }, MS_LIMPIEZA_SALA_VACIA);
}

/** Reenvia el estado privado relevante tras unirse/reconectar. */
function reSincronizar(sala: Sala, socket: SocketJuego): void {
  socket.emit("lienzo_completo", { trazos: sala.trazos });
  const dibujante = sala.jugadores[sala.indiceDibujante];
  const soyDibujante = !!dibujante && dibujante.id === socket.id;

  if (sala.estado === "eligiendo") {
    if (soyDibujante) {
      socket.emit("elige_palabra", { opciones: sala.opcionesPalabras });
    } else {
      socket.emit("esperando_dibujante", {
        nombreDibujante: dibujante ? dibujante.nombre : "",
      });
    }
  }
  if (sala.estado === "dibujando" && soyDibujante && sala.palabraSecreta) {
    socket.emit("tu_palabra", { palabra: sala.palabraSecreta });
  }
  if (soyDibujante) cancelarGraciaDibujante(sala);
}

/** Mensaje privado para "los que ya saben" (acertadores + dibujante). */
function enviarAQuienesSaben(
  io: IO,
  sala: Sala,
  payload: { jugadorId: string; nombre: string; texto: string }
): void {
  const dibujante = sala.jugadores[sala.indiceDibujante];
  for (const j of sala.jugadores) {
    if (!j.conectado) continue;
    const sabe =
      j.haAcertadoEstaRonda || (dibujante && j.id === dibujante.id);
    if (sabe) io.to(j.id).emit("mensaje_chat", { ...payload, privado: true });
  }
}

function manejarSalida(
  io: IO,
  socket: SocketJuego,
  esVoluntaria: boolean
): void {
  const codigo = datos(socket).codigoSala;
  if (!codigo) return;
  const sala = salas.get(codigo);
  if (!sala) return;
  const jugador = jugadorPorSocket(sala, socket.id);
  if (!jugador) return;

  const eraDibujante = esDibujante(sala, socket.id);
  const enJuego = sala.estado !== "lobby" && sala.estado !== "fin_partida";

  // Limpiar votos de expulsion ligados a este jugador (como objetivo y votante).
  sala.votosExpulsion.delete(jugador.tokenJugador);
  for (const s of sala.votosExpulsion.values()) s.delete(jugador.tokenJugador);

  if (esVoluntaria && !enJuego) {
    // Fuera de partida: lo quitamos del todo.
    sala.jugadores = sala.jugadores.filter((j) => j.id !== socket.id);
    socket.leave(codigo);
    datos(socket).codigoSala = undefined;
  } else {
    // En partida o desconexion: lo marcamos desconectado (permite reconexion).
    jugador.conectado = false;
  }

  io.to(codigo).emit("jugador_salio", { jugadorId: socket.id });
  asegurarAnfitrion(sala);

  const conectados = sala.jugadores.filter((j) => j.conectado).length;
  if (conectados === 0) {
    programarLimpiezaSiVacia(sala);
    return;
  }

  if (eraDibujante && enJuego) {
    manejarDesconexionDibujante(sala);
  }

  difundirEstado(sala);
}

export function registrarEventos(io: IO): void {
  inicializarJuego(io);

  io.on("connection", (socket: SocketJuego) => {
    // Estado por-socket (rate limiting).
    socket.data = {
      ventanaTrazos: [],
      ventanaVivo: [],
      ventanaMensajes: [],
    } as DatosSocket;

    // -------------------------------------------------------- crear / unirse
    socket.on("crear_sala", (p) => {
      const nombre = sanitizarNombre(p?.nombre);
      const token = (p?.tokenJugador || "").toString().slice(0, 64) || randomUUID();
      const { sala, jugador } = crearSala(nombre, token, socket.id);
      datos(socket).codigoSala = sala.codigo;
      datos(socket).tokenJugador = token;
      socket.join(sala.codigo);
      cancelarLimpieza(sala);
      socket.emit("sala_creada", {
        codigo: sala.codigo,
        jugador: jugadorPublico(jugador),
      });
      difundirEstado(sala);
    });

    socket.on("unirse_sala", (p) => {
      const token = (p?.tokenJugador || "").toString().slice(0, 64) || randomUUID();
      const res = unirseOReconectar(
        (p?.codigo || "").toString(),
        sanitizarNombre(p?.nombre),
        token,
        socket.id,
        !!p?.espectador
      );
      if (!res.ok) {
        socket.emit("error_juego", { codigo: res.codigo, mensaje: res.mensaje });
        return;
      }
      const { sala, jugador, reconexion } = res;
      datos(socket).codigoSala = sala.codigo;
      datos(socket).tokenJugador = jugador.tokenJugador;
      socket.join(sala.codigo);
      cancelarLimpieza(sala);

      socket.emit("sala_creada", {
        codigo: sala.codigo,
        jugador: jugadorPublico(jugador),
      });
      io.to(sala.codigo)
        .except(socket.id)
        .emit("jugador_unido", { jugador: jugadorPublico(jugador) });
      difundirEstado(sala);
      reSincronizar(sala, socket);
    });

    // -------------------------------------------------------- configuracion
    socket.on("actualizar_config", (p) => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala, jugador } = ctx;
      if (jugador.id !== sala.anfitrionId || sala.estado !== "lobby") {
        socket.emit("error_juego", {
          codigo: "NO_PERMITIDO",
          mensaje: "Solo el anfitrion puede cambiar la config en el lobby.",
        });
        return;
      }
      if (typeof p?.totalVueltas === "number")
        sala.config.totalVueltas = clamp(Math.round(p.totalVueltas), 1, 10);
      if (typeof p?.segundosPorRonda === "number")
        sala.config.segundosPorRonda = clamp(Math.round(p.segundosPorRonda), 30, 180);
      if (typeof p?.maxJugadores === "number")
        sala.config.maxJugadores = clamp(Math.round(p.maxJugadores), 2, 12);
      difundirEstado(sala);
    });

    // -------------------------------------------------------- iniciar partida
    socket.on("iniciar_partida", () => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala, jugador } = ctx;
      if (jugador.id !== sala.anfitrionId) {
        socket.emit("error_juego", {
          codigo: "NO_PERMITIDO",
          mensaje: "Solo el anfitrion puede iniciar.",
        });
        return;
      }
      if (sala.estado !== "lobby") return;
      if (jugadoresReales(sala).length < 2) {
        socket.emit("error_juego", {
          codigo: "POCOS_JUGADORES",
          mensaje: "Se necesitan al menos 2 jugadores.",
        });
        return;
      }
      iniciarPartida(sala);
    });

    // -------------------------------------------------------- avatar
    socket.on("actualizar_avatar", (p) => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala, jugador } = ctx;
      if (!permitir(datos(socket).ventanaMensajes, 8)) return;
      const a = p?.avatar;
      if (typeof a !== "string" || !a.startsWith("data:image/")) return;
      if (a.length > 14000) return; // tope ~10KB
      jugador.avatar = a;
      difundirEstado(sala);
    });

    // -------------------------------------------------------- elegir palabra
    socket.on("elegir_palabra", (p) => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala } = ctx;
      if (sala.estado !== "eligiendo" || !esDibujante(sala, socket.id)) return;
      const indice = Number(p?.indice);
      if (
        !Number.isInteger(indice) ||
        indice < 0 ||
        indice >= sala.opcionesPalabras.length
      )
        return;
      elegirPalabra(sala, indice);
    });

    // -------------------------------------------------------- dibujo
    socket.on("dibujar_trazo", (p) => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala } = ctx;
      if (sala.estado !== "dibujando" || !esDibujante(sala, socket.id)) return;
      if (!permitir(datos(socket).ventanaTrazos, 30)) return; // ~30 trazos/s
      const trazo = sanearTrazo(p?.trazo);
      if (!trazo) return;
      if (sala.trazos.length < MAX_TRAZOS_SALA) sala.trazos.push(trazo);
      socket.to(sala.codigo).emit("trazo_nuevo", { trazo });
    });

    // Trazo en vivo (preview en tiempo real, no se persiste; el trazo final
    // llega por dibujar_trazo). Solo se relaya a los demas.
    socket.on("trazo_vivo", (p) => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala } = ctx;
      if (sala.estado !== "dibujando" || !esDibujante(sala, socket.id)) return;
      if (!permitir(datos(socket).ventanaVivo, 40)) return; // ~40/s
      if (!Array.isArray(p?.puntos) || p.puntos.length === 0) return;
      const puntos = p.puntos
        .slice(0, MAX_PUNTOS_TRAZO)
        .map((q) => ({ x: clamp01((q as any)?.x), y: clamp01((q as any)?.y) }));
      const grosor = clamp(Number(p?.grosor) || 2, 2, 40);
      const color =
        typeof p?.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(p.color)
          ? p.color
          : "#000000";
      socket.to(sala.codigo).emit("trazo_vivo", { puntos, color, grosor });
    });

    socket.on("trazo_vivo_fin", () => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala } = ctx;
      if (!esDibujante(sala, socket.id)) return;
      socket.to(sala.codigo).emit("trazo_vivo_fin", {});
    });

    socket.on("deshacer_trazo", () => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala } = ctx;
      if (sala.estado !== "dibujando" || !esDibujante(sala, socket.id)) return;
      sala.trazos.pop();
      io.to(sala.codigo).emit("lienzo_completo", { trazos: sala.trazos });
    });

    socket.on("limpiar_lienzo", () => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala } = ctx;
      if (sala.estado !== "dibujando" || !esDibujante(sala, socket.id)) return;
      sala.trazos = [];
      socket.to(sala.codigo).emit("lienzo_limpiado", {});
    });

    // -------------------------------------------------------- chat / adivinar
    socket.on("enviar_mensaje", (p) => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala, jugador } = ctx;
      if (!permitir(datos(socket).ventanaMensajes, 5)) return; // ~5 msgs/s
      const texto = sanitizarTexto(p?.texto, 100);
      if (!texto) return;

      const payload = {
        jugadorId: jugador.id,
        nombre: jugador.nombre,
        texto,
      };

      if (sala.estado === "dibujando") {
        // El dibujante no puede chatear durante su ronda.
        if (esDibujante(sala, socket.id)) return;

        // Espectadores: pueden comentar, pero si escriben la palabra se bloquea
        // (no puntuan, no terminan ronda, no spoilean en publico).
        if (jugador.espectador) {
          const r = validar(texto, sala.palabraSecreta ?? "");
          if (r.acierto) return; // bloqueado para no revelar
          io.to(sala.codigo).emit("mensaje_chat", payload);
          return;
        }

        // Quien ya acerto solo habla con "los que saben".
        if (jugador.haAcertadoEstaRonda) {
          enviarAQuienesSaben(io, sala, payload);
          return;
        }

        const { acierto, cerca } = validar(texto, sala.palabraSecreta ?? "");
        if (acierto) {
          registrarAcierto(sala, jugador.id);
          enviarAQuienesSaben(io, sala, payload); // no se muestra en publico
          return;
        }
        if (cerca) socket.emit("casi_aciertas", {});
        io.to(sala.codigo).emit("mensaje_chat", payload);
        return;
      }

      // Otros estados: chat publico normal (incluido el ex-dibujante).
      io.to(sala.codigo).emit("mensaje_chat", payload);
    });

    // -------------------------------------------------------- voto expulsion
    socket.on("votar_expulsion", (p) => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala, jugador } = ctx;
      if (!permitir(datos(socket).ventanaMensajes, 10)) return;
      const target = sala.jugadores.find((j) => j.id === String(p?.objetivoId));
      if (!target || target.tokenJugador === jugador.tokenJugador) return;
      const reales = jugadoresReales(sala).length;
      if (reales < 3) return; // el voto solo aplica con 3+ jugadores

      let set = sala.votosExpulsion.get(target.tokenJugador);
      if (!set) {
        set = new Set<string>();
        sala.votosExpulsion.set(target.tokenJugador, set);
      }
      if (set.has(jugador.tokenJugador)) set.delete(jugador.tokenJugador);
      else set.add(jugador.tokenJugador);

      const umbral = Math.floor((reales - 1) / 2) + 1;
      if (set.size >= umbral) expulsarJugador(sala, target);
      else difundirEstado(sala);
    });

    // -------------------------------------------------------- volver al lobby
    socket.on("volver_lobby", () => {
      const ctx = contexto(socket);
      if (!ctx) return;
      const { sala, jugador } = ctx;
      if (jugador.id !== sala.anfitrionId) return;
      if (sala.estado !== "fin_partida") return;
      volverLobby(sala);
    });

    // -------------------------------------------------------- salir / cae
    socket.on("salir_sala", () => {
      manejarSalida(io, socket, true);
    });

    socket.on("disconnect", () => {
      manejarSalida(io, socket, false);
    });
  });
}

// Reexport util por si index lo necesita.
export { terminarPartida, avanzarRonda };
