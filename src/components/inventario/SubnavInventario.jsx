import { NavLink } from 'react-router';
import { useAlertasInventario } from '../../context/useAlertasInventario.js';
import { textoContador, totalAlertas } from '../../utils/alertas.js';

/** Subnavegación de la sección Productos (pestañas como enlaces). */
export default function SubnavInventario() {
  const { totales } = useAlertasInventario();
  const alertas = totalAlertas(totales);
  return (
    <nav className="subnav" aria-label="Secciones de productos">
      <NavLink to="/productos" end>
        Productos
      </NavLink>
      <NavLink to="/productos/movimientos">Movimientos</NavLink>
      <NavLink to="/productos/alertas">
        Alertas
        {alertas > 0 && (
          <>
            <span className="subnav__contador" aria-hidden="true">
              {alertas}
            </span>
            <span className="solo-lectores">{textoContador(alertas)}</span>
          </>
        )}
      </NavLink>
      <NavLink to="/productos/categorias">Categorías y unidades</NavLink>
    </nav>
  );
}
