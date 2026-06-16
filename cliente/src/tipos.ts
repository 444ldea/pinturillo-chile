// ============================================================================
// MISMO contrato de eventos que el servidor (servidor/src/tipos.ts).
// Mantener ambos en sincronia.
// ============================================================================

export type EstadoSala =
  | "lobby"
  | "eligiendo"
  | "dibujando"
  | "fin_ronda"
  | "fin_partida";

export interface Jugador {
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

export interface DibujoGaleria {
  palabra: string;
  nombreDibujante: string;
  trazos: Trazo[];
}

export interface Punto {
  x: number; // 0..1 normalizado
  y: number; // 0..1 normalizado
}

export interface Trazo {
  puntos: Punto[];
  color: string;
  grosor: number;
}

export interface ConfigSala {
  totalVueltas: number;
  segundosPorRonda: number;
  maxJugadores: number;
}

export interface SalaPublica {
  codigo: string;
  estado: EstadoSala;
  jugadores: Jugador[];
  config: ConfigSala;
  vueltaActual: number;
  totalVueltas: number;
  dibujanteId: string | null;
  categoriaActual: string | null;
  mascara: (string | null)[] | null;
  tiempoRestante: number;
}

export interface ResultadoRonda {
  jugadorId: string;
  nombre: string;
  puntosGanados: number;
  puntajeTotal: number;
  acerto: boolean;
  orden: number | null;
}

export interface OpcionPalabra {
  palabra: string;
  categoria: string;
}

// ----------------------------------------------------------------------------
// Mapas de eventos
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
  volver_lobby: (p: Record<string, never>) => void;
  salir_sala: (p: Record<string, never>) => void;
}

export interface EventosServidorACliente {
  sala_creada: (p: { codigo: string; jugador: Jugador }) => void;
  estado_sala: (p: { sala: SalaPublica }) => void;
  jugador_unido: (p: { jugador: Jugador }) => void;
  jugador_salio: (p: { jugadorId: string }) => void;
  elige_palabra: (p: { opciones: OpcionPalabra[] }) => void;
  esperando_dibujante: (p: { nombreDibujante: string }) => void;
  ronda_iniciada: (p: {
    mascara: (string | null)[];
    categoria: string;
    nombreDibujante: string;
    segundos: number;
  }) => void;
  tu_palabra: (p: { palabra: string }) => void;
  trazo_nuevo: (p: { trazo: Trazo }) => void;
  trazo_vivo: (p: { puntos: Punto[]; color: string; grosor: number }) => void;
  trazo_vivo_fin: (p: Record<string, never>) => void;
  lienzo_limpiado: (p: Record<string, never>) => void;
  lienzo_completo: (p: { trazos: Trazo[] }) => void;
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
  error_juego: (p: { codigo: string; mensaje: string }) => void;
}
