import { useState } from "react";
import { useJuego } from "../estado";
import { BotonInvitar } from "../componentes/BotonInvitar";

export function Lobby() {
  const {
    sala,
    soyAnfitrion,
    actualizarConfig,
    iniciarPartida,
    salirSala,
  } = useJuego();
  const [copiado, setCopiado] = useState(false);

  if (!sala) return null;
  const cfg = sala.config;
  const conectados = sala.jugadores.filter((j) => j.conectado).length;

  function copiar() {
    navigator.clipboard?.writeText(sala!.codigo).then(
      () => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      },
      () => {}
    );
  }

  return (
    <div className="pantalla lobby">
      <div className="lobby-grid">
        <section className="tarjeta panel-codigo">
          <h2>Sala</h2>
          <button
            className="codigo-grande"
            onClick={copiar}
            title="Click para copiar"
          >
            {sala.codigo}
          </button>
          <p className="ayuda">
            {copiado ? "¡Copiado!" : "Comparte este código o el link directo"}
          </p>

          <BotonInvitar />

          {soyAnfitrion ? (
            <div className="config">
              <h3>Configuración</h3>
              <label className="campo-rango">
                <span>Vueltas por jugador: {cfg.totalVueltas}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={cfg.totalVueltas}
                  onChange={(e) =>
                    actualizarConfig({ totalVueltas: Number(e.target.value) })
                  }
                />
              </label>
              <label className="campo-rango">
                <span>Segundos por ronda: {cfg.segundosPorRonda}</span>
                <input
                  type="range"
                  min={30}
                  max={180}
                  step={5}
                  value={cfg.segundosPorRonda}
                  onChange={(e) =>
                    actualizarConfig({
                      segundosPorRonda: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="campo-rango">
                <span>Máximo de jugadores: {cfg.maxJugadores}</span>
                <input
                  type="range"
                  min={2}
                  max={12}
                  value={cfg.maxJugadores}
                  onChange={(e) =>
                    actualizarConfig({ maxJugadores: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          ) : (
            <div className="config-readonly">
              <h3>Configuración</h3>
              <p>{cfg.totalVueltas} vueltas · {cfg.segundosPorRonda}s · hasta {cfg.maxJugadores} jugadores</p>
              <p className="ayuda">Esperando al anfitrión…</p>
            </div>
          )}

          <div className="fila">
            {soyAnfitrion && (
              <button
                className="btn primario grande"
                disabled={conectados < 2}
                onClick={iniciarPartida}
                title={conectados < 2 ? "Se necesitan 2+ jugadores" : ""}
              >
                Iniciar partida
              </button>
            )}
            <button className="btn fantasma" onClick={salirSala}>
              Salir
            </button>
          </div>
          {conectados < 2 && (
            <p className="ayuda">Faltan jugadores para empezar (mínimo 2).</p>
          )}
        </section>

        <section className="tarjeta panel-jugadores">
          <h3>Jugadores ({conectados})</h3>
          <ul className="lista-lobby">
            {sala.jugadores.map((j) => (
              <li key={j.id} className={j.conectado ? "" : "desconectado"}>
                <span className="avatar">{j.nombre.slice(0, 1).toUpperCase()}</span>
                <span className="nombre">{j.nombre}</span>
                {j.esAnfitrion && <span className="etiqueta">★ anfitrión</span>}
                {!j.conectado && <span className="etiqueta gris">offline</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
