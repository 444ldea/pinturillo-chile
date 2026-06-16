import { useState } from "react";
import { useJuego } from "../estado";
import { BotonInvitar } from "../componentes/BotonInvitar";
import { Avatar } from "../componentes/Avatar";
import { EditorAvatar } from "../componentes/EditorAvatar";

export function Lobby() {
  const {
    sala,
    soyAnfitrion,
    actualizarConfig,
    iniciarPartida,
    salirSala,
  } = useJuego();
  const [copiado, setCopiado] = useState(false);
  const [editorAbierto, setEditorAbierto] = useState(false);

  if (!sala) return null;
  const cfg = sala.config;
  const conectados = sala.jugadores.filter((j) => j.conectado).length;

  function togglePack(id: string, adulto: boolean) {
    if (!sala) return;
    const activos = new Set(sala.config.packs);
    if (activos.has(id)) {
      if (activos.size === 1) return; // siempre al menos 1 pack
      activos.delete(id);
    } else {
      if (
        adulto &&
        !window.confirm(
          'El pack "Carrete +18" tiene contenido para mayores de edad. ' +
            "¿Confirmas que todos en la sala son mayores de 18?"
        )
      )
        return;
      activos.add(id);
    }
    actualizarConfig({ packs: Array.from(activos) });
  }

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

              <div className="packs">
                <span className="packs-titulo">Packs de palabras</span>
                <div className="packs-chips">
                  {sala.packsDisponibles.map((pk) => {
                    const activo = cfg.packs.includes(pk.id);
                    return (
                      <button
                        key={pk.id}
                        className={`chip-pack ${activo ? "activo" : ""} ${
                          pk.adulto ? "adulto" : ""
                        }`}
                        onClick={() => togglePack(pk.id, pk.adulto)}
                      >
                        {pk.adulto ? "🔞 " : "🎨 "}
                        {pk.nombre}
                        {pk.adulto && <span className="badge-premium">Premium</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="config-readonly">
              <h3>Configuración</h3>
              <p>{cfg.totalVueltas} vueltas · {cfg.segundosPorRonda}s · hasta {cfg.maxJugadores} jugadores</p>
              <p className="ayuda">
                Packs:{" "}
                {sala.packsDisponibles
                  .filter((pk) => cfg.packs.includes(pk.id))
                  .map((pk) => pk.nombre)
                  .join(", ")}
              </p>
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
          <div className="pj-cabecera">
            <h3>Jugadores ({conectados})</h3>
            <button
              className="btn secundario chico"
              onClick={() => setEditorAbierto(true)}
            >
              ✏️ Mi avatar
            </button>
          </div>
          <ul className="lista-lobby">
            {sala.jugadores.map((j) => (
              <li key={j.id} className={j.conectado ? "" : "desconectado"}>
                <Avatar id={j.id} nombre={j.nombre} avatar={j.avatar} />
                <span className="nombre">{j.nombre}</span>
                {j.esAnfitrion && <span className="etiqueta">★ anfitrión</span>}
                {!j.conectado && <span className="etiqueta gris">offline</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {editorAbierto && (
        <EditorAvatar onCerrar={() => setEditorAbierto(false)} />
      )}
    </div>
  );
}
