// ============================================================================
// Tipos del servidor — contrato de datos y de eventos Socket.IO.
// El cliente mantiene una copia equivalente en cliente/src/tipos.ts.
// ============================================================================

export type EstadoSala =
  | "lobby"
  | "eligiendo"
  | "dibujando"
  | "fin_ronda"
  | "fin_partida";

export interface Jugador {
  id: string; // socket.id actual
  tokenJugador: string; // UUID propio del cliente (persiste en localStorage)
  nombre: string; // max 16 chars, sanitizado
  puntaje: number;
  esAnfitrion: boolean;
  conectado: boolean;
  espectador: boolean; // ve la sala pero no juega (entro con sala llena)
  avatar: string | null; // PNG dataURL pequeño dibujado por el jugador
  haAcertadoEstaRonda: boolean;
  ordenAcierto: number | null;
  _puntosRondaActual?: number; // temporal, para el desglose de la ronda
}

/** Vista de jugador segura para difundir (sin el token privado). */
export interface JugadorPublico {
  id: string;
  nombre: string;
  puntaje: number;
  esAnfitrion: boolean;
  conectado: boolean;
  espectador: boolean;
  avatar: string | null;
  haAcertadoEstaRonda: boolean;
  ordenAcierto: number | null;
}

/** Un dibujo guardado de una ronda, para la galeria compartible (Feature 3). */
export interface DibujoGaleria {
  palabra: string;
  nombreDibujante: string;
  trazos: Trazo[];
}

export interface Punto {
  x: number; // 0..1 (normalizado)
  y: number; // 0..1 (normalizado)
}

export interface Trazo {
  puntos: Punto[];
  color: string; // hex
  grosor: number; // 2..40
}

export interface ConfigSala {
  totalVueltas: number; // por defecto 3 (cada jugador dibuja 3 veces)
  segundosPorRonda: number; // por defecto 80
  maxJugadores: number; // por defecto 8
}

export interface Sala {
  codigo: string; // ej "PALT-1234"
  estado: EstadoSala;
  jugadores: Jugador[];
  anfitrionId: string;

  config: ConfigSala;

  vueltaActual: number; // 1-indexed
  indiceDibujante: number; // posicion en jugadores[]
  palabraSecreta: string | null; // SOLO servidor
  categoriaActual: string | null;
  opcionesPalabras: { palabra: string; categoria: string }[];

  // Estado de guiones y pistas (seccion 5)
  mascara: (string | null)[]; // por caracter: letra revelada, null oculto, " " espacio
  indicesRevelables: number[]; // posiciones de letras que pueden revelarse como pista
  indicesYaRevelados: number[]; // posiciones ya reveladas por pistas
  pistasProgramadas: number[]; // segundos (de tiempoRestante) en los que cae cada pista

  trazos: Trazo[];
  galeria: DibujoGaleria[]; // dibujos de las rondas jugadas (Feature 3)
  // Voto de expulsion: token del objetivo -> set de tokens que votaron.
  votosExpulsion: Map<string, Set<string>>;
  baneados: Set<string>; // tokens expulsados (no pueden volver a la sala)
  tiempoRestante: number;
  timerId: NodeJS.Timeout | null; // reloj de la ronda

  palabrasUsadas: Set<string>;

  // Timers auxiliares (no forman parte de la vista publica)
  timerEleccion: NodeJS.Timeout | null;
  timerFinRonda: NodeJS.Timeout | null;
  timerDesconexionDibujante: NodeJS.Timeout | null;
  timerLimpieza: NodeJS.Timeout | null;
}

/** Vista publica de la sala (lo unico que viaja al cliente). */
export interface SalaPublica {
  codigo: string;
  estado: EstadoSala;
  jugadores: JugadorPublico[];
  config: ConfigSala;
  vueltaActual: number;
  totalVueltas: number;
  dibujanteId: string | null;
  categoriaActual: string | null;
  mascara: (string | null)[] | null; // letras visibles, null = oculto, " " = espacio
  tiempoRestante: number;
  votosExpulsion: Record<string, number>; // jugadorId -> votos en su contra
  umbralExpulsion: number; // votos necesarios para expulsar (0 = deshabilitado)
  // NUNCA incluye palabraSecreta ni opcionesPalabras
}

