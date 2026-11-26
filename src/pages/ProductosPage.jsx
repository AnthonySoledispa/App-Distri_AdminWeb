import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAlertasInventario } from '../context/useAlertasInventario.js';
import { listarCategorias } from '../services/api/categorias.js';
import { listarUnidades } from '../services/api/unidades.js';
import { cambiarEstadoProducto, eliminarProducto, listarProductos } from '../services/api/productos.js';
import { formatearCantidad } from '../utils/formato.js';
import { mensajeError, MENSAJES } from '../utils/mensajesError.js';
import { useAviso } from '../hooks/useAviso.js';
import { useParametrosUrl } from '../hooks/useParametrosUrl.js';
import Boton from '../components/ui/Boton.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import DialogoConfirmacion from '../components/ui/DialogoConfirmacion.jsx';
import SubnavInventario from '../components/inventario/SubnavInventario.jsx';
import FiltrosProductos from '../components/inventario/FiltrosProductos.jsx';
import TablaProductos from '../components/inventario/TablaProductos.jsx';
import FormularioProducto from '../components/inventario/FormularioProducto.jsx';
import FormularioEntrada from '../components/inventario/FormularioEntrada.jsx';

const CLAVES = ['buscar', 'categoria_id', 'estado', 'stock_bajo'];

