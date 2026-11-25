import Boton from '../ui/Boton.jsx';

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
        <div className="cabecera__usuario">
          <strong>{usuario?.nombre}</strong>
          <span>Administrador</span>
        </div>
        <Boton variante="secundario" onClick={onCerrarSesion} cargando={cerrando} textoCargando="Cerrando…">
          Cerrar sesión
        </Boton>
      </div>
    </header>
  );
}
