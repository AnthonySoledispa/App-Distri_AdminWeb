import { useCallback, useEffect, useState } from 'react';
import { listarCategorias, cambiarEstadoCategoria } from '../services/api/categorias.js';
import { listarUnidades, cambiarEstadoUnidad } from '../services/api/unidades.js';
import { mensajeError, MENSAJES } from '../utils/mensajesError.js';
import { ESTADOS } from '../utils/validacionesUsuario.js';
import { useAviso } from '../hooks/useAviso.js';
import { useParametrosUrl } from '../hooks/useParametrosUrl.js';
import Boton from '../components/ui/Boton.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import CampoSelect from '../components/ui/CampoSelect.jsx';
import DialogoConfirmacion from '../components/ui/DialogoConfirmacion.jsx';
import SubnavInventario from '../components/inventario/SubnavInventario.jsx';
import TablaCategorias from '../components/inventario/TablaCategorias.jsx';
import TablaUnidades from '../components/inventario/TablaUnidades.jsx';
import FormularioCategoria from '../components/inventario/FormularioCategoria.jsx';
import FormularioUnidad from '../components/inventario/FormularioUnidad.jsx';

const FILTRO_ESTADO = [{ valor: '', etiqueta: 'Todos' }, ...ESTADOS];

/** Hook de una lista (categorías o unidades) con su filtro de estado y recarga. */
function useLista(cargar, estado) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError('');
    cargar({ estado }, { signal: control.signal })
      .then((r) => {
        setDatos(Array.isArray(r) ? r : []);
        setCargando(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(mensajeError(e));
        setCargando(false);
      });
    return () => control.abort();
  }, [cargar, estado, recarga]);

  const recargar = useCallback(() => setRecarga((n) => n + 1), []);
  return { datos, cargando, error, recargar };
}

function CajaLista({ lista, textoCarga, children }) {
  if (lista.error) {
    return (
      <div className="tabla-caja estado-error">
        <Alerta tipo="error">{lista.error}</Alerta>
        <Boton variante="secundario" onClick={lista.recargar}>
          Reintentar
        </Boton>
      </div>
    );
  }
  if (lista.datos === null) {
    return (
      <div className="tabla-caja">
        <Cargando texto={textoCarga} />
      </div>
    );
  }
  return <div className="tabla-caja">{children}</div>;
}

