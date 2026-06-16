import { useState } from "react";
import { useJuego } from "../estado";
import { Avatar } from "./Avatar";

export function ListaJugadores() {
  const { sala, miId, ultimoAcierto, votarExpulsion } = useJuego();
  const [votados, setVotados] = useState<Set<string>>(new Set());
  if (!sala) return null;

  const ordenados = [...sala.jugadores].sort((a, b) => b.puntaje - a.puntaje);
  const puedeVotar = sala.umbralExpulsion > 0;

  function toggleVoto(id: string) {
    votarExpulsion(id);
    setVotados((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  return (
    <div className="lista-jugadores">
      <h3>Jugadores</h3>
      <ul>
        {ordenados.map((j, i) => {
          const esDibujante = sala.dibujanteId === j.id;
          const soyYo = j.id === miId;
          const votos = sala.votosExpulsion[j.id] ?? 0;
          return (
            <li
              key={j.id}
              className={[
                j.haAcertadoEstaRonda ? "acerto" : "",
                esDibujante ? "dibujante" : "",
                j.conectado ? "" : "desconectado",
                soyYo ? "yo" : "",
              ].join(" ")}
            >
              <span className="puesto">{i + 1}</span>
              <span className="nombre">
                <Avatar id={j.id} nombre={j.nombre} avatar={j.avatar} size={22} />
                <span className="nombre-txt">{j.nombre}</span>
                {soyYo && <span className="tu"> (tú)</span>}
              </span>
              <span className="iconos">
                {j.esAnfitrion && <span title="anfitrión">★</span>}
                {esDibujante && <span title="dibuja">✏️</span>}
                {j.haAcertadoEstaRonda && (
                  <span title="adivinó" className="check">
                    ✓
                  </span>
                )}
                {!j.conectado && <span title="offline">⚠️</span>}
                {puedeVotar && !soyYo && (
                  <button
                    className={`btn-expulsar ${votados.has(j.id) ? "votado" : ""}`}
                    onClick={() => toggleVoto(j.id)}
                    title="Votar para expulsar"
                  >
                    🚫
                    {votos > 0 && (
                      <span className="voto-conteo">
                        {votos}/{sala.umbralExpulsion}
                      </span>
                    )}
                  </button>
                )}
              </span>
              <span className="puntos">{j.puntaje}</span>
              {ultimoAcierto &&
                ultimoAcierto.jugadorId === j.id &&
                ultimoAcierto.puntos > 0 && (
                  <span key={ultimoAcierto.ts} className="flota-puntos">
                    +{ultimoAcierto.puntos}
                  </span>
                )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
