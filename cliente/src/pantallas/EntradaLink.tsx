import { useState } from "react";
import { useJuego } from "../estado";

/** Pantalla minima cuando entras por un link de invitacion y no tienes nombre. */
export function EntrarSala() {
  const { salaObjetivo, unirseDesdeLink } = useJuego();
  const [nombre, setNombre] = useState(
    () => localStorage.getItem("pinturillo_nombre") || ""
  );
  const ok = nombre.trim().length >= 1;

  return (
    <div className="pantalla inicio">
      <div className="marca">
        <h1>
          Pinturillo <span className="tricolor">Chile</span>
        </h1>
        <p className="subtitulo">Te invitaron a la sala {salaObjetivo}</p>
      </div>
      <div className="tarjeta">
        <label className="campo">
          <span>¿Cómo te llamas?</span>
          <input
            type="text"
            maxLength={16}
            placeholder="Tu nombre"
            value={nombre}
            autoFocus
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && ok) unirseDesdeLink(nombre.trim());
            }}
          />
        </label>
        <button
          className="btn primario grande"
          disabled={!ok}
          onClick={() => unirseDesdeLink(nombre.trim())}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

/** La sala del link no existe o expiro. */
export function SalaNoDisponible() {
  const { crearSalaNueva } = useJuego();
  return (
    <div className="pantalla inicio">
      <div className="tarjeta centro-tarjeta">
        <h2>Esta sala ya no está disponible</h2>
        <p className="ayuda">
          Puede que la partida haya terminado o el código sea incorrecto.
        </p>
        <button className="btn primario grande" onClick={crearSalaNueva}>
          Crear una sala nueva
        </button>
      </div>
    </div>
  );
}

/** La sala del link esta llena: ofrecer espectador o crear otra. */
export function SalaLlena() {
  const { salaObjetivo, entrarComoEspectador, crearSalaNueva } = useJuego();
  return (
    <div className="pantalla inicio">
      <div className="tarjeta centro-tarjeta">
        <h2>La sala {salaObjetivo} está llena</h2>
        <p className="ayuda">Puedes mirar la partida o crear tu propia sala.</p>
        <div className="botonera">
          <button className="btn primario grande" onClick={entrarComoEspectador}>
            Entrar como espectador
          </button>
          <button className="btn secundario" onClick={crearSalaNueva}>
            Crear otra sala
          </button>
        </div>
      </div>
    </div>
  );
}

/** Spinner mientras se entra automaticamente a la sala del link. */
export function EntrandoSala() {
  const { salaObjetivo } = useJuego();
  return (
    <div className="pantalla inicio">
      <div className="tarjeta centro-tarjeta">
        <h2>Entrando a la sala {salaObjetivo}…</h2>
        <div className="spinner" />
      </div>
    </div>
  );
}
