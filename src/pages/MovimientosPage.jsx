import { useCallback, useEffect, useState } from 'react';
import { listarMovimientos } from '../services/api/inventario.js';
import { listarProductos } from '../services/api/productos.js';
import { mensajeError } from '../utils/mensajesError.js';
import { useParametrosUrl } from '../hooks/useParametrosUrl.js';
import Boton from '../components/ui/Boton.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import Paginacion from '../components/ui/Paginacion.jsx';
import SubnavInventario from '../components/inventario/SubnavInventario.jsx';
import FiltrosMovimientos from '../components/inventario/FiltrosMovimientos.jsx';
import TablaMovimientos from '../components/inventario/TablaMovimientos.jsx';

const CLAVES = ['producto_id', 'tipo', 'motivo', 'desde', 'hasta', 'pagina'];
const LIMITE = 50;

export default function MovimientosPage() {
  const { valores, cambiar, limpiar } = useParametrosUrl(CLAVES);
  const [productos, setProductos] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    document.title = 'Movimientos de inventario | DistriGO';
  }, []);

  useEffect(() => {
    const control = new AbortController();
    listarProductos({}, { signal: control.signal })
      .then((r) => setProductos(Array.isArray(r) ? r : []))
      .catch(() => {});
    return () => control.abort();
  }, []);

  const { producto_id: productoId, tipo, motivo, desde, hasta, pagina } = valores;
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  const errorRango = rangoInvalido ? 'La fecha "Desde" no puede ser posterior a "Hasta".' : undefined;
  const paginaActual = /^[1-9]\d{0,6}$/.test(pagina) ? Number(pagina) : 1;

  useEffect(() => {
    if (rangoInvalido) {
      setCargando(false);
      return undefined;
    }
    const control = new AbortController();
    setCargando(true);
    setError('');
    listarMovimientos(
      { producto_id: productoId, tipo, motivo, desde, hasta, pagina: paginaActual, limite: LIMITE },
      { signal: control.signal },
    )
      .then((r) => {
        setResultado(r);
        setCargando(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(mensajeError(e));
        setCargando(false);
      });
    return () => control.abort();
  }, [productoId, tipo, motivo, desde, hasta, paginaActual, rangoInvalido, recarga]);

  const recargar = useCallback(() => setRecarga((n) => n + 1), []);
  const limpiarFiltros = useCallback(() => limpiar(CLAVES), [limpiar]);

  const total = resultado?.total ?? 0;

  return (
    <>
      <SubnavInventario />
      <div className="pagina__encabezado">
        <p>Historial de entradas, salidas y ajustes de todo el inventario.</p>
      </div>

      <FiltrosMovimientos
        filtros={valores}
        productos={productos}
        errorRango={errorRango}
        onCambiar={cambiar}
        onLimpiar={limpiarFiltros}
      />

      {error ? (
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{error}</Alerta>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      ) : rangoInvalido ? (
        <div className="tabla-caja">
          <p className="estado-vacio">Corrija el rango de fechas para ver los movimientos.</p>
        </div>
      ) : resultado === null ? (
        <div className="tabla-caja">
          <Cargando texto="Cargando movimientos…" />
        </div>
      ) : (
        <div className="tabla-caja">
          <p className="tabla-contador" aria-live="polite">
            {total === 1 ? '1 movimiento' : `${total} movimientos`}
          </p>
          <TablaMovimientos
            movimientos={resultado.items}
            mostrarProducto
            ocupado={cargando}
            vacioTexto="No hay movimientos que coincidan con los filtros."
          />
          <Paginacion
            pagina={resultado.pagina}
            total={resultado.total}
            limite={resultado.limite}
            ocupado={cargando}
            onCambiar={(n) => cambiar({ pagina: n > 1 ? String(n) : '' })}
          />
        </div>
      )}
    </>
  );
}