export default function CategoriasUnidadesPage() {
  const { valores, cambiar } = useParametrosUrl(['cat_estado', 'uni_estado']);
  const categorias = useLista(listarCategorias, valores.cat_estado);
  const unidades = useLista(listarUnidades, valores.uni_estado);
  const { aviso, mostrarAviso } = useAviso();

  const [formCategoria, setFormCategoria] = useState(null); // { categoria }
  const [formUnidad, setFormUnidad] = useState(null); // { unidad }
  const [confirmacion, setConfirmacion] = useState(null); // { tipo, item, nuevoEstado }
  const [enviando, setEnviando] = useState(false);
  const [errorEstado, setErrorEstado] = useState('');

  useEffect(() => {
    document.title = 'Categorías y unidades | DistriGO';
  }, []);

  function pedirCambio(tipo, item) {
    setErrorEstado('');
    setConfirmacion({ tipo, item, nuevoEstado: item.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  async function confirmar() {
    const { tipo, item, nuevoEstado } = confirmacion;
    setEnviando(true);
    setErrorEstado('');
    try {
      if (tipo === 'categoria') await cambiarEstadoCategoria(item.id, nuevoEstado);
      else await cambiarEstadoUnidad(item.id, nuevoEstado);
      setConfirmacion(null);
      const sujeto = tipo === 'categoria' ? 'Categoría' : 'Unidad';
      mostrarAviso(`${sujeto} ${nuevoEstado === 'activo' ? 'activada' : 'desactivada'}`);
      (tipo === 'categoria' ? categorias : unidades).recargar();
    } catch (e) {
      if (e.estado === 404) {
        setConfirmacion(null);
        mostrarAviso(tipo === 'categoria' ? MENSAJES.CATEGORIA_NO_ENCONTRADA : MENSAJES.UNIDAD_NO_ENCONTRADA, 'error');
        (tipo === 'categoria' ? categorias : unidades).recargar();
      } else {
        setErrorEstado(mensajeError(e));
      }
    } finally {
      setEnviando(false);
    }
  }

  function alGuardarCategoria(mensaje) {
    setFormCategoria(null);
    mostrarAviso(mensaje);
    categorias.recargar();
  }
  function alGuardarUnidad(mensaje) {
    setFormUnidad(null);
    mostrarAviso(mensaje);
    unidades.recargar();
  }
  function alNoExistir(tipo, texto) {
    setFormCategoria(null);
    setFormUnidad(null);
    mostrarAviso(texto, 'error');
    (tipo === 'categoria' ? categorias : unidades).recargar();
  }

  const desactivando = confirmacion?.nuevoEstado === 'inactivo';
  const esCategoria = confirmacion?.tipo === 'categoria';

  return (
    <>
      <SubnavInventario />

      <section className="seccion" aria-labelledby="titulo-categorias">
        <div className="seccion__titulo">
          <h3 id="titulo-categorias">Categorías</h3>
          <div className="pagina__acciones">
            <CampoSelect
              className="filtros__select"
              etiqueta="Estado de categorías"
              name="cat_estado"
              opciones={FILTRO_ESTADO}
              value={valores.cat_estado}
              onChange={(e) => cambiar({ cat_estado: e.target.value })}
            />
            <Boton onClick={() => setFormCategoria({ categoria: null })}>Nueva categoría</Boton>
          </div>
        </div>
        <CajaLista lista={categorias} textoCarga="Cargando categorías…">
          <TablaCategorias
            categorias={categorias.datos ?? []}
            ocupado={categorias.cargando}
            onEditar={(c) => setFormCategoria({ categoria: c })}
            onCambiarEstado={(c) => pedirCambio('categoria', c)}
          />
        </CajaLista>
      </section>

      <section className="seccion" aria-labelledby="titulo-unidades">
        <div className="seccion__titulo">
          <h3 id="titulo-unidades">Unidades de medida</h3>
          <div className="pagina__acciones">
            <CampoSelect
              className="filtros__select"
              etiqueta="Estado de unidades"
              name="uni_estado"
              opciones={FILTRO_ESTADO}
              value={valores.uni_estado}
              onChange={(e) => cambiar({ uni_estado: e.target.value })}
            />
            <Boton onClick={() => setFormUnidad({ unidad: null })}>Nueva unidad</Boton>
          </div>
        </div>
        <CajaLista lista={unidades} textoCarga="Cargando unidades…">
          <TablaUnidades
            unidades={unidades.datos ?? []}
            ocupado={unidades.cargando}
            onEditar={(u) => setFormUnidad({ unidad: u })}
            onCambiarEstado={(u) => pedirCambio('unidad', u)}
          />
        </CajaLista>
      </section>

      {aviso && (
        <Alerta tipo={aviso.tipo} className="aviso-flotante">
          {aviso.texto}
        </Alerta>
      )}

      {formCategoria && (
        <FormularioCategoria
          categoria={formCategoria.categoria}
          onGuardado={alGuardarCategoria}
          onCerrar={() => setFormCategoria(null)}
          onNoExiste={(t) => alNoExistir('categoria', t)}
        />
      )}
      {formUnidad && (
        <FormularioUnidad
          unidad={formUnidad.unidad}
          onGuardado={alGuardarUnidad}
          onCerrar={() => setFormUnidad(null)}
          onNoExiste={(t) => alNoExistir('unidad', t)}
        />
      )}

      {confirmacion && (
        <DialogoConfirmacion
          titulo={`${desactivando ? 'Desactivar' : 'Activar'} ${esCategoria ? 'categoría' : 'unidad'}`}
          mensaje={
            desactivando
              ? `¿Desactivar ${esCategoria ? 'la categoría' : 'la unidad'} ${confirmacion.item.nombre}? No podrá asignarse a productos nuevos.`
              : `¿Activar ${esCategoria ? 'la categoría' : 'la unidad'} ${confirmacion.item.nombre}? Podrá volver a asignarse a productos.`
          }
          textoConfirmar={desactivando ? 'Desactivar' : 'Activar'}
          peligro={desactivando}
          enviando={enviando}
          error={errorEstado}
          onConfirmar={confirmar}
          onCancelar={() => setConfirmacion(null)}
        />
      )}
    </>
  );
}
