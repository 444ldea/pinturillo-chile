import { useState } from "react";
import { useJuego } from "../estado";
import { DONACION_URL, HAY_DONACION } from "../config";

export function Inicio() {
  const { crearSala, unirseSala } = useJuego();
  const [nombre, setNombre] = useState(
    () => localStorage.getItem("pinturillo_nombre") || ""
  );
  const [codigo, setCodigo] = useState("");
  const [modo, setModo] = useState<"menu" | "unirse">("menu");

  const nombreOk = nombre.trim().length >= 1;

  return (
    <div className="pantalla inicio">
      <div className="marca">
        <h1>
          Pinturillo <span className="tricolor">Chile</span>
        </h1>
        <p className="subtitulo">Dibuja, adivina y gana. Pelambre garantizado.</p>
      </div>

      <div className="tarjeta">
        <label className="campo">
          <span>Tu nombre</span>
          <input
            type="text"
            maxLength={16}
            placeholder="Ej: Pedrito"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
        </label>

        {modo === "menu" ? (
          <div className="botonera">
            <button
              className="btn primario grande"
              disabled={!nombreOk}
              onClick={() => crearSala(nombre.trim())}
            >
              Crear sala
            </button>
            <button
              className="btn secundario grande"
              disabled={!nombreOk}
              onClick={() => setModo("unirse")}
            >
              Unirse con código
            </button>
          </div>
        ) : (
          <div className="botonera">
            <label className="campo">
              <span>Código de sala</span>
              <input
                type="text"
                placeholder="Ej: PALT-1234"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nombreOk && codigo.trim())
                    unirseSala(codigo.trim(), nombre.trim());
                }}
              />
            </label>
            <div className="fila">
              <button
                className="btn primario"
                disabled={!nombreOk || !codigo.trim()}
                onClick={() => unirseSala(codigo.trim(), nombre.trim())}
              >
                Entrar
              </button>
              <button className="btn fantasma" onClick={() => setModo("menu")}>
                Volver
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="pie">
        Hecho a la chilena · juego en tiempo real · sin registro
        {HAY_DONACION && (
          <>
            {" · "}
            <a
              className="link-donar"
              href={DONACION_URL}
              target="_blank"
              rel="noreferrer"
            >
              ❤️ Apóyanos
            </a>
          </>
        )}
      </footer>
    </div>
  );
}
