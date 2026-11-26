import Boton from '../ui/Boton.jsx';

function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

export default function Cabecera({ titulo, usuario, onAlternarMenu, menuAbierto, idMenu, onCerrarSesion, cerrando, botonMenuRef }) {
  return (
    <header className="cabecera">
      <div className="cabecera__izq">
        <button
          type="button"
          ref={botonMenuRef}
          className="boton boton--secundario boton-menu"
          aria-expanded={menuAbierto}
          aria-controls={idMenu}
          onClick={onAlternarMenu}
        >
          Menú
        </button>
        <h1>{titulo}</h1>
      </div>
      <div className="cabecera__der">
        <div className="cabecera__perfil">
          <span className="avatar avatar--administrador" data-iniciales={iniciales(usuario?.nombre)} aria-hidden="true" />
          <div className="cabecera__usuario">
            <strong>{usuario?.nombre}</strong>
            <span>Administrador</span>
          </div>
        </div>
        <Boton variante="secundario" onClick={onCerrarSesion} cargando={cerrando} textoCargando="Cerrando…">
          Cerrar sesión
        </Boton>
      </div>
    </header>
  );
}
