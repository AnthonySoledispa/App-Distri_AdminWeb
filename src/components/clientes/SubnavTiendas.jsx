import { NavLink } from 'react-router';

/** Subnavegación de la sección Tiendas (pestañas como enlaces). */
export default function SubnavTiendas() {
  return (
    <nav className="subnav" aria-label="Secciones de tiendas">
      <NavLink to="/tiendas" end>
        Tiendas
      </NavLink>
      <NavLink to="/tiendas/rutas">Rutas</NavLink>
    </nav>
  );
}
