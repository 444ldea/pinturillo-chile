// ============================================================================
// Maquina de estados del juego: rondas, reloj, pistas, puntaje y transiciones
// (secciones 1, 5, 7 y 9 del prompt maestro).
//   lobby -> eligiendo -> dibujando -> fin_ronda -> (eligiendo | fin_partida)
//   fin_partida -> lobby (al reiniciar)
// ============================================================================

import { Server } from "socket.io";
import {
  EventosClienteAServidor,
  EventosServidorACliente,
  ResultadoRonda,
  Sala,
} from "./tipos";
import { jugadoresReales, vistaPublica } from "./salas";
import { elegirTresOpciones } from "./palabras";
import {
  calcularPistasProgramadas,
  construirMascara,
  revelarUnaPista,
} from "./pistas";
import { puntosAdivinador, puntosDibujante } from "./puntaje";

type IO = Server<EventosClienteAServidor, EventosServidorACliente>;

const SEGUNDOS_ELECCION = 10;
const MS_ENTRE_RONDAS = 6000;
const MS_GRACIA_DIBUJANTE = 15000;

let io: IO;
export function inicializarJuego(servidor: IO): void {
  io = servidor;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

export function difundirEstado(sala: Sala): void {
  io.to(sala.codigo).emit("estado_sala", { sala: vistaPublica(sala) });
}

function dibujanteActual(sala: Sala) {
  return sala.jugadores[sala.indiceDibujante];
}

function limpiarTimersRonda(sala: Sala): void {
  if (sala.timerId) {
    clearInterval(sala.timerId);
    sala.timerId = null;
  }
  if (sala.timerEleccion) {
    clearTimeout(sala.timerEleccion);
    sala.timerEleccion = null;
  }
  if (sala.timerFinRonda) {
    clearTimeout(sala.timerFinRonda);
    sala.timerFinRonda = null;
  }
  if (sala.timerDesconexionDibujante) {
    clearTimeout(sala.timerDesconexionDibujante);
    sala.timerDesconexionDibujante = null;
  }
}

/**
 * Avanza indiceDibujante al siguiente jugador conectado, incrementando la vuelta
 * al dar la vuelta completa. Devuelve false si ya se completaron las vueltas.
 */
function siguienteDibujante(sala: Sala): boolean {
  const n = sala.jugadores.length;
  if (n === 0) return false;
  for (let intento = 0; intento < n; intento++) {
    sala.indiceDibujante++;
    if (sala.indiceDibujante >= n) {
      sala.indiceDibujante = 0;
      sala.vueltaActual++;
    }
    if (sala.vueltaActual > sala.config.totalVueltas) return false;
    const j = sala.jugadores[sala.indiceDibujante];
    if (j && j.conectado && !j.espectador) return true; // espectadores no dibujan
  }
  return false;
}

// ---------------------------------------------------------------------------
// Transiciones
// ---------------------------------------------------------------------------

export function iniciarPartida(sala: Sala): void {
  limpiarTimersRonda(sala);
  sala.palabrasUsadas.clear();
  sala.trazos = [];
  sala.galeria = [];
  sala.jugadores.forEach((j) => {
    j.puntaje = 0;
    j.haAcertadoEstaRonda = false;
    j.ordenAcierto = null;
    j._puntosRondaActual = 0;
  });
  sala.vueltaActual = 1;
  sala.indiceDibujante = -1; // siguienteDibujante lo llevara a 0
  avanzarRonda(sala);
}

export function avanzarRonda(sala: Sala): void {
  limpiarTimersRonda(sala);
  if (jugadoresReales(sala).length < 2) {
    terminarPartida(sala);
    return;
  }
  const hay = siguienteDibujante(sala);
  if (!hay) {
    terminarPartida(sala);
    return;
  }
  comenzarEleccion(sala);
}

function comenzarEleccion(sala: Sala): void {
  if (jugadoresReales(sala).length < 2) {
    terminarPartida(sala);
    return;
  }
  sala.estado = "eligiendo";
  sala.categoriaActual = null;
  sala.palabraSecreta = null;
  sala.mascara = [];
  sala.trazos = [];
  sala.opcionesPalabras = elegirTresOpciones(sala.palabrasUsadas);

  const dibujante = dibujanteActual(sala);
  if (!dibujante) {
    avanzarRonda(sala);
    return;
  }

  io.to(dibujante.id).emit("elige_palabra", { opciones: sala.opcionesPalabras });
  io.to(sala.codigo)
    .except(dibujante.id)
    .emit("esperando_dibujante", { nombreDibujante: dibujante.nombre });
  difundirEstado(sala);

  sala.timerEleccion = setTimeout(() => {
    if (sala.estado === "eligiendo") elegirPalabra(sala, 0); // auto: primera opcion
  }, SEGUNDOS_ELECCION * 1000);
}

export function elegirPalabra(sala: Sala, indice: number): void {
  if (sala.estado !== "eligiendo") return;
  if (sala.timerEleccion) {
    clearTimeout(sala.timerEleccion);
    sala.timerEleccion = null;
  }

  const opcion =
    sala.opcionesPalabras[indice] ?? sala.opcionesPalabras[0] ?? null;
  if (!opcion) {
    avanzarRonda(sala);
    return;
  }

  sala.palabraSecreta = opcion.palabra;
  sala.categoriaActual = opcion.categoria;
  sala.palabrasUsadas.add(opcion.palabra);

  const { mascara, indicesRevelables } = construirMascara(opcion.palabra);
  sala.mascara = mascara;
  sala.indicesRevelables = indicesRevelables;
  sala.indicesYaRevelados = [];
  sala.pistasProgramadas = calcularPistasProgramadas(
    indicesRevelables.length,
    sala.config.segundosPorRonda
  );

  sala.trazos = [];
  sala.jugadores.forEach((j) => {
    j.haAcertadoEstaRonda = false;
    j.ordenAcierto = null;
    j._puntosRondaActual = 0;
  });

  sala.estado = "dibujando";
  sala.tiempoRestante = sala.config.segundosPorRonda;

  const dibujante = dibujanteActual(sala);
  io.to(sala.codigo).emit("ronda_iniciada", {
    mascara: sala.mascara,
    categoria: opcion.categoria,
    nombreDibujante: dibujante ? dibujante.nombre : "",
    segundos: sala.config.segundosPorRonda,
  });
  if (dibujante) io.to(dibujante.id).emit("tu_palabra", { palabra: opcion.palabra });
  io.to(sala.codigo).emit("lienzo_limpiado", {});
  difundirEstado(sala);

  iniciarReloj(sala);
}

function iniciarReloj(sala: Sala): void {
  if (sala.timerId) clearInterval(sala.timerId);
  sala.timerId = setInterval(() => tick(sala), 1000);
}

function tick(sala: Sala): void {
  if (sala.estado !== "dibujando") return;
  sala.tiempoRestante -= 1;

  // Pistas: revelar una letra al azar si toca en este segundo.
  if (
    sala.palabraSecreta &&
    sala.pistasProgramadas.includes(sala.tiempoRestante)
  ) {
    const idx = revelarUnaPista(
      sala.palabraSecreta,
      sala.mascara,
      sala.indicesRevelables,
      sala.indicesYaRevelados
    );
    if (idx !== null) {
      io.to(sala.codigo).emit("pista_revelada", { mascara: sala.mascara });
    }
  }

  io.to(sala.codigo).emit("tiempo_actualizado", {
    tiempoRestante: sala.tiempoRestante,
  });

  if (sala.tiempoRestante <= 0) {
    terminarRonda(sala);
  }
}

/** Registra el acierto de un adivinador (puntaje por velocidad). */
export function registrarAcierto(sala: Sala, jugadorId: string): void {
  if (sala.estado !== "dibujando") return;
  const jugador = sala.jugadores.find((j) => j.id === jugadorId);
  if (!jugador || jugador.haAcertadoEstaRonda || jugador.espectador) return;

  const orden = sala.jugadores.filter((j) => j.haAcertadoEstaRonda).length + 1;
  jugador.haAcertadoEstaRonda = true;
  jugador.ordenAcierto = orden;
  const pts = puntosAdivinador(sala);
  jugador.puntaje += pts;
  jugador._puntosRondaActual = (jugador._puntosRondaActual ?? 0) + pts;

  io.to(sala.codigo).emit("jugador_acerto", {
    jugadorId: jugador.id,
    nombre: jugador.nombre,
    orden,
  });
  difundirEstado(sala);
  verificarFinRonda(sala);
}

function verificarFinRonda(sala: Sala): void {
  const dibujante = dibujanteActual(sala);
  const adivinadores = sala.jugadores.filter(
    (j) =>
      j.conectado &&
      !j.espectador &&
      (!dibujante || j.id !== dibujante.id)
  );
  if (
    adivinadores.length > 0 &&
    adivinadores.every((j) => j.haAcertadoEstaRonda)
  ) {
    terminarRonda(sala);
  }
}

export function terminarRonda(sala: Sala, dibujanteAbandono = false): void {
  if (sala.estado !== "dibujando") return;
  limpiarTimersRonda(sala);
  sala.estado = "fin_ronda";

  const dibujante = dibujanteActual(sala);
  if (dibujante && !dibujanteAbandono) {
    const pd = puntosDibujante(sala);
    dibujante.puntaje += pd;
    dibujante._puntosRondaActual = pd;
  }

  // Guardar el dibujo de esta ronda para la galeria compartible (Feature 3).
  if (sala.palabraSecreta && sala.trazos.length > 0) {
    sala.galeria.push({
      palabra: sala.palabraSecreta,
      nombreDibujante: dibujante ? dibujante.nombre : "",
      trazos: sala.trazos.map((t) => ({
        color: t.color,
        grosor: t.grosor,
        puntos: t.puntos.map((p) => ({ x: p.x, y: p.y })),
      })),
    });
  }

  const resultados: ResultadoRonda[] = sala.jugadores
    .filter((j) => !j.espectador)
    .map((j) => ({
      jugadorId: j.id,
      nombre: j.nombre,
      puntosGanados: j._puntosRondaActual ?? 0,
      puntajeTotal: j.puntaje,
      acerto: j.haAcertadoEstaRonda,
      orden: j.ordenAcierto,
    }));

  io.to(sala.codigo).emit("ronda_terminada", {
    palabra: sala.palabraSecreta ?? "",
    categoria: sala.categoriaActual ?? "",
    resultados,
  });
  difundirEstado(sala);

  sala.timerFinRonda = setTimeout(() => avanzarRonda(sala), MS_ENTRE_RONDAS);
}

export function terminarPartida(sala: Sala): void {
  limpiarTimersRonda(sala);
  sala.estado = "fin_partida";
  sala.categoriaActual = null;
  sala.palabraSecreta = null;
  sala.mascara = [];

  const podio: ResultadoRonda[] = sala.jugadores
    .filter((j) => !j.espectador)
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((j, i) => ({
      jugadorId: j.id,
      nombre: j.nombre,
      puntosGanados: 0,
      puntajeTotal: j.puntaje,
      acerto: false,
      orden: i + 1,
    }));

  io.to(sala.codigo).emit("partida_terminada", { podio });
  io.to(sala.codigo).emit("galeria_partida", { dibujos: sala.galeria });
  difundirEstado(sala);
}

export function volverLobby(sala: Sala): void {
  limpiarTimersRonda(sala);
  sala.estado = "lobby";
  sala.vueltaActual = 0;
  sala.indiceDibujante = 0;
  sala.palabraSecreta = null;
  sala.categoriaActual = null;
  sala.opcionesPalabras = [];
  sala.mascara = [];
  sala.indicesRevelables = [];
  sala.indicesYaRevelados = [];
  sala.pistasProgramadas = [];
  sala.trazos = [];
  sala.galeria = [];
  sala.tiempoRestante = 0;
  sala.palabrasUsadas.clear();
  sala.jugadores.forEach((j) => {
    j.puntaje = 0;
    j.haAcertadoEstaRonda = false;
    j.ordenAcierto = null;
    j._puntosRondaActual = 0;
  });
  difundirEstado(sala);
}

/**
 * El dibujante actual se desconecto. Si era a mitad de eleccion, saltamos turno.
 * Si era dibujando, damos 15s de gracia; si no vuelve, termina la ronda sin
 * puntos para el dibujante.
 */
export function manejarDesconexionDibujante(sala: Sala): void {
  if (sala.estado === "eligiendo") {
    avanzarRonda(sala);
    return;
  }
  if (sala.estado === "dibujando") {
    if (sala.timerDesconexionDibujante) clearTimeout(sala.timerDesconexionDibujante);
    sala.timerDesconexionDibujante = setTimeout(() => {
      const d = dibujanteActual(sala);
      if (sala.estado === "dibujando" && d && !d.conectado) {
        terminarRonda(sala, true);
      }
    }, MS_GRACIA_DIBUJANTE);
  }
}

/** El dibujante volvio dentro del periodo de gracia. */
export function cancelarGraciaDibujante(sala: Sala): void {
  if (sala.timerDesconexionDibujante) {
    clearTimeout(sala.timerDesconexionDibujante);
    sala.timerDesconexionDibujante = null;
  }
}
