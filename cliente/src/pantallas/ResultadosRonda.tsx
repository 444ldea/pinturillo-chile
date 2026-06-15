import { useJuego } from "../estado";

export function ResultadosRonda() {
  const { resultadosRonda, sala } = useJuego();
  if (!resultadosRonda || !sala) return null;

  const { palabra, categoria, resultados } = resultadosRonda;
  const dibujanteId = sala.dibujanteId;

  // Orden: primero quienes ganaron mas esta ronda.
  const filas = [...resultados].sort(
    (a, b) => b.puntosGanados - a.puntosGanados
  );

  return (
    <div className="overlay">
      <div className="tarjeta resultados">
        <p className="r-categoria">{categoria}</p>
        <h2 className="r-palabra">{palabra}</h2>
        <p className="ayuda">La palabra era…</p>

        <ul className="r-lista">
          {filas.map((r) => {
            const esDib = r.jugadorId === dibujanteId;
            return (
              <li key={r.jugadorId} className={r.puntosGanados > 0 ? "gano" : ""}>
                <span className="r-nombre">
                  {r.nombre}
                  {esDib && <span className="r-rol"> ✏️</span>}
                  {!esDib && r.acerto && <span className="r-rol"> ✓</span>}
                </span>
                <span className="r-puntos">
                  {r.puntosGanados > 0 ? `+${r.puntosGanados}` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="ayuda centro">Siguiente ronda en unos segundos…</p>
      </div>
    </div>
  );
}
