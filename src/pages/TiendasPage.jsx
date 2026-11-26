import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { listarRutas } from '../services/api/rutas.js';
import { cambiarEstadoCliente, listarClientes } from '../services/api/clientes.js';
import { formatearMoneda } from '../utils/formato.js';
import { mensajeError, MENSAJES } from '../utils/mensajesError.js';
import { useAviso } from '../hooks/useAviso.js';
import { useParametrosUrl } from '../hooks/useParametrosUrl.js';
import Boton from '../components/ui/Boton.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import DialogoConfirmacion from '../components/ui/DialogoConfirmacion.jsx';
import SubnavTiendas from '../components/clientes/SubnavTiendas.jsx';
import FiltrosTiendas from '../components/clientes/FiltrosTiendas.jsx';
import TablaTiendas from '../components/clientes/TablaTiendas.jsx';
import FormularioTienda from '../components/clientes/FormularioTienda.jsx';

const CLAVES = ['buscar', 'ruta_id', 'sin_ruta', 'estado'];

export default function TiendasPage() {
  const { valores: filtros, cambiar, limpiar } = useParametrosUrl(CLAVES);
  const { aviso, mostrarAviso } = useAviso();

  const [tiendas, setTiendas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [rutas, setRutas] = useState([]);

  const [formulario, setFormulario] = useState(null); // { tienda }
  const [confirmacion, setConfirmacion] = useState(null); // { tienda, nuevoEstado }
  const [enviando, setEnviando] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState('');

  useEffect(() => {
    document.title = 'Tiendas | DistriGO';
  }, []);

  const recargar = useCallback(() => setRecarga((n) => n + 1), []);

  // Rutas para el filtro y el formulario (si fallan, el select queda solo con "Sin ruta").
  useEffect(() => {
    const control = new AbortController();
    listarRutas({}, { signal: control.signal })
      .then((r) => setRutas(Array.isArray(r) ? r : []))
      .catch(() => {});
    return () => control.abort();
  }, [recarga]);

  const { buscar, ruta_id: rutaId, sin_ruta: sinRuta, estado } = filtros;
  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError('');
    listarClientes({ buscar, ruta_id: sinRuta === 'true' ? '' : rutaId, sin_ruta: sinRuta === 'true' ? 'true' : '', estado }, { signal: control.signal })
      .then((datos) => {
        setTiendas(Array.isArray(datos) ? datos : []);
        setCargando(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(mensajeError(e));
        setCargando(false);
      });
    return () => control.abort();
  }, [buscar, rutaId, sinRuta, estado, recarga]);

  const limpiarFiltros = useCallback(() => limpiar(CLAVES), [limpiar]);

  function alGuardar(mensaje) {
    setFormulario(null);
    mostrarAviso(mensaje);
    recargar();
  }

  function alNoExistir(texto) {
    setFormulario(null);
    setConfirmacion(null);
    mostrarAviso(texto, 'error');
    recargar();
  }

  function pedirEstado(tienda) {
    setErrorConfirmacion('');
    setConfirmacion({ tienda, nuevoEstado: tienda.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  async function confirmar() {
    const { tienda, nuevoEstado } = confirmacion;
    setEnviando(true);
    setErrorConfirmacion('');
    try {
      await cambiarEstadoCliente(tienda.id, nuevoEstado);
      setConfirmacion(null);
      mostrarAviso(nuevoEstado === 'activo' ? 'Tienda activada' : 'Tienda desactivada');
      recargar();
    } catch (e) {
      if (e.estado === 404) alNoExistir(MENSAJES.CLIENTE_NO_ENCONTRADO);
      else setErrorConfirmacion(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  const hayFiltros = Boolean(buscar || rutaId || sinRuta || estado);
  const vacioTexto = hayFiltros ? 'No hay tiendas que coincidan con los filtros.' : 'Aún no hay tiendas. Cree la primera.';
  const desactivando = confirmacion?.nuevoEstado === 'inactivo';
  let mensajeConfirmacion = '';
  if (confirmacion) {
    const t = confirmacion.tienda;
    mensajeConfirmacion = desactivando
      ? `¿Desactivar la tienda ${t.nombre}? No podrá recibir pedidos nuevos.${
          Number(t.saldo_pendiente) > 0
            ? ` Tiene un saldo pendiente de ${formatearMoneda(t.saldo_pendiente)} que seguirá por cobrar.`
            : ''
        }`
      : `¿Activar la tienda ${t.nombre}? Podrá volver a recibir pedidos.`;
  }

  return (
    <>
      <SubnavTiendas />
      <div className="pagina__encabezado">
        <p>Administre las tiendas clientes: contacto, ruta de reparto y crédito.</p>
        <div className="pagina__acciones">
          <Boton onClick={() => setFormulario({ tienda: null })}>Nueva tienda</Boton>
        </div>
      </div>

      <FiltrosTiendas filtros={filtros} rutas={rutas} onCambiar={cambiar} onLimpiar={limpiarFiltros} />

      {error ? (
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{error}</Alerta>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      ) : tiendas === null ? (
        <div className="tabla-caja">
          <Cargando texto="Cargando tiendas…" />
        </div>
      ) : (
        <TablaTiendas
          tiendas={tiendas}
          ocupado={cargando}
          vacioTexto={
            hayFiltros || rutas.length > 0 ? (
              vacioTexto
            ) : (
              <>
                {vacioTexto} Si quiere agrupar las tiendas por zona, cree antes una ruta en <Link to="/tiendas/rutas">Rutas</Link>.
              </>
            )
          }
          onEditar={(t) => setFormulario({ tienda: t })}
          onCambiarEstado={pedirEstado}
        />
      )}

      {aviso && (
        <Alerta tipo={aviso.tipo} className="aviso-flotante">
          {aviso.texto}
        </Alerta>
      )}

      {formulario && (
        <FormularioTienda
          tienda={formulario.tienda}
          rutas={rutas}
          onGuardado={alGuardar}
          onCerrar={() => setFormulario(null)}
          onNoExiste={alNoExistir}
        />
      )}

      {confirmacion && (
        <DialogoConfirmacion
          titulo={desactivando ? 'Desactivar tienda' : 'Activar tienda'}
          mensaje={mensajeConfirmacion}
          textoConfirmar={desactivando ? 'Desactivar' : 'Activar'}
          peligro={desactivando}
          enviando={enviando}
          error={errorConfirmacion}
          onConfirmar={confirmar}
          onCancelar={() => setConfirmacion(null)}
        />
      )}
    </>
  );
}
