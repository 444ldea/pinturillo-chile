import { useJuego } from "../estado";
import { Guiones } from "./Guiones";

export function BarraSuperior() {
  const { sala, soyDibujante, miPalabra, mascara, tiempoRestante } = useJuego();
  if (!sala) return null;

  const dibujando = sala.estado === "dibujando";
  const urgente = dibujando && tiempoRestante <= 10;

  return (
    <header className="barra-superior">
      <div className="bs-bloque ronda">
        <span className="bs-etiqueta">Vuelta</span>
        <span className="bs-valor">
          {Math.max(1, sala.vueltaActual)}/{sala.totalVueltas}
        </span>
      </div>

      <div className="bs-bloque centro">
        {sala.categoriaActual && (
          <div className="bs-categoria">{sala.categoriaActual}</div>
        )}
        {dibujando && soyDibujante && miPalabra ? (
          <div className="bs-palabra-dibujante">
            Dibuja: <strong>{miPalabra}</strong>
          </div>
        ) : (
          <Guiones mascara={mascara} />
        )}
      </div>

      <div className={`bs-bloque reloj ${urgente ? "urgente" : ""}`}>
        <span className="bs-reloj">{dibujando ? tiempoRestante : "—"}</span>
        <span className="bs-etiqueta">seg</span>
      </div>
    </header>
  );
}
