import { io, Socket } from "socket.io-client";
import type {
  EventosClienteAServidor,
  EventosServidorACliente,
} from "./tipos";

// socket.io-client tipa como <EventosQueEscucha, EventosQueEmite>.
type SocketJuego = Socket<EventosServidorACliente, EventosClienteAServidor>;

function resolverURL(): string {
  const env = import.meta.env.VITE_SERVER_URL;
  if (env) return env;
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3001";
  }
  // Despliegue todo-en-uno: el backend sirve al cliente desde el mismo origen.
  return location.origin;
}

export const socket: SocketJuego = io(resolverURL(), {
  autoConnect: true,
  transports: ["websocket", "polling"],
});
