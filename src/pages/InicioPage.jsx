import { Link } from 'react-router';
import { useAuth } from '../context/useAuth.js';

/* Orden de desarrollo de AGENTES.md: cada módulo es una parada de la ruta. */
const MODULOS = [
  { nombre: 'Usuarios y acceso', detalle: 'Cuentas de administradores y repartidores.', ruta: '/usuarios', accion: 'Gestionar usuarios' },
  { nombre: 'Productos e inventario', detalle: 'Catálogo, categorías y stock.', ruta: '/productos', accion: 'Gestionar productos' },
  { nombre: 'Tiendas', detalle: 'Clientes, crédito y datos de contacto.', ruta: '/tiendas', accion: 'Gestionar tiendas' },
  { nombre: 'Pedidos', detalle: 'Registro y validación de stock y crédito.' },
  { nombre: 'Despachos y rutas', detalle: 'Asignación de rutas a repartidores.' },
  { nombre: 'Ventas y cobros', detalle: 'Entregas, pagos y saldos pendientes.' },
  { nombre: 'Reportes', detalle: 'Ventas, inventario y cobranza.' },
  { nombre: 'Agentes de IA', detalle: 'Sugerencias de reposición y cobro.' },
];

export default function InicioPage() {
  const { usuario } = useAuth();
  const disponibles = MODULOS.filter((m) => m.ruta).length;

  return (
    <>
      <div className="inicio__saludo">
        <h2>Bienvenido, {usuario?.nombre}</h2>
        <p>Ya puede gestionar usuarios, productos con su inventario y tiendas. Las demás secciones se activarán en este orden.</p>
      </div>

      <section className="hoja-ruta" aria-labelledby="hoja-ruta-titulo">
        <div className="hoja-ruta__cabecera">
          <h3 id="hoja-ruta-titulo">Módulos del sistema</h3>
          <p>
            {disponibles} de {MODULOS.length} disponibles
          </p>
        </div>
        <ol className="hoja-ruta__lista">
          {MODULOS.map((m, i) => {
            const activo = Boolean(m.ruta);
            return (
              <li key={m.nombre} className={`parada ${activo ? 'parada--activa' : ''}`}>
                <span className="parada__marca" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="parada__cuerpo">
                  <strong className="parada__nombre">{m.nombre}</strong>
                  <span className="parada__detalle">{m.detalle}</span>
                  {activo ? (
                    <Link to={m.ruta} className="boton boton--primario boton--pequeno parada__accion">
                      {m.accion}
                    </Link>
                  ) : (
                    <span className="parada__estado">Próximamente</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
