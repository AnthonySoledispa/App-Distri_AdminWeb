import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { listarRutas } from '../services/api/rutas.js';
import { listarCompras, obtenerCliente } from '../services/api/clientes.js';
import { formatearTelefono } from '../utils/formato.js';
import { mensajeError, MENSAJES } from '../utils/mensajesError.js';
import { etiquetaEstado } from '../utils/validacionesUsuario.js';
import { useAviso } from '../hooks/useAviso.js';
import { useParametrosUrl } from '../hooks/useParametrosUrl.js';
import Boton from '../components/ui/Boton.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import Insignia from '../components/ui/Insignia.jsx';
import CampoTexto from '../components/ui/CampoTexto.jsx';
import Paginacion from '../components/ui/Paginacion.jsx';
import SubnavTiendas from '../components/clientes/SubnavTiendas.jsx';
import ResumenCredito from '../components/clientes/ResumenCredito.jsx';
import TablaCompras from '../components/clientes/TablaCompras.jsx';
import FormularioTienda from '../components/clientes/FormularioTienda.jsx';
import { textoRuta } from '../components/clientes/TablaTiendas.jsx';

const LIMITE = 20;
const CLAVES = ['desde', 'hasta'];

export default function TiendaDetallePage() {
  const { id } = useParams();
  const idValido = /^[1-9]\d{0,9}$/.test(id);
  const { aviso, mostrarAviso } = useAviso();
  const { valores: filtros, cambiar, limpiar } = useParametrosUrl(CLAVES);
  const { desde, hasta } = filtros;
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  const [tienda, setTienda] = useState(null);
  const [noExiste, setNoExiste] = useState(!idValido);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  const [compras, setCompras] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [cargandoCompras, setCargandoCompras] = useState(true);
  const [errorCompras, setErrorCompras] = useState('');

  const [modal, setModal] = useState(null); // { rutas }
  const [abriendoEdicion, setAbriendoEdicion] = useState(false);

  useEffect(() => {
    document.title = 'Tienda | DistriGO';
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
    obtenerCliente(id, { signal: control.signal })
      .then((t) => {
        setTienda(t);
        setNoExiste(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        if (e.codigo === 'CLIENTE_NO_ENCONTRADO' || e.estado === 404) setNoExiste(true);
        else setError(mensajeError(e));
      });
    return () => control.abort();
  }, [id, idValido, recarga]);

  // Historial de compras
  useEffect(() => {
    if (!idValido || rangoInvalido) return undefined;
    const control = new AbortController();
    setCargandoCompras(true);
    setErrorCompras('');
    listarCompras(id, { desde, hasta, pagina, limite: LIMITE }, { signal: control.signal })
      .then((r) => {
        setCompras(r);
        setCargandoCompras(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setErrorCompras(mensajeError(e));
        setCargandoCompras(false);
      });
    return () => control.abort();
  }, [id, idValido, desde, hasta, pagina, rangoInvalido, recarga]);

  function cambiarFiltro(cambios) {
    setPagina(1);
    cambiar(cambios);
  }

  async function abrirEdicion() {
    setAbriendoEdicion(true);
    try {
      const rutas = await listarRutas();
      setModal({ rutas: Array.isArray(rutas) ? rutas : [] });
    } catch (e) {
      mostrarAviso(mensajeError(e), 'error');
    } finally {
      setAbriendoEdicion(false);
    }
  }

  function alNoExistir(texto) {
    setModal(null);
    mostrarAviso(texto, 'error');
    setNoExiste(true);
  }

  if (noExiste) {
    return (
      <>
        <SubnavTiendas />
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{MENSAJES.CLIENTE_NO_ENCONTRADO}</Alerta>
          <Link to="/tiendas" className="boton boton--secundario">
            Volver a tiendas
          </Link>
        </div>
      </>
    );
  }

  if (error && !tienda) {
    return (
      <>
        <SubnavTiendas />
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{error}</Alerta>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      </>
    );
  }

  if (!tienda) {
    return (
      <>
        <SubnavTiendas />
        <div className="tabla-caja">
          <Cargando texto="Cargando tienda…" />
        </div>
      </>
    );
  }

  const t = tienda;
  const activo = t.estado === 'activo';
  const hayFiltros = Boolean(desde || hasta);

  return (
    <>
      <SubnavTiendas />
      <div className="ficha-producto__cabecera">
        <div className="ficha-producto__titulo">
          <h2>{t.nombre}</h2>
          <Insignia variante={activo ? 'activo' : 'inactivo'}>{etiquetaEstado(t.estado)}</Insignia>
          {t.credito_excedido && <Insignia variante="credito-excedido">Crédito excedido</Insignia>}
        </div>
        <div className="pagina__acciones">
          <Link to="/tiendas" className="boton boton--secundario">
            Volver a tiendas
          </Link>
          <Boton onClick={abrirEdicion} cargando={abriendoEdicion} textoCargando="Abriendo…">
            Editar
          </Boton>
        </div>
      </div>

      <div className="ficha-tienda">
        <section className="ficha-producto ficha-tienda__datos" aria-label="Datos de la tienda">
          <dl className="ficha-producto__datos">
            <div>
              <dt>Persona de contacto</dt>
              <dd>{t.contacto}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{formatearTelefono(t.telefono)}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{t.direccion}</dd>
            </div>
            <div>
              <dt>Ruta</dt>
              <dd>{textoRuta(t)}</dd>
            </div>
          </dl>
        </section>
        <ResumenCredito tienda={t} />
      </div>

      <section className="seccion" aria-labelledby="titulo-compras">
        <div className="seccion__titulo">
          <h3 id="titulo-compras">Historial de compras</h3>
        </div>
        <form className="filtros" aria-label="Filtros del historial" onSubmit={(e) => e.preventDefault()}>
          <CampoTexto
            etiqueta="Desde"
            type="date"
            name="desde"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => cambiarFiltro({ desde: e.target.value })}
          />
          <CampoTexto
            etiqueta="Hasta"
            type="date"
            name="hasta"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => cambiarFiltro({ hasta: e.target.value })}
          />
          <Boton
            variante="secundario"
            onClick={() => {
              setPagina(1);
              limpiar(CLAVES);
            }}
            disabled={!hayFiltros}
          >
            Limpiar filtros
          </Boton>
        </form>
        {rangoInvalido && <Alerta tipo="error">La fecha &quot;Desde&quot; no puede ser posterior a &quot;Hasta&quot;.</Alerta>}
        <div className="tabla-caja">
          {errorCompras ? (
            <div className="estado-error">
              <Alerta tipo="error">{errorCompras}</Alerta>
              <Boton variante="secundario" onClick={recargar}>
                Reintentar
              </Boton>
            </div>
          ) : compras === null ? (
            <Cargando texto="Cargando compras…" />
          ) : (
            <>
              <TablaCompras
                compras={compras.items}
                ocupado={cargandoCompras}
                vacioTexto={
                  hayFiltros ? 'No hay compras en ese período.' : 'Esta tienda aún no tiene compras registradas.'
                }
              />
              <Paginacion
                pagina={compras.pagina}
                total={compras.total}
                limite={compras.limite}
                onCambiar={setPagina}
                ocupado={cargandoCompras}
              />
            </>
          )}
        </div>
      </section>

      {aviso && (
        <Alerta tipo={aviso.tipo} className="aviso-flotante">
          {aviso.texto}
        </Alerta>
      )}

      {modal && (
        <FormularioTienda
          tienda={t}
          rutas={modal.rutas}
          onGuardado={(m) => {
            setModal(null);
            mostrarAviso(m);
            recargar();
          }}
          onCerrar={() => setModal(null)}
          onNoExiste={alNoExistir}
        />
      )}
    </>
  );
}
