import { NavLink } from 'react-router';
import { useAlertasInventario } from '../../context/useAlertasInventario.js';
import { textoContador, totalAlertas } from '../../utils/alertas.js';
import logo from '../../assets/logo-distrigo.png';

/* Iconos de trazo (24x24). Son decorativos: el texto del enlace da el nombre. */
const ICONOS = {
  inicio: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
  productos: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  tiendas: 'M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3m0 0c0 1.7 1 3 2 3s2-1.3 2-3m0 0c0 1.7 1.3 3 3 3s3-1.3 3-3',
  pedidos: 'M7 4h10l1 3v13H6V7zM6 7h12M9 11h6M9 15h4',
  rutas: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6',
  cobros: 'M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v.01M18 14v.01',
  reportes: 'M5 20V10M10 20V4M15 20v-7M20 20v-4M3 20h18',
  usuarios: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c1.8.8 3 2.6 3 6',
  agentes: 'M7 8h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM12 4v4M9.5 13v1M14.5 13v1M3 13v2M21 13v2',
};

const SECCIONES = [
  { etiqueta: 'Inicio', icono: 'inicio', ruta: '/', fin: true },
  { etiqueta: 'Productos', icono: 'productos', ruta: '/productos', contador: true },
  { etiqueta: 'Tiendas', icono: 'tiendas' },
  { etiqueta: 'Pedidos', icono: 'pedidos' },
  { etiqueta: 'Rutas', icono: 'rutas' },
  { etiqueta: 'Cobros', icono: 'cobros' },
  { etiqueta: 'Reportes', icono: 'reportes' },
  { etiqueta: 'Usuarios', icono: 'usuarios', ruta: '/usuarios' },
  { etiqueta: 'Agentes IA', icono: 'agentes' },
];

function Icono({ nombre }) {
  return (
    <svg className="barra__icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONOS[nombre]} />
    </svg>
  );
}

export default function BarraLateral({ id, abierta, onNavegar }) {
  const { totales } = useAlertasInventario();
  const alertas = totalAlertas(totales);
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
                    <Icono nombre={s.icono} />
                    <span className="barra__texto">{s.etiqueta}</span>
                    {s.contador && alertas > 0 && (
                      <>
                        <span className="barra__contador" aria-hidden="true">
                          {alertas}
                        </span>
                        <span className="solo-lectores">{textoContador(alertas)}</span>
                      </>
                    )}
                  </NavLink>
                ) : (
                  <span className="barra__item barra__item--deshabilitado" aria-disabled="true" role="link">
                    <Icono nombre={s.icono} />
                    <span className="barra__texto">{s.etiqueta}</span>
                    <span className="barra__pronto">Próximamente</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <p className="barra__pie">Panel de administración</p>
      </aside>
      {abierta && <div className="barra__velo" onClick={onNavegar} aria-hidden="true" />}
    </>
  );
}
