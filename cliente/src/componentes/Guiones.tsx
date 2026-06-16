import { useEffect, useRef, type JSX } from "react";

interface Props {
  mascara: (string | null)[] | null;
}

/**
 * Renderiza la mascara como guiones monoespaciados, con los espacios visibles
 * como separacion mayor entre grupos de palabras. Anima la letra cuando una
 * pista la revela, y muestra el conteo de letras.
 */
export function Guiones({ mascara }: Props) {
  const prev = useRef<(string | null)[] | null>(null);

  // Detecta letras recien reveladas (misma palabra, una pista cayo).
  const recien = new Set<number>();
  if (mascara && prev.current && prev.current.length === mascara.length) {
    for (let i = 0; i < mascara.length; i++) {
      if (prev.current[i] === null && mascara[i] && mascara[i] !== " ") {
        recien.add(i);
      }
    }
  }

  useEffect(() => {
    prev.current = mascara;
  }, [mascara]);

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
        <span
          key={i}
          className={`g-letra revelada ${recien.has(i) ? "recien" : ""}`}
        >
          {c}
        </span>
      );
    }
  });

  const totalLetras = mascara.filter((c) => c !== " ").length;
  return (
    <div className="guiones-wrap">
      <div className="guiones" aria-label={`Palabra de ${totalLetras} letras`}>
        {elementos}
      </div>
      <span className="guiones-conteo">{totalLetras} letras</span>
    </div>
  );
}
