import { useCallback, useEffect, useState } from 'react';
import { cambiarEstadoRuta, listarRutas } from '../services/api/rutas.js';
import { mensajeError, MENSAJES } from '../utils/mensajesError.js';
import { ESTADOS } from '../utils/validacionesUsuario.js';
import { useAviso } from '../hooks/useAviso.js';
import { useParametrosUrl } from '../hooks/useParametrosUrl.js';
import Boton from '../components/ui/Boton.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import CampoSelect from '../components/ui/CampoSelect.jsx';
import DialogoConfirmacion from '../components/ui/DialogoConfirmacion.jsx';
import SubnavTiendas from '../components/clientes/SubnavTiendas.jsx';
import TablaRutas from '../components/clientes/TablaRutas.jsx';
import FormularioRuta from '../components/clientes/FormularioRuta.jsx';

const CLAVES = ['estado'];
const FILTRO_ESTADO = [{ valor: '', etiqueta: 'Todos' }, ...ESTADOS];

export default function RutasPage() {
  const { valores, cambiar } = useParametrosUrl(CLAVES);
  const { aviso, mostrarAviso } = useAviso();
  const estado = valores.estado;

  const [rutas, setRutas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  const [formulario, setFormulario] = useState(null); // { ruta }
  const [confirmacion, setConfirmacion] = useState(null); // { ruta, nuevoEstado }
  const [enviando, setEnviando] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState('');

  useEffect(() => {
    document.title = 'Rutas de tiendas | DistriGO';
  }, []);

  const recargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError('');
    listarRutas({ estado }, { signal: control.signal })
      .then((datos) => {
        setRutas(Array.isArray(datos) ? datos : []);
        setCargando(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(mensajeError(e));
        setCargando(false);
      });
    return () => control.abort();
  }, [estado, recarga]);

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

  function pedirEstado(ruta) {
    setErrorConfirmacion('');
    setConfirmacion({ ruta, nuevoEstado: ruta.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  async function confirmar() {
    const { ruta, nuevoEstado } = confirmacion;
    setEnviando(true);
    setErrorConfirmacion('');
    try {
      await cambiarEstadoRuta(ruta.id, nuevoEstado);
      setConfirmacion(null);
      mostrarAviso(nuevoEstado === 'activo' ? 'Ruta activada' : 'Ruta desactivada');
      recargar();
    } catch (e) {
      if (e.estado === 404) alNoExistir(MENSAJES.RUTA_NO_ENCONTRADA);
      else setErrorConfirmacion(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  const desactivando = confirmacion?.nuevoEstado === 'inactivo';

  return (
    <>
      <SubnavTiendas />
      <div className="pagina__encabezado">
        <p>
          Agrupe las tiendas por zona de reparto. Los días de visita y los repartidores se asignarán en el módulo de
          Despachos y rutas.
        </p>
        <div className="pagina__acciones">
          <CampoSelect
            className="filtros__select"
            etiqueta="Estado de rutas"
            name="estado"
            opciones={FILTRO_ESTADO}
            value={estado}
            onChange={(e) => cambiar({ estado: e.target.value })}
          />
          <Boton onClick={() => setFormulario({ ruta: null })}>Nueva ruta</Boton>
        </div>
      </div>

      {error ? (
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{error}</Alerta>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      ) : rutas === null ? (
        <div className="tabla-caja">
          <Cargando texto="Cargando rutas…" />
        </div>
      ) : (
        <div className="tabla-caja">
          <TablaRutas
            rutas={rutas}
            ocupado={cargando}
            vacioTexto={estado ? 'No hay rutas con ese estado.' : 'Aún no hay rutas. Cree la primera.'}
            onEditar={(r) => setFormulario({ ruta: r })}
            onCambiarEstado={pedirEstado}
          />
        </div>
      )}

      {aviso && (
        <Alerta tipo={aviso.tipo} className="aviso-flotante">
          {aviso.texto}
        </Alerta>
      )}

      {formulario && (
        <FormularioRuta
          ruta={formulario.ruta}
          onGuardado={alGuardar}
          onCerrar={() => setFormulario(null)}
          onNoExiste={alNoExistir}
        />
      )}

      {confirmacion && (
        <DialogoConfirmacion
          titulo={desactivando ? 'Desactivar ruta' : 'Activar ruta'}
          mensaje={
            desactivando
              ? `¿Desactivar la ruta ${confirmacion.ruta.nombre}? No podrá asignarse a tiendas nuevas.`
              : `¿Activar la ruta ${confirmacion.ruta.nombre}? Podrá volver a asignarse a tiendas.`
          }
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
