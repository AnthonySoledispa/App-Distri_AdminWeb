import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAlertasInventario } from '../context/useAlertasInventario.js';
import { listarCategorias } from '../services/api/categorias.js';
import { listarUnidades } from '../services/api/unidades.js';
import { listarMovimientos } from '../services/api/inventario.js';
import { listarLotes, obtenerProducto } from '../services/api/productos.js';
import { formatearCantidad, formatearMoneda } from '../utils/formato.js';
import { mensajeError, MENSAJES } from '../utils/mensajesError.js';
import { etiquetaEstado } from '../utils/validacionesUsuario.js';
import { useAviso } from '../hooks/useAviso.js';
import Boton from '../components/ui/Boton.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import Insignia from '../components/ui/Insignia.jsx';
import CampoCasilla from '../components/ui/CampoCasilla.jsx';
import Paginacion from '../components/ui/Paginacion.jsx';
import SubnavInventario from '../components/inventario/SubnavInventario.jsx';
import TablaLotes from '../components/inventario/TablaLotes.jsx';
import TablaMovimientos from '../components/inventario/TablaMovimientos.jsx';
import FormularioProducto from '../components/inventario/FormularioProducto.jsx';
import FormularioEntrada from '../components/inventario/FormularioEntrada.jsx';
import FormularioAjuste from '../components/inventario/FormularioAjuste.jsx';

const LIMITE = 50;

