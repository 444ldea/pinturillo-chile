import { colorJugador } from "../util";

interface Props {
  id: string;
  nombre: string;
  avatar: string | null;
  size?: number;
}

/** Muestra el avatar dibujado del jugador, o la inicial con su color si no tiene. */
export function Avatar({ id, nombre, avatar, size = 34 }: Props) {
  if (avatar) {
    return (
      <img
        className="avatar-img"
        src={avatar}
        alt={nombre}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="avatar"
      style={{
        background: colorJugador(id),
        width: size,
        height: size,
        fontSize: size * 0.45,
      }}
    >
      {nombre.slice(0, 1).toUpperCase()}
    </span>
  );
}
