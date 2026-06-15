import { useEffect } from "react";
import { useJuego } from "./estado";
import { Inicio } from "./pantallas/Inicio";
import { Lobby } from "./pantallas/Lobby";
import { Juego } from "./pantallas/Juego";
import { Podio } from "./pantallas/Podio";
import {
  EntrarSala,
  SalaNoDisponible,
  SalaLlena,
  EntrandoSala,
} from "./pantallas/EntradaLink";

export function App() {
  const {
    sala,
    error,
    limpiarError,
    conectado,
    salaObjetivo,
    errorEntrada,
  } = useJuego();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(limpiarError, 4000);
    return () => clearTimeout(t);
  }, [error, limpiarError]);

  const tieneNombre = !!localStorage.getItem("pinturillo_nombre");

  let pantalla;
  if (sala) {
    // Ya estamos dentro de una sala: flujo normal segun estado.
    if (sala.estado === "lobby") pantalla = <Lobby />;
    else if (sala.estado === "fin_partida") pantalla = <Podio />;
    else pantalla = <Juego />;
  } else if (salaObjetivo) {
    // Entrada por link de invitacion.
    if (errorEntrada === "no_existe") pantalla = <SalaNoDisponible />;
    else if (errorEntrada === "llena") pantalla = <SalaLlena />;
    else if (!tieneNombre) pantalla = <EntrarSala />;
    else pantalla = <EntrandoSala />;
  } else {
    pantalla = <Inicio />;
  }

  return (
    <div className="app">
      {!conectado && (
        <div className="aviso-conexion">Conectando al servidor…</div>
      )}
      {error && (
        <div className="toast-error" onClick={limpiarError} role="alert">
          {error}
        </div>
      )}
      {pantalla}
    </div>
  );
}
