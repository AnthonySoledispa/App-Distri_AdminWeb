import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAlertasInventario } from '../context/useAlertasInventario.js';
import { obtenerAlertas } from '../services/api/inventario.js';
import { obtenerProducto } from '../services/api/productos.js';
import { formatearCantidad, formatearDia } from '../utils/formato.js';
import { mensajeError } from '../utils/mensajesError.js';
import { useAviso } from '../hooks/useAviso.js';
import { useParametrosUrl } from '../hooks/useParametrosUrl.js';
import Boton from '../components/ui/Boton.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import CampoTexto from '../components/ui/CampoTexto.jsx';
import Insignia from '../components/ui/Insignia.jsx';
import SubnavInventario from '../components/inventario/SubnavInventario.jsx';
import FormularioEntrada from '../components/inventario/FormularioEntrada.jsx';
import FormularioAjuste from '../components/inventario/FormularioAjuste.jsx';
import { textoDias } from '../components/inventario/TablaLotes.jsx';

function TablaLotesAlerta({ lotes, vencidos, accion, onAccion, abriendo }) {
  return (
    <div className="tabla-scroll">
      <table className="tabla">
        <caption className="solo-lectores">{vencidos ? 'Lotes vencidos con existencias' : 'Lotes próximos a vencer'}</caption>
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Lote</th>
            <th scope="col">Caducidad</th>
            <th scope="col" className="tabla__num">
              Días restantes
            </th>
            <th scope="col" className="tabla__num">
              Disponible
            </th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((l) => (
            <tr key={l.id}>
              <td>
                <Link to={`/productos/${l.producto_id}`} className="tabla__enlace">
                  {l.producto_nombre}
                </Link>
              </td>
              <td>{l.codigo_lote}</td>
              <td>
                {formatearDia(l.fecha_caducidad)}{' '}
                {vencidos && <Insignia variante="vencido">Vencido</Insignia>}
              </td>
              <td className="tabla__num">{textoDias(l.dias_para_vencer)}</td>
              <td className="tabla__num">{formatearCantidad(l.cantidad_disponible, l.unidad_abreviatura)}</td>
              <td>
                <Boton
                  variante={vencidos ? 'peligro' : 'secundario'}
                  pequeno
                  onClick={() => onAccion(l)}
                  cargando={abriendo === l.id}
                  textoCargando="Abriendo…"
                  aria-label={`${accion} del lote ${l.codigo_lote} de ${l.producto_nombre}`}
                >
                  {accion}
                </Boton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AlertasInventarioPage() {
  const { recargarAlertas } = useAlertasInventario();
  const { valores, cambiar } = useParametrosUrl(['dias']);
  const { aviso, mostrarAviso } = useAviso();

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  const [diasTexto, setDiasTexto] = useState(valores.dias);
  const [errorDias, setErrorDias] = useState('');

  const [entrada, setEntrada] = useState(null); // producto
  const [ajuste, setAjuste] = useState(null); // { producto, inicial }
  const [abriendo, setAbriendo] = useState(null); // id del lote que se está abriendo

  useEffect(() => {
    document.title = 'Alertas de inventario | DistriGO';
  }, []);

  const dias = valores.dias;
  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError('');
    obtenerAlertas(dias || undefined, { signal: control.signal })
      .then((r) => {
        setDatos(r);
        setCargando(false);
        // Si no hay `dias` en la URL, el campo muestra el valor por defecto del backend.
        setDiasTexto((previo) => (previo === '' ? String(r.dias) : previo));
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(mensajeError(e));
        setCargando(false);
      });
    return () => control.abort();
  }, [dias, recarga]);

  useEffect(() => {
    setDiasTexto(dias);
  }, [dias]);

  const recargar = useCallback(() => setRecarga((n) => n + 1), []);

  function refrescarTodo() {
    recargar();
    recargarAlertas();
  }

  function aplicarDias(e) {
    e.preventDefault();
    const t = diasTexto.trim();
    if (!/^\d{1,3}$/.test(t) || Number(t) < 1 || Number(t) > 365) {
      setErrorDias('Indique un número de días entre 1 y 365.');
      return;
    }
    setErrorDias('');
    cambiar({ dias: String(Number(t)) });
  }

  async function abrirAjuste(lote, inicial) {
    setAbriendo(lote.id);
    try {
      const producto = await obtenerProducto(lote.producto_id);
      setAjuste({ producto, inicial: { tipo: 'disminucion', motivo: 'caducidad', lote_id: lote.id, ...inicial } });
    } catch (e) {
      mostrarAviso(mensajeError(e), 'error');
    } finally {
      setAbriendo(null);
    }
  }

  function alNoExistir(texto) {
    setEntrada(null);
    setAjuste(null);
    mostrarAviso(texto, 'error');
    refrescarTodo();
  }

  function alRegistrar(texto) {
    return ({ producto }) => {
      setEntrada(null);
      setAjuste(null);
      mostrarAviso(`${texto} Stock: ${formatearCantidad(producto.stock_vendible, producto.unidad_abreviatura)}.`);
      refrescarTodo();
    };
  }

  const diasActuales = datos?.dias ?? (dias || '');

  return (
    <>
      <SubnavInventario />
      <div className="pagina__encabezado">
        <p>Productos con stock bajo y lotes próximos a vencer o ya vencidos.</p>
      </div>

      {error ? (
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{error}</Alerta>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      ) : datos === null ? (
        <div className="tabla-caja">
          <Cargando texto="Cargando alertas…" />
        </div>
      ) : (
        <div aria-busy={cargando || undefined}>
          <div className="resumen-alertas">
            <div className="resumen-alertas__tarjeta">
              <span className="resumen-alertas__numero">{datos.totales.stock_bajo}</span>
              Stock bajo
            </div>
            <div className="resumen-alertas__tarjeta">
              <span className="resumen-alertas__numero">{datos.totales.por_vencer}</span>
              Por vencer en {datos.dias} días
            </div>
            <div className="resumen-alertas__tarjeta resumen-alertas__tarjeta--vencidos">
              <span className="resumen-alertas__numero">{datos.totales.vencidos}</span>
              Vencidos con existencias
            </div>
          </div>

          <section className="seccion" aria-labelledby="titulo-bajo">
            <div className="seccion__titulo">
              <h3 id="titulo-bajo">Stock bajo</h3>
            </div>
            <div className="tabla-caja">
              {datos.stock_bajo.length === 0 ? (
                <p className="estado-vacio">Ningún producto está por debajo de su mínimo.</p>
              ) : (
                <div className="tabla-scroll">
                  <table className="tabla">
                    <caption className="solo-lectores">Productos con stock bajo</caption>
                    <thead>
                      <tr>
                        <th scope="col">Producto</th>
                        <th scope="col">Categoría</th>
                        <th scope="col" className="tabla__num">
                          Stock vendible
                        </th>
                        <th scope="col" className="tabla__num">
                          Mínimo
                        </th>
                        <th scope="col" className="tabla__num">
                          Faltante
                        </th>
                        <th scope="col">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.stock_bajo.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <Link to={`/productos/${p.id}`} className="tabla__enlace">
                              {p.nombre}
                            </Link>
                          </td>
                          <td>{p.categoria_nombre}</td>
                          <td className="tabla__num">{formatearCantidad(p.stock_vendible, p.unidad_abreviatura)}</td>
                          <td className="tabla__num">{formatearCantidad(p.stock_minimo, p.unidad_abreviatura)}</td>
                          <td className="tabla__num">
                            {formatearCantidad(Math.max(0, Math.round((p.stock_minimo - p.stock_vendible) * 1000) / 1000), p.unidad_abreviatura)}
                          </td>
                          <td>
                            <Boton
                              variante="secundario"
                              pequeno
                              onClick={() => setEntrada(p)}
                              aria-label={`Registrar entrada de ${p.nombre}`}
                            >
                              Registrar entrada
                            </Boton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="seccion" aria-labelledby="titulo-vencer">
            <div className="seccion__titulo">
              <h3 id="titulo-vencer">Próximos a vencer</h3>
            </div>
            <form className="alertas__dias" onSubmit={aplicarDias} noValidate aria-label="Ventana de caducidad">
              <CampoTexto
                etiqueta="Días"
                name="dias"
                inputMode="numeric"
                value={diasTexto}
                onChange={(e) => {
                  setDiasTexto(e.target.value);
                  setErrorDias('');
                }}
                error={errorDias}
                placeholder={String(diasActuales)}
              />
              <Boton type="submit" variante="secundario">
                Aplicar
              </Boton>
            </form>
            <div className="tabla-caja">
              {datos.por_vencer.length === 0 ? (
                <p className="estado-vacio">Ningún lote vence en los próximos {datos.dias} días.</p>
              ) : (
                <TablaLotesAlerta
                  lotes={datos.por_vencer}
                  accion="Registrar ajuste"
                  abriendo={abriendo}
                  onAccion={(l) => abrirAjuste(l, {})}
                />
              )}
            </div>
          </section>

          <section className="seccion" aria-labelledby="titulo-vencidos">
            <div className="seccion__titulo">
              <h3 id="titulo-vencidos">Vencidos con existencias</h3>
            </div>
            <p className="nota">No cuentan como stock vendible ni se despachan.</p>
            <div className="tabla-caja">
              {datos.vencidos.length === 0 ? (
                <p className="estado-vacio">No hay lotes vencidos con existencias.</p>
              ) : (
                <TablaLotesAlerta
                  lotes={datos.vencidos}
                  vencidos
                  accion="Dar de baja"
                  abriendo={abriendo}
                  onAccion={(l) => abrirAjuste(l, { cantidad: l.cantidad_disponible })}
                />
              )}
            </div>
          </section>
        </div>
      )}

      {aviso && (
        <Alerta tipo={aviso.tipo} className="aviso-flotante">
          {aviso.texto}
        </Alerta>
      )}

      {entrada && (
        <FormularioEntrada
          producto={entrada}
          onRegistrado={alRegistrar('Entrada registrada.')}
          onCerrar={() => setEntrada(null)}
          onNoExiste={alNoExistir}
        />
      )}
      {ajuste && (
        <FormularioAjuste
          producto={ajuste.producto}
          inicial={ajuste.inicial}
          onRegistrado={alRegistrar('Ajuste registrado.')}
          onCerrar={() => setAjuste(null)}
          onNoExiste={alNoExistir}
        />
      )}
    </>
  );
}
