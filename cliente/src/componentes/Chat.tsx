import { useEffect, useRef, useState } from "react";
import { useJuego } from "../estado";

export function Chat() {
  const { mensajes, enviarMensaje, soyDibujante, sala, yo } = useJuego();
  const [texto, setTexto] = useState("");
  const finRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const dibujandoAhora = sala?.estado === "dibujando";
  const yaAcerto = !!yo?.haAcertadoEstaRonda;
  // El dibujante no puede chatear durante su ronda.
  const deshabilitado = dibujandoAhora && soyDibujante;

  let placeholder = "Escribe un mensaje…";
  if (deshabilitado) placeholder = "Estás dibujando: no puedes chatear";
  else if (dibujandoAhora && !yaAcerto) placeholder = "Escribe tu adivinanza…";
  else if (dibujandoAhora && yaAcerto) placeholder = "Chat de los que ya saben…";

  function enviar() {
    const t = texto.trim();
    if (!t) return;
    enviarMensaje(t);
    setTexto("");
  }

  return (
    <div className="chat">
      <div className="chat-mensajes">
        {mensajes.map((m) => (
          <div key={m.id} className={`msg ${m.tipo}`}>
            {m.tipo === "normal" || m.tipo === "privado" ? (
              <>
                <span className="msg-nombre">{m.nombre}:</span> {m.texto}
                {m.tipo === "privado" && <span className="candado"> 🔒</span>}
              </>
            ) : (
              <span className="msg-sistema">{m.texto}</span>
            )}
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <div className="chat-entrada">
        <input
          type="text"
          maxLength={100}
          placeholder={placeholder}
          value={texto}
          disabled={deshabilitado}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") enviar();
          }}
        />
        <button
          className="btn primario"
          onClick={enviar}
          disabled={deshabilitado || !texto.trim()}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