export interface ResultadoRonda {
  jugadorId: string;
  nombre: string;
  puntosGanados: number;
  puntajeTotal: number;
  acerto: boolean;
  orden: number | null;
}

// ----------------------------------------------------------------------------
// Mapas de eventos Socket.IO (contrato cliente <-> servidor)
// ----------------------------------------------------------------------------

export interface EventosClienteAServidor {
  crear_sala: (p: { nombre: string; tokenJugador: string }) => void;
  unirse_sala: (p: {
    codigo: string;
    nombre: string;
    tokenJugador: string;
    espectador?: boolean;
  }) => void;
  actualizar_config: (p: {
    totalVueltas?: number;
    segundosPorRonda?: number;
    maxJugadores?: number;
  }) => void;
  iniciar_partida: (p: Record<string, never>) => void;
  actualizar_avatar: (p: { avatar: string }) => void;
  elegir_palabra: (p: { indice: number }) => void;
  dibujar_trazo: (p: { trazo: Trazo }) => void;
  trazo_vivo: (p: { puntos: Punto[]; color: string; grosor: number }) => void;
  trazo_vivo_fin: (p: Record<string, never>) => void;
  deshacer_trazo: (p: Record<string, never>) => void;
  limpiar_lienzo: (p: Record<string, never>) => void;
  enviar_mensaje: (p: { texto: string }) => void;
  votar_expulsion: (p: { objetivoId: string }) => void;
  volver_lobby: (p: Record<string, never>) => void;
  salir_sala: (p: Record<string, never>) => void;
}

export interface EventosServidorACliente {
  sala_creada: (p: { codigo: string; jugador: JugadorPublico }) => void;
  estado_sala: (p: { sala: SalaPublica }) => void;
  jugador_unido: (p: { jugador: JugadorPublico }) => void;
  jugador_salio: (p: { jugadorId: string }) => void;
  elige_palabra: (p: { opciones: { palabra: string; categoria: string }[] }) => void;
  esperando_dibujante: (p: { nombreDibujante: string }) => void;
  ronda_iniciada: (p: {
    mascara: (string | null)[];
    categoria: string;
    nombreDibujante: string;
    segundos: number;
  }) => void;
  tu_palabra: (p: { palabra: string }) => void; // SOLO al dibujante
  trazo_nuevo: (p: { trazo: Trazo }) => void;
  trazo_vivo: (p: { puntos: Punto[]; color: string; grosor: number }) => void;
  trazo_vivo_fin: (p: Record<string, never>) => void;
  lienzo_limpiado: (p: Record<string, never>) => void;
  lienzo_completo: (p: { trazos: Trazo[] }) => void; // reconexion
  tiempo_actualizado: (p: { tiempoRestante: number }) => void;
  pista_revelada: (p: { mascara: (string | null)[] }) => void;
  mensaje_chat: (p: {
    jugadorId: string;
    nombre: string;
    texto: string;
    privado?: boolean;
  }) => void;
  casi_aciertas: (p: Record<string, never>) => void;
  jugador_acerto: (p: {
    jugadorId: string;
    nombre: string;
    orden: number;
    puntos: number;
  }) => void;
  ronda_terminada: (p: {
    palabra: string;
    categoria: string;
    dibujanteId: string | null;
    resultados: ResultadoRonda[];
  }) => void;
  partida_terminada: (p: { podio: ResultadoRonda[] }) => void;
  galeria_partida: (p: { dibujos: DibujoGaleria[] }) => void;
  expulsado: (p: Record<string, never>) => void; // a quien fue expulsado
  error_juego: (p: { codigo: string; mensaje: string }) => void;
}

/** Datos por-socket (rate limiting + a que sala pertenece). */
export interface DatosSocket {
  codigoSala?: string;
  tokenJugador?: string;
  ventanaTrazos: number[]; // timestamps de trazos recientes
  ventanaVivo: number[]; // timestamps de trazo en vivo (preview)
  ventanaMensajes: number[]; // timestamps de mensajes recientes
}
