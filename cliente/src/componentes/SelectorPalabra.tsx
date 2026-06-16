import { useJuego } from "../estado";

export function SelectorPalabra() {
  const { opciones, elegirPalabra } = useJuego();
  if (!opciones) return null;

  return (
    <div className="overlay">
      <div className="tarjeta selector">
        <h2>Elige una palabra para dibujar</h2>
        <p className="ayuda">
          Tienes 10 segundos o se elige la primera. ✏️ Dibújala, ¡no la escribas!
        </p>
        <div className="opciones">
          {opciones.map((op, i) => (
            <button
              key={`${op.palabra}-${i}`}
              className="btn opcion"
              onClick={() => elegirPalabra(i)}
            >
              <span className="op-palabra">{op.palabra}</span>
              <span className="op-categoria">{op.categoria}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