export default function ProductoDetallePage() {
  const { id } = useParams();
  const idValido = /^[1-9]\d{0,9}$/.test(id);
  const { recargarAlertas } = useAlertasInventario();
  const { aviso, mostrarAviso } = useAviso();

  const [producto, setProducto] = useState(null);
  const [noExiste, setNoExiste] = useState(!idValido);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  const [lotes, setLotes] = useState([]);
  const [conStock, setConStock] = useState(true);
  const [errorLotes, setErrorLotes] = useState('');

  const [movimientos, setMovimientos] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [cargandoMov, setCargandoMov] = useState(true);
  const [errorMov, setErrorMov] = useState('');

  const [modal, setModal] = useState(null); // { tipo: 'entrada' | 'ajuste' | 'editar', categorias?, unidades? }
  const [abriendoEdicion, setAbriendoEdicion] = useState(false);

  useEffect(() => {
    document.title = 'Producto | DistriGO';
  }, []);

  const recargar = useCallback(() => setRecarga((n) => n + 1), []);

  // Ficha
  useEffect(() => {
    if (!idValido) {
      setNoExiste(true);
      return undefined;
    }
    const control = new AbortController();
    setError('');
    obtenerProducto(id, { signal: control.signal })
      .then((p) => {
        setProducto(p);
        setNoExiste(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        if (e.codigo === 'PRODUCTO_NO_ENCONTRADO' || e.estado === 404) setNoExiste(true);
        else setError(mensajeError(e));
      });
    return () => control.abort();
  }, [id, idValido, recarga]);

  // Lotes (solo si la categoría los controla)
  const controlaLotes = producto?.controla_lotes;
  useEffect(() => {
    if (!controlaLotes) return undefined;
    const control = new AbortController();
    setErrorLotes('');
    listarLotes(id, { con_stock: conStock ? 'true' : undefined }, { signal: control.signal })
      .then((r) => setLotes(Array.isArray(r) ? r : []))
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setErrorLotes(mensajeError(e));
      });
    return () => control.abort();
  }, [id, controlaLotes, conStock, recarga]);

  // Historial
  useEffect(() => {
    if (!idValido) return undefined;
    const control = new AbortController();
    setCargandoMov(true);
    setErrorMov('');
    listarMovimientos({ producto_id: id, pagina, limite: LIMITE }, { signal: control.signal })
      .then((r) => {
        setMovimientos(r);
        setCargandoMov(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setErrorMov(mensajeError(e));
        setCargandoMov(false);
      });
    return () => control.abort();
  }, [id, idValido, pagina, recarga]);

  function refrescarTodo() {
    recargar();
    recargarAlertas();
  }

  async function abrirEdicion() {
    setAbriendoEdicion(true);
    try {
      const [categorias, unidades] = await Promise.all([listarCategorias(), listarUnidades()]);
      setModal({ tipo: 'editar', categorias, unidades });
    } catch (e) {
      mostrarAviso(mensajeError(e), 'error');
    } finally {
      setAbriendoEdicion(false);
    }
  }

  function alRegistrar(texto) {
    return ({ producto: p }) => {
      setModal(null);
      mostrarAviso(`${texto} Stock: ${formatearCantidad(p.stock_vendible, p.unidad_abreviatura)}.`);
      setPagina(1);
      refrescarTodo();
    };
  }

  function alNoExistir(texto) {
    setModal(null);
    mostrarAviso(texto, 'error');
    setNoExiste(true);
    recargarAlertas();
  }

  if (noExiste) {
    return (
      <>
        <SubnavInventario />
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{MENSAJES.PRODUCTO_NO_ENCONTRADO}</Alerta>
          <Link to="/productos" className="boton boton--secundario">
            Volver a productos
          </Link>
        </div>
      </>
    );
  }

  if (error && !producto) {
    return (
      <>
        <SubnavInventario />
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{error}</Alerta>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      </>
    );
  }

  if (!producto) {
    return (
      <>
        <SubnavInventario />
        <div className="tabla-caja">
          <Cargando texto="Cargando producto…" />
        </div>
      </>
    );
  }

  const p = producto;
  const activo = p.estado === 'activo';
  const abrev = p.unidad_abreviatura;

  return (
    <>
      <SubnavInventario />
      <div className="ficha-producto__cabecera">
        <div className="ficha-producto__titulo">
          <h2>{p.nombre}</h2>
          <Insignia variante={activo ? 'activo' : 'inactivo'}>{etiquetaEstado(p.estado)}</Insignia>
          {p.stock_bajo && <Insignia variante="stock-bajo">Stock bajo</Insignia>}
        </div>
        <div className="pagina__acciones">
          {activo && (
            <Boton variante="secundario" onClick={() => setModal({ tipo: 'entrada' })}>
              Registrar entrada
            </Boton>
          )}
          <Boton variante="secundario" onClick={() => setModal({ tipo: 'ajuste' })}>
            Registrar ajuste
          </Boton>
          <Boton onClick={abrirEdicion} cargando={abriendoEdicion} textoCargando="Abriendo…">
            Editar
          </Boton>
        </div>
      </div>

      <section className="ficha-producto" aria-label="Datos del producto">
        <dl className="ficha-producto__datos">
          <div>
            <dt>SKU</dt>
            <dd>{p.sku || 'Sin SKU'}</dd>
          </div>
          {p.descripcion && (
            <div>
              <dt>Descripción</dt>
              <dd>{p.descripcion}</dd>
            </div>
          )}
          <div>
            <dt>Categoría</dt>
            <dd>{p.categoria_nombre}</dd>
          </div>
          <div>
            <dt>Unidad</dt>
            <dd>
              {p.unidad_nombre} ({abrev})
            </dd>
          </div>
          <div>
            <dt>Precio de venta</dt>
            <dd>{formatearMoneda(p.precio_venta)}</dd>
          </div>
          <div>
            <dt>Stock mínimo</dt>
            <dd>{formatearCantidad(p.stock_minimo, abrev)}</dd>
          </div>
          <div>
            <dt>Control de lotes</dt>
            <dd>{p.controla_lotes ? 'Sí' : 'No'}</dd>
          </div>
        </dl>
        <div className="cifra-stock">
          <div className="cifra-stock__etiqueta">Stock vendible</div>
          <div className="cifra-stock__valor">{formatearCantidad(p.stock_vendible, abrev)}</div>
          {Number(p.stock_vencido) > 0 && (
            <p className="cifra-stock__nota">
              Vencido: {formatearCantidad(p.stock_vencido, abrev)} · Físico: {formatearCantidad(p.stock_actual, abrev)}
              <br />
              <Link to="/productos/alertas">Dar de baja en Alertas</Link>
            </p>
          )}
        </div>
      </section>

      {p.controla_lotes && (
        <section className="seccion" aria-labelledby="titulo-lotes">
          <div className="seccion__titulo">
            <h3 id="titulo-lotes">Lotes</h3>
            <CampoCasilla
              etiqueta="Mostrar lotes agotados"
              checked={!conStock}
              onChange={(e) => setConStock(!e.target.checked)}
            />
          </div>
          {errorLotes && <Alerta tipo="error">{errorLotes}</Alerta>}
          <div className="tabla-caja">
            <TablaLotes lotes={lotes} abreviatura={abrev} />
          </div>
        </section>
      )}

      <section className="seccion" aria-labelledby="titulo-historial">
        <div className="seccion__titulo">
          <h3 id="titulo-historial">Historial de movimientos</h3>
        </div>
        <div className="tabla-caja">
          {errorMov ? (
            <div className="estado-error">
              <Alerta tipo="error">{errorMov}</Alerta>
              <Boton variante="secundario" onClick={recargar}>
                Reintentar
              </Boton>
            </div>
          ) : movimientos === null ? (
            <Cargando texto="Cargando movimientos…" />
          ) : (
            <>
              <TablaMovimientos
                movimientos={movimientos.items}
                ocupado={cargandoMov}
                vacioTexto="Este producto aún no tiene movimientos."
              />
              <Paginacion pagina={movimientos.pagina} total={movimientos.total} limite={movimientos.limite} onCambiar={setPagina} ocupado={cargandoMov} />
            </>
          )}
        </div>
      </section>

      {aviso && (
        <Alerta tipo={aviso.tipo} className="aviso-flotante">
          {aviso.texto}
        </Alerta>
      )}

      {modal?.tipo === 'entrada' && (
        <FormularioEntrada producto={p} onRegistrado={alRegistrar('Entrada registrada.')} onCerrar={() => setModal(null)} onNoExiste={alNoExistir} />
      )}
      {modal?.tipo === 'ajuste' && (
        <FormularioAjuste producto={p} onRegistrado={alRegistrar('Ajuste registrado.')} onCerrar={() => setModal(null)} onNoExiste={alNoExistir} />
      )}
      {modal?.tipo === 'editar' && (
        <FormularioProducto
          producto={p}
          categorias={modal.categorias}
          unidades={modal.unidades}
          onGuardado={(m) => {
            setModal(null);
            mostrarAviso(m);
            refrescarTodo();
          }}
          onCerrar={() => setModal(null)}
          onNoExiste={alNoExistir}
        />
      )}
    </>
  );
}
