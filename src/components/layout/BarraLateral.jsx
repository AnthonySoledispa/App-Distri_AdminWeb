import { NavLink } from 'react-router';
import logo from '../../assets/logo-distrigo.png';

const SECCIONES = [
  { etiqueta: 'Inicio', ruta: '/', fin: true },
  { etiqueta: 'Productos' },
  { etiqueta: 'Tiendas' },
  { etiqueta: 'Pedidos' },
  { etiqueta: 'Rutas' },
  { etiqueta: 'Cobros' },
  { etiqueta: 'Reportes' },
  { etiqueta: 'Usuarios', ruta: '/usuarios' },
  { etiqueta: 'Agentes IA' },
];

export default function BarraLateral({ id, abierta, onNavegar }) {
  return (
    <>
      <aside id={id} className={`barra ${abierta ? 'barra--abierta' : ''}`} aria-label="Barra lateral">
        <div className="barra__marca">
          <span className="barra__placa">
            <img src={logo} alt="" />
          </span>
          <span className="barra__nombre">DistriGO</span>
        </div>
        <nav aria-label="Principal">
          <ul className="barra__menu">
            {SECCIONES.map((s) => (
              <li key={s.etiqueta}>
                {s.ruta ? (
                  <NavLink to={s.ruta} end={s.fin} className="barra__item" onClick={onNavegar}>
                    {s.etiqueta}
                  </NavLink>
                ) : (
                  <span className="barra__item barra__item--deshabilitado" aria-disabled="true" role="link">
                    <span>{s.etiqueta}</span>
                    <span className="barra__pronto">Próximamente</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      {abierta && <div className="barra__velo" onClick={onNavegar} aria-hidden="true" />}
    </>
  );
}