export default function ProductosPage() {
  const { totales, recargarAlertas } = useAlertasInventario();
  const { valores: filtros, cambiar, limpiar } = useParametrosUrl(CLAVES);
  const { aviso, mostrarAviso } = useAviso();

  const [productos, setProductos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [formulario, setFormulario] = useState(null); // { producto }
  const [entrada, setEntrada] = useState(null); // { producto, productos }
  const [abriendoEntrada, setAbriendoEntrada] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null); // { tipo: 'estado' | 'eliminar', producto, nuevoEstado }
  const [enviando, setEnviando] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState('');

  useEffect(() => {
    document.title = 'Productos | DistriGO';
  }, []);

  const recargar = useCallback(() => setRecarga((n) => n + 1), []);

  // Categorías y unidades para filtros y formularios (se cargan una vez; si fallan, el formulario lo avisa vacío).
  useEffect(() => {
    const control = new AbortController();
    Promise.all([listarCategorias({}, { signal: control.signal }), listarUnidades({}, { signal: control.signal })])
      .then(([c, u]) => {
        setCategorias(Array.isArray(c) ? c : []);
        setUnidades(Array.isArray(u) ? u : []);
      })
      .catch(() => {});
    return () => control.abort();
  }, [recarga]);

  const { buscar, categoria_id: categoriaId, estado, stock_bajo: stockBajo } = filtros;
  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError('');
    listarProductos(
      { buscar, categoria_id: categoriaId, estado, stock_bajo: stockBajo },
      { signal: control.signal },
    )
      .then((datos) => {
        setProductos(Array.isArray(datos) ? datos : []);
        setCargando(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(mensajeError(e));
        setCargando(false);
      });
    return () => control.abort();
  }, [buscar, categoriaId, estado, stockBajo, recarga]);

  const limpiarFiltros = useCallback(() => limpiar(CLAVES), [limpiar]);

  function refrescarTodo() {
    recargar();
    recargarAlertas();
  }

  function alGuardar(mensaje) {
    setFormulario(null);
    mostrarAviso(mensaje);
    refrescarTodo();
  }

  function alNoExistir(texto) {
    setFormulario(null);
    setEntrada(null);
    setConfirmacion(null);
    mostrarAviso(texto, 'error');
    refrescarTodo();
  }

  async function abrirEntradaGeneral() {
    setAbriendoEntrada(true);
    try {
      const todos = await listarProductos({ estado: 'activo' });
      setEntrada({ producto: null, productos: Array.isArray(todos) ? todos : [] });
    } catch (e) {
      mostrarAviso(mensajeError(e), 'error');
    } finally {
      setAbriendoEntrada(false);
    }
  }

  function alRegistrarEntrada({ producto }) {
    setEntrada(null);
    mostrarAviso(`Entrada registrada. Stock: ${formatearCantidad(producto.stock_vendible, producto.unidad_abreviatura)}.`);
    refrescarTodo();
  }

  function pedirEstado(producto) {
    setErrorConfirmacion('');
    setConfirmacion({ tipo: 'estado', producto, nuevoEstado: producto.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  function pedirEliminar(producto) {
    setErrorConfirmacion('');
    setConfirmacion({ tipo: 'eliminar', producto });
  }

  async function confirmar() {
    const { tipo, producto, nuevoEstado } = confirmacion;
    setEnviando(true);
    setErrorConfirmacion('');
    try {
      if (tipo === 'eliminar') {
        await eliminarProducto(producto.id);
        mostrarAviso('Producto eliminado');
      } else {
        await cambiarEstadoProducto(producto.id, nuevoEstado);
        mostrarAviso(nuevoEstado === 'activo' ? 'Producto activado' : 'Producto desactivado');
      }
      setConfirmacion(null);
      refrescarTodo();
    } catch (e) {
      if (e.codigo === 'PRODUCTO_CON_MOVIMIENTOS') {
        setConfirmacion(null);
        mostrarAviso(MENSAJES.PRODUCTO_CON_MOVIMIENTOS, 'error');
        refrescarTodo();
      } else if (e.estado === 404) {
        alNoExistir(MENSAJES.PRODUCTO_NO_ENCONTRADO);
      } else {
        setErrorConfirmacion(mensajeError(e));
      }
    } finally {
      setEnviando(false);
    }
  }

  const hayFiltros = Boolean(buscar || categoriaId || estado || stockBajo);
  const sinCatalogo = !categorias.some((c) => c.estado === 'activo') || !unidades.some((u) => u.estado === 'activo');
  const vacioTexto = hayFiltros ? (
    'No hay productos que coincidan con los filtros.'
  ) : (
    <>
      Aún no hay productos. Cree el primero.
      {sinCatalogo && (
        <>
          {' '}
          Antes necesita al menos una categoría y una unidad activas: <Link to="/productos/categorias">Categorías y unidades</Link>.
        </>
      )}
    </>
  );

  const bajos = totales?.stock_bajo ?? 0;
  const desactivando = confirmacion?.tipo === 'estado' && confirmacion.nuevoEstado === 'inactivo';
  let mensajeConfirmacion = '';
  if (confirmacion?.tipo === 'eliminar') {
    mensajeConfirmacion = `¿Eliminar ${confirmacion.producto.nombre}? Esta acción no se puede deshacer.`;
  } else if (confirmacion) {
    const p = confirmacion.producto;
    mensajeConfirmacion = desactivando
      ? `¿Desactivar ${p.nombre}? No podrá recibir entradas ni usarse en pedidos nuevos.${
          Number(p.stock_actual) > 0 ? ` Aún tiene ${formatearCantidad(p.stock_actual, p.unidad_abreviatura)} en bodega.` : ''
        }`
      : `¿Activar ${p.nombre}? Podrá volver a recibir entradas.`;
  }

  return (
    <>
      <SubnavInventario />
      <div className="pagina__encabezado">
        <p>Administre el catálogo de productos y consulte su stock.</p>
        <div className="pagina__acciones">
          <Boton variante="secundario" onClick={abrirEntradaGeneral} cargando={abriendoEntrada} textoCargando="Abriendo…">
            Registrar entrada
          </Boton>
          <Boton onClick={() => setFormulario({ producto: null })}>Nuevo producto</Boton>
        </div>
      </div>

      {bajos > 0 && (
        <Alerta tipo="aviso">
          {bajos === 1 ? '1 producto' : `${bajos} productos`} con stock igual o menor al mínimo.{' '}
          <Link to="/productos/alertas">Ver alertas</Link>
        </Alerta>
      )}

      <FiltrosProductos filtros={filtros} categorias={categorias} onCambiar={cambiar} onLimpiar={limpiarFiltros} />

      {error ? (
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{error}</Alerta>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      ) : productos === null ? (
        <div className="tabla-caja">
          <Cargando texto="Cargando productos…" />
        </div>
      ) : (
        <TablaProductos
          productos={productos}
          ocupado={cargando}
          vacioTexto={vacioTexto}
          onEntrada={(p) => setEntrada({ producto: p, productos: [] })}
          onEditar={(p) => setFormulario({ producto: p })}
          onCambiarEstado={pedirEstado}
          onEliminar={pedirEliminar}
        />
      )}

      {aviso && (
        <Alerta tipo={aviso.tipo} className="aviso-flotante">
          {aviso.texto}
        </Alerta>
      )}

      {formulario && (
        <FormularioProducto
          producto={formulario.producto}
          categorias={categorias}
          unidades={unidades}
          onGuardado={alGuardar}
          onCerrar={() => setFormulario(null)}
          onNoExiste={alNoExistir}
        />
      )}

      {entrada && (
        <FormularioEntrada
          producto={entrada.producto}
          productos={entrada.productos}
          onRegistrado={alRegistrarEntrada}
          onCerrar={() => setEntrada(null)}
          onNoExiste={alNoExistir}
        />
      )}

      {confirmacion && (
        <DialogoConfirmacion
          titulo={
            confirmacion.tipo === 'eliminar' ? 'Eliminar producto' : desactivando ? 'Desactivar producto' : 'Activar producto'
          }
          mensaje={mensajeConfirmacion}
          textoConfirmar={confirmacion.tipo === 'eliminar' ? 'Eliminar' : desactivando ? 'Desactivar' : 'Activar'}
          peligro={confirmacion.tipo === 'eliminar' || desactivando}
          enviando={enviando}
          error={errorConfirmacion}
          onConfirmar={confirmar}
          onCancelar={() => setConfirmacion(null)}
        />
      )}
    </>
  );
}
