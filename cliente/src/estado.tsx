// ============================================================================
// Estado global del cliente: centraliza la conexion Socket.IO, el estado de la
// sala, el flujo de entrada por link (/sala/:codigo) y todas las acciones.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { socket } from "./socket";
import { sonidos } from "./sonido";
import type {
  DibujoGaleria,
  Jugador,
  OpcionPalabra,
  ResultadoRonda,
  SalaPublica,
  Trazo,
} from "./tipos";

const K_TOKEN = "pinturillo_token";
const K_CODIGO = "pinturillo_codigo";
const K_NOMBRE = "pinturillo_nombre";
const K_AVATAR = "pinturillo_avatar";

function obtenerToken(): string {
  let t = localStorage.getItem(K_TOKEN);
  if (!t) {
    t =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(K_TOKEN, t);
  }
  return t;
}

function nombreGuardado(): string {
  return localStorage.getItem(K_NOMBRE) || "";
}

function parseSalaDeRuta(): string | null {
  const m = location.pathname.match(/^\/sala\/([A-Za-z0-9-]+)/);
  return m ? m[1].toUpperCase() : null;
}

function navegar(path: string) {
  if (location.pathname !== path) history.pushState({}, "", path);
}

export interface MensajeUI {
  id: number;
  jugadorId?: string;
  nombre?: string;
  texto: string;
  tipo: "normal" | "sistema" | "acierto" | "privado" | "cerca" | "error";
}

export interface ResultadosRondaUI {
  palabra: string;
  categoria: string;
  dibujanteId: string | null;
  resultados: ResultadoRonda[];
}

export type ErrorEntrada = "no_existe" | "llena" | null;

export interface AciertoUI {
  jugadorId: string;
  nombre: string;
  puntos: number;
  esYo: boolean;
  ts: number;
}

interface ValorJuego {
  conectado: boolean;
  miId: string;
  miToken: string;
  codigo: string | null;
  enlaceSala: string | null;
  sala: SalaPublica | null;
  tiempoRestante: number;
  yo: Jugador | null;
  soyDibujante: boolean;
  soyAnfitrion: boolean;
  soyEspectador: boolean;
  opciones: OpcionPalabra[] | null;
  miPalabra: string | null;
  mascara: (string | null)[] | null;
  trazos: Trazo[];
  trazoVivoRemoto: Trazo | null;
  ultimoAcierto: AciertoUI | null;
  mensajes: MensajeUI[];
  resultadosRonda: ResultadosRondaUI | null;
  podio: ResultadoRonda[] | null;
  galeria: DibujoGaleria[];
  saludTs: number | null;
  miAvatar: string | null;
  error: string | null;
  toast: { texto: string; ts: number } | null;
  // flujo de entrada por link
  salaObjetivo: string | null;
  errorEntrada: ErrorEntrada;
  // acciones
  crearSala: (nombre: string) => void;
  unirseSala: (codigo: string, nombre: string) => void;
  unirseDesdeLink: (nombre: string) => void;
  entrarComoEspectador: () => void;
  crearSalaNueva: () => void;
  actualizarConfig: (cfg: {
    totalVueltas?: number;
    segundosPorRonda?: number;
    maxJugadores?: number;
    packs?: string[];
  }) => void;
  iniciarPartida: () => void;
  guardarAvatar: (dataUrl: string) => void;
  elegirPalabra: (indice: number) => void;
  dibujarTrazo: (trazo: Trazo) => void;
  emitirTrazoVivo: (
    puntos: { x: number; y: number }[],
    color: string,
    grosor: number
  ) => void;
  emitirTrazoVivoFin: () => void;
  deshacerTrazo: () => void;
  limpiarLienzo: () => void;
  enviarMensaje: (texto: string) => void;
  votarExpulsion: (objetivoId: string) => void;
  volverLobby: () => void;
  salirSala: () => void;
  limpiarError: () => void;
}

const ContextoJuego = createContext<ValorJuego | null>(null);

let contadorMensajes = 1;

