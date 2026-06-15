import type { JSX } from "react";

interface Props {
  mascara: (string | null)[] | null;
}

/**
 * Renderiza la mascara como guiones monoespaciados, con los espacios visibles
 * como separacion mayor entre grupos de palabras.
 *   letra -> se muestra (preposicion pre-rellenada o pista revelada)
 *   null  -> "_"
 *   " "   -> separacion entre palabras
 */
export function Guiones({ mascara }: Props) {
  if (!mascara || mascara.length === 0) {
    return <div className="guiones vacio">…</div>;
  }

  const elementos: JSX.Element[] = [];
  mascara.forEach((c, i) => {
    if (c === " ") {
      elementos.push(<span key={i} className="g-espacio" />);
    } else if (c === null) {
      elementos.push(
        <span key={i} className="g-letra oculta">
          _
        </span>
      );
    } else {
      elementos.push(
        <span key={i} className="g-letra revelada">
          {c}
        </span>
      );
    }
  });

  const totalLetras = mascara.filter((c) => c !== " ").length;
  return (
    <div className="guiones" aria-label={`Palabra de ${totalLetras} letras`}>
      {elementos}
    </div>
  );
}
