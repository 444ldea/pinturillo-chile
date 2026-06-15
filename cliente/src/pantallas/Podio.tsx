import { useJuego } from "../estado";
import { Galeria } from "../componentes/Galeria";

export function Podio() {
  const { podio, sala, soyAnfitrion, volverLobby, salirSala, miId } = useJuego();
  const tabla = podio ?? [];
  if (tabla.length === 0 && !sala) return null;

  const top3 = tabla.slice(0, 3);
  // Orden visual del podio: 2º, 1º, 3º
  const ordenPodio = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="pantalla podio">
      <h1 className="titulo-podio">🏆 Resultados finales</h1>

      <div className="podio-cajas">
        {ordenPodio.map((r) => {
          const lugar = r.orden ?? 0;
          return (
            <div key={r.jugadorId} className={`caja-podio lugar-${lugar}`}>
              <div className="medalla">
                {lugar === 1 ? "🥇" : lugar === 2 ? "🥈" : "🥉"}
              </div>
              <div className="p-nombre">{r.nombre}</div>
              <div className="p-puntos">{r.puntajeTotal} pts</div>
              <div className="pilar" />
            </div>
          );
        })}
      </div>

      <div className="tarjeta tabla-final">
        <h3>Tabla completa</h3>
        <ol>
          {tabla.map((r) => (
            <li key={r.jugadorId} className={r.jugadorId === miId ? "yo" : ""}>
              <span className="t-puesto">{r.orden}</span>
              <span className="t-nombre">{r.nombre}</span>
              <span className="t-puntos">{r.puntajeTotal}</span>
            </li>
          ))}
        </ol>
      </div>

      <Galeria />

      <div className="fila centro">
        {soyAnfitrion ? (
          <button className="btn primario grande" onClick={volverLobby}>
            Jugar de nuevo
          </button>
        ) : (
          <p className="ayuda">Esperando que el anfitrión reinicie…</p>
        )}
        <button className="btn fantasma" onClick={salirSala}>
          Salir
        </button>
      </div>
    </div>
  );
}