export function ProveedorJuego({ children }: { children: ReactNode }) {
  const miToken = useRef<string>(obtenerToken());
  const [conectado, setConectado] = useState(socket.connected);
  const [miId, setMiId] = useState<string>(socket.id ?? "");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [sala, setSala] = useState<SalaPublica | null>(null);
  const [opciones, setOpciones] = useState<OpcionPalabra[] | null>(null);
  const [miPalabra, setMiPalabra] = useState<string | null>(null);
  const [mascara, setMascara] = useState<(string | null)[] | null>(null);
  const [trazos, setTrazos] = useState<Trazo[]>([]);
  const [trazoVivoRemoto, setTrazoVivoRemoto] = useState<Trazo | null>(null);
  const [ultimoAcierto, setUltimoAcierto] = useState<AciertoUI | null>(null);
  const [mensajes, setMensajes] = useState<MensajeUI[]>([]);
  const [resultadosRonda, setResultadosRonda] =
    useState<ResultadosRondaUI | null>(null);
  const [podio, setPodio] = useState<ResultadoRonda[] | null>(null);
  const [galeria, setGaleria] = useState<DibujoGaleria[]>([]);
  const [saludTs, setSaludTs] = useState<number | null>(null);
  const [miAvatar, setMiAvatar] = useState<string | null>(() =>
    localStorage.getItem(K_AVATAR)
  );
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ texto: string; ts: number } | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [salaObjetivo, setSalaObjetivo] = useState<string | null>(
    parseSalaDeRuta()
  );
  const [errorEntrada, setErrorEntrada] = useState<ErrorEntrada>(null);

  const codigoRef = useRef<string | null>(null);
  codigoRef.current = codigo;
  const miIdRef = useRef<string>(miId);
  miIdRef.current = miId;
  const salaObjetivoRef = useRef<string | null>(salaObjetivo);
  salaObjetivoRef.current = salaObjetivo;
  const opcionesRef = useRef<OpcionPalabra[] | null>(null);
  opcionesRef.current = opciones;

  const agregarMensaje = useCallback((m: Omit<MensajeUI, "id">) => {
    setMensajes((prev) => {
      const siguiente = [...prev, { ...m, id: contadorMensajes++ }];
      return siguiente.length > 200 ? siguiente.slice(-200) : siguiente;
    });
  }, []);

  // -------------------------------------------------------- wiring de eventos
  useEffect(() => {
    function onConnect() {
      setConectado(true);
      setMiId(socket.id ?? "");
      const objetivoLink = salaObjetivoRef.current;
      const guardadoCodigo = localStorage.getItem(K_CODIGO);
      const nombre = nombreGuardado();
      // prioridad: sala actual en memoria > link de invitacion > sala guardada
      const objetivo = codigoRef.current || objetivoLink || guardadoCodigo;
      if (!objetivo) return;
      const vieneDeLink = !!objetivoLink && objetivo === objetivoLink;
      if (vieneDeLink && !nombre) return; // esperar a que ingrese su nombre
      socket.emit("unirse_sala", {
        codigo: objetivo,
        nombre: nombre || "Jugador",
        tokenJugador: miToken.current,
      });
    }
    function onDisconnect() {
      setConectado(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("sala_creada", ({ codigo }) => {
      setCodigo(codigo);
      setSalaObjetivo(null);
      setErrorEntrada(null);
      localStorage.setItem(K_CODIGO, codigo);
      navegar(`/sala/${codigo}`);
      // Ya estamos en la sala: comparte tu avatar guardado (si tienes).
      const av = localStorage.getItem(K_AVATAR);
      if (av) socket.emit("actualizar_avatar", { avatar: av });
    });

    socket.on("estado_sala", ({ sala }) => {
      setSala(sala);
      setCodigo(sala.codigo);
      setSalaObjetivo(null);
      setErrorEntrada(null);
      if (location.pathname !== `/sala/${sala.codigo}`) {
        history.replaceState({}, "", `/sala/${sala.codigo}`);
      }
      setTiempoRestante(sala.tiempoRestante);
      if (sala.estado === "dibujando" && sala.mascara) setMascara(sala.mascara);
      if (sala.estado === "lobby") {
        setOpciones(null);
        setMiPalabra(null);
        setMascara(null);
        setTrazos([]);
        setResultadosRonda(null);
        setPodio(null);
        setGaleria([]);
      }
      if (sala.estado !== "fin_partida") setPodio(null);
      if (sala.estado !== "fin_ronda") setResultadosRonda(null);
    });

    socket.on("jugador_unido", ({ jugador }) => {
      agregarMensaje({
        tipo: "sistema",
        texto: `${jugador.nombre} se unio${jugador.espectador ? " (espectador)" : ""}`,
      });
      setToast({ texto: `${jugador.nombre} se unió 👋`, ts: Date.now() });
      sonidos.jugadorEntra();
    });

    socket.on("elige_palabra", ({ opciones }) => {
      setOpciones(opciones);
      setMiPalabra(null);
    });

    socket.on("esperando_dibujante", () => {
      setOpciones(null);
    });

    socket.on(
      "ronda_iniciada",
      ({ mascara, categoria, nombreDibujante, segundos }) => {
        setMascara(mascara);
        setTiempoRestante(segundos);
        setTrazos([]);
        setOpciones(null);
        setResultadosRonda(null);
        setTrazoVivoRemoto(null);
        agregarMensaje({
          tipo: "sistema",
          texto: `Ronda nueva: dibuja ${nombreDibujante} (${categoria})`,
        });
        sonidos.inicioRonda();
      }
    );

    socket.on("tiempo_actualizado", ({ tiempoRestante }) => {
      setTiempoRestante(tiempoRestante);
      if (tiempoRestante > 0 && tiempoRestante <= 10) sonidos.tic();
    });

    socket.on("tu_palabra", ({ palabra }) => setMiPalabra(palabra));

    socket.on("trazo_nuevo", ({ trazo }) => {
      setTrazos((prev) => [...prev, trazo]);
      setTrazoVivoRemoto(null);
    });
    socket.on("lienzo_limpiado", () => {
      setTrazos([]);
      setTrazoVivoRemoto(null);
    });
    socket.on("lienzo_completo", ({ trazos }) => {
      setTrazos(trazos);
      setTrazoVivoRemoto(null);
    });
    socket.on("trazo_vivo", ({ puntos, color, grosor }) =>
      setTrazoVivoRemoto({ puntos, color, grosor })
    );
    socket.on("trazo_vivo_fin", () => setTrazoVivoRemoto(null));
    socket.on("pista_revelada", ({ mascara }) => setMascara(mascara));

    socket.on("mensaje_chat", ({ jugadorId, nombre, texto, privado }) => {
      agregarMensaje({
        jugadorId,
        nombre,
        texto,
        tipo: privado ? "privado" : "normal",
      });
    });

    socket.on("casi_aciertas", () => {
      agregarMensaje({ tipo: "cerca", texto: "Estas muy cerca!" });
      sonidos.cerca();
    });

    socket.on("jugador_acerto", ({ jugadorId, nombre, orden, puntos }) => {
      agregarMensaje({
        tipo: "acierto",
        texto: `${nombre} adivino la palabra! (#${orden})`,
      });
      const esYo = jugadorId === miIdRef.current;
      setUltimoAcierto({ jugadorId, nombre, puntos, esYo, ts: Date.now() });
      if (esYo) sonidos.acertasteTu();
      else sonidos.acierto();
    });

    socket.on(
      "ronda_terminada",
      ({ palabra, categoria, dibujanteId, resultados }) => {
        setResultadosRonda({ palabra, categoria, dibujanteId, resultados });
        setMiPalabra(null);
        setOpciones(null);
        setTrazoVivoRemoto(null);
        agregarMensaje({ tipo: "sistema", texto: `La palabra era: ${palabra}` });
      }
    );

    socket.on("partida_terminada", ({ podio }) => {
      setPodio(podio);
      setResultadosRonda(null);
      sonidos.finPartida();
    });

    socket.on("galeria_partida", ({ dibujos }) => setGaleria(dibujos));

    socket.on("salud", () => {
      setSaludTs(Date.now());
      sonidos.salud();
    });

    socket.on("expulsado", () => {
      localStorage.removeItem(K_CODIGO);
      navegar("/");
      setCodigo(null);
      setSala(null);
      setSalaObjetivo(null);
      setErrorEntrada(null);
      setOpciones(null);
      setMiPalabra(null);
      setMascara(null);
      setTrazos([]);
      setMensajes([]);
      setResultadosRonda(null);
      setPodio(null);
      setGaleria([]);
      setError("Fuiste expulsado de la sala 👋");
    });

    socket.on("error_juego", ({ codigo: cod, mensaje }) => {
      if (salaObjetivoRef.current && !codigoRef.current) {
        // error durante la entrada por link: lo mostramos como pantalla, no toast
        if (cod === "SALA_NO_EXISTE") {
          setErrorEntrada("no_existe");
          localStorage.removeItem(K_CODIGO);
          return;
        }
        if (cod === "SALA_LLENA") {
          setErrorEntrada("llena");
          return;
        }
      }
      setError(mensaje);
      if (
        cod === "SALA_NO_EXISTE" ||
        cod === "SALA_LLENA" ||
        cod === "EXPULSADO"
      ) {
        localStorage.removeItem(K_CODIGO);
        setSalaObjetivo(null);
        if (!sala) setCodigo(null);
      }
    });

    // Si el socket ya estaba conectado al montar, dispara la (re)entrada.
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("sala_creada");
      socket.off("estado_sala");
      socket.off("jugador_unido");
      socket.off("elige_palabra");
      socket.off("esperando_dibujante");
      socket.off("ronda_iniciada");
      socket.off("tiempo_actualizado");
      socket.off("tu_palabra");
      socket.off("trazo_nuevo");
      socket.off("lienzo_limpiado");
      socket.off("lienzo_completo");
      socket.off("trazo_vivo");
      socket.off("trazo_vivo_fin");
      socket.off("pista_revelada");
      socket.off("mensaje_chat");
      socket.off("casi_aciertas");
      socket.off("jugador_acerto");
      socket.off("ronda_terminada");
      socket.off("partida_terminada");
      socket.off("galeria_partida");
      socket.off("salud");
      socket.off("expulsado");
      socket.off("error_juego");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agregarMensaje]);

  // -------------------------------------------------------- acciones
  const crearSala = useCallback((nombre: string) => {
    localStorage.setItem(K_NOMBRE, nombre);
    setErrorEntrada(null);
    setSalaObjetivo(null);
    socket.emit("crear_sala", { nombre, tokenJugador: miToken.current });
  }, []);

  const unirseSala = useCallback((cod: string, nombre: string) => {
    const limpio = cod.toUpperCase().trim();
    localStorage.setItem(K_NOMBRE, nombre);
    localStorage.setItem(K_CODIGO, limpio);
    setErrorEntrada(null);
    socket.emit("unirse_sala", {
      codigo: limpio,
      nombre,
      tokenJugador: miToken.current,
    });
  }, []);

  const unirseDesdeLink = useCallback((nombre: string) => {
    const objetivo = salaObjetivoRef.current;
    if (!objetivo) return;
    localStorage.setItem(K_NOMBRE, nombre);
    setErrorEntrada(null);
    socket.emit("unirse_sala", {
      codigo: objetivo,
      nombre,
      tokenJugador: miToken.current,
    });
  }, []);

  const entrarComoEspectador = useCallback(() => {
    const objetivo = salaObjetivoRef.current;
    if (!objetivo) return;
    setErrorEntrada(null);
    socket.emit("unirse_sala", {
      codigo: objetivo,
      nombre: nombreGuardado() || "Espectador",
      tokenJugador: miToken.current,
      espectador: true,
    });
  }, []);

  const crearSalaNueva = useCallback(() => {
    setErrorEntrada(null);
    setSalaObjetivo(null);
    localStorage.removeItem(K_CODIGO);
    navegar("/");
    const nombre = nombreGuardado();
    if (nombre) {
      socket.emit("crear_sala", { nombre, tokenJugador: miToken.current });
    }
  }, []);

  const actualizarConfig = useCallback(
    (cfg: {
      totalVueltas?: number;
      segundosPorRonda?: number;
      maxJugadores?: number;
      packs?: string[];
    }) => socket.emit("actualizar_config", cfg),
    []
  );

  const iniciarPartida = useCallback(() => {
    setMensajes([]);
    setGaleria([]);
    socket.emit("iniciar_partida", {});
  }, []);

  const guardarAvatar = useCallback((dataUrl: string) => {
    localStorage.setItem(K_AVATAR, dataUrl);
    setMiAvatar(dataUrl);
    socket.emit("actualizar_avatar", { avatar: dataUrl });
  }, []);

  const elegirPalabra = useCallback((indice: number) => {
    const op = opcionesRef.current?.[indice];
    if (op) setMiPalabra(op.palabra); // feedback inmediato
    setOpciones(null);
    socket.emit("elegir_palabra", { indice });
  }, []);

  const dibujarTrazo = useCallback((trazo: Trazo) => {
    setTrazos((prev) => [...prev, trazo]);
    socket.emit("dibujar_trazo", { trazo });
  }, []);

  const emitirTrazoVivo = useCallback(
    (puntos: { x: number; y: number }[], color: string, grosor: number) => {
      socket.emit("trazo_vivo", { puntos, color, grosor });
    },
    []
  );

  const emitirTrazoVivoFin = useCallback(() => {
    socket.emit("trazo_vivo_fin", {});
  }, []);

  const deshacerTrazo = useCallback(() => {
    setTrazos((prev) => prev.slice(0, -1)); // optimista
    socket.emit("deshacer_trazo", {});
  }, []);

  const limpiarLienzo = useCallback(() => {
    setTrazos([]);
    socket.emit("limpiar_lienzo", {});
  }, []);

  const enviarMensaje = useCallback((texto: string) => {
    const limpio = texto.slice(0, 100);
    if (!limpio.trim()) return;
    socket.emit("enviar_mensaje", { texto: limpio });
  }, []);

  const votarExpulsion = useCallback((objetivoId: string) => {
    socket.emit("votar_expulsion", { objetivoId });
  }, []);

  const volverLobby = useCallback(() => socket.emit("volver_lobby", {}), []);

  const salirSala = useCallback(() => {
    socket.emit("salir_sala", {});
    localStorage.removeItem(K_CODIGO);
    navegar("/");
    setCodigo(null);
    setSala(null);
    setSalaObjetivo(null);
    setErrorEntrada(null);
    setOpciones(null);
    setMiPalabra(null);
    setMascara(null);
    setTrazos([]);
    setMensajes([]);
    setResultadosRonda(null);
    setPodio(null);
    setGaleria([]);
  }, []);

  const limpiarError = useCallback(() => setError(null), []);

  // -------------------------------------------------------- derivados
  const yo = useMemo(
    () => sala?.jugadores.find((j) => j.id === miId) ?? null,
    [sala, miId]
  );
  const soyDibujante = !!sala && !!yo && sala.dibujanteId === yo.id;
  const soyAnfitrion = !!yo && yo.esAnfitrion;
  const soyEspectador = !!yo && yo.espectador;
  const enlaceSala = codigo ? `${location.origin}/sala/${codigo}` : null;

  const valor: ValorJuego = {
    conectado,
    miId,
    miToken: miToken.current,
    codigo,
    enlaceSala,
    sala,
    tiempoRestante,
    yo,
    soyDibujante,
    soyAnfitrion,
    soyEspectador,
    opciones,
    miPalabra,
    mascara,
    trazos,
    trazoVivoRemoto,
    ultimoAcierto,
    mensajes,
    resultadosRonda,
    podio,
    galeria,
    saludTs,
    miAvatar,
    error,
    toast,
    salaObjetivo,
    errorEntrada,
    crearSala,
    unirseSala,
    unirseDesdeLink,
    entrarComoEspectador,
    crearSalaNueva,
    actualizarConfig,
    iniciarPartida,
    guardarAvatar,
    elegirPalabra,
    dibujarTrazo,
    emitirTrazoVivo,
    emitirTrazoVivoFin,
    deshacerTrazo,
    limpiarLienzo,
    enviarMensaje,
    votarExpulsion,
    volverLobby,
    salirSala,
    limpiarError,
  };

  return (
    <ContextoJuego.Provider value={valor}>{children}</ContextoJuego.Provider>
  );
}

export function useJuego(): ValorJuego {
  const ctx = useContext(ContextoJuego);
  if (!ctx) throw new Error("useJuego debe usarse dentro de <ProveedorJuego>");
  return ctx;
}
