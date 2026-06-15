import { useJuego } from "../estado";

export function ListaJugadores() {
  const { sala, miId } = useJuego();
  if (!sala) return null;

  const ordenados = [...sala.jugadores].sort((a, b) => b.puntaje - a.puntaje);

  return (
    <div className="lista-jugadores">
      <h3>Jugadores</h3>
      <ul>
        {ordenados.map((j, i) => {
          const esDibujante = sala.dibujanteId === j.id;
          const soyYo = j.id === miId;
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
                {j.nombre}
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
              </span>
              <span className="puntos">{j.puntaje}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
