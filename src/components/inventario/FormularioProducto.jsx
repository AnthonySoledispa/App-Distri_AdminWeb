import { useRef, useState } from 'react';
import { actualizarProducto, crearProducto } from '../../services/api/productos.js';
import { clasificarError } from '../../utils/erroresFormulario.js';
import { hoyLocalISO } from '../../utils/formato.js';
import { MENSAJES } from '../../utils/mensajesError.js';
import {
  aNumero,
  camposCambiadosProducto,
  parsearCantidad,
  validarProducto,
} from '../../utils/validacionesInventario.js';
import Modal from '../ui/Modal.jsx';
import Boton from '../ui/Boton.jsx';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoSelect from '../ui/CampoSelect.jsx';
import CampoArea from '../ui/CampoArea.jsx';
import Alerta from '../ui/Alerta.jsx';

const CAMPOS = [
  'nombre',
  'sku',
  'descripcion',
  'categoria_id',
  'unidad_id',
  'precio_venta',
  'stock_minimo',
  'stock_inicial',
  'fecha',
  'codigo_lote',
  'fecha_caducidad',
];

const POR_CODIGO = {
  PRODUCTO_DUPLICADO: 'nombre',
  SKU_DUPLICADO: 'sku',
  CATEGORIA_INACTIVA: 'categoria_id',
  UNIDAD_INACTIVA: 'unidad_id',
  CATEGORIA_NO_ENCONTRADA: 'categoria_id',
  UNIDAD_NO_ENCONTRADA: 'unidad_id',
};

const texto = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

/** Opciones activas; al editar se conserva la actual aunque esté inactiva, marcada "(inactiva)". */
function opcionesActivas(lista, actualId) {
  const opciones = [{ valor: '', etiqueta: 'Seleccione…' }];
  for (const i of lista) {
    if (i.estado === 'activo') opciones.push({ valor: String(i.id), etiqueta: i.nombre });
    else if (actualId && i.id === actualId) opciones.push({ valor: String(i.id), etiqueta: `${i.nombre} (inactiva)` });
  }
  return opciones;
}

/**
 * Modal de crear/editar producto (RF-09, RF-11). `producto` es null para crear.
 * Stock inicial y lote solo se piden al crear; el stock cambia luego solo con entradas y ajustes.
 */
export default function FormularioProducto({ producto, categorias, unidades, onGuardado, onCerrar, onNoExiste }) {
  const editando = Boolean(producto);
  const [valores, setValores] = useState({
    nombre: producto?.nombre ?? '',
    sku: producto?.sku ?? '',
    descripcion: producto?.descripcion ?? '',
    categoria_id: producto ? String(producto.categoria_id) : '',
    unidad_id: producto ? String(producto.unidad_id) : '',
    precio_venta: texto(producto?.precio_venta),
    stock_minimo: producto ? texto(producto.stock_minimo) : '0',
    stock_inicial: '',
    fecha: hoyLocalISO(),
    codigo_lote: '',
    fecha_caducidad: '',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef(null);

  const categoria = categorias.find((c) => String(c.id) === valores.categoria_id);
  const unidad = unidades.find((u) => String(u.id) === valores.unidad_id);
  const controlaLotes = Boolean(categoria?.controla_lotes);
  const permiteDecimales = unidad ? Boolean(unidad.permite_decimales) : true;
  const inicial = parsearCantidad(valores.stock_inicial, { permitirCero: true, decimales: permiteDecimales });
  const pideLote = editando ? false : controlaLotes && !inicial.error && inicial.valor > 0;

  const cambia = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  function enfocar(mapa) {
    const campo = CAMPOS.find((c) => mapa[c]);
    if (campo) formRef.current?.querySelector(`[name="${campo}"]`)?.focus();
  }

  /** Con movimientos no se puede cambiar a una categoría o unidad con distinto comportamiento. */
  function bloqueosLocales() {
    const e = {};
    if (editando && producto.tiene_movimientos) {
      if (categoria && Boolean(categoria.controla_lotes) !== Boolean(producto.controla_lotes)) {
        e.categoria_id = 'No se puede cambiar a una categoría con distinto control de lotes: el producto tiene movimientos.';
      }
      if (unidad && Boolean(unidad.permite_decimales) !== Boolean(producto.permite_decimales)) {
        e.unidad_id = 'No se puede cambiar a una unidad con distinto manejo de decimales: el producto tiene movimientos.';
      }
    }
    return e;
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    setErrorGeneral('');
    const locales = {
      ...validarProducto(valores, { creando: !editando, controlaLotes, permiteDecimales }),
      ...bloqueosLocales(),
    };
    setErrores(locales);
    if (Object.keys(locales).length) return enfocar(locales);

    let cuerpo;
    if (editando) {
      cuerpo = camposCambiadosProducto(producto, valores);
      if (Object.keys(cuerpo).length === 0) {
        setErrorGeneral('No hay cambios para guardar.');
        return undefined;
      }
    } else {
      cuerpo = {
        nombre: valores.nombre.trim(),
        categoria_id: Number(valores.categoria_id),
        unidad_id: Number(valores.unidad_id),
        precio_venta: aNumero(valores.precio_venta),
        stock_minimo: aNumero(valores.stock_minimo),
      };
      if (valores.sku.trim()) cuerpo.sku = valores.sku.trim();
      if (valores.descripcion.trim()) cuerpo.descripcion = valores.descripcion.trim();
      if (!inicial.error && inicial.valor > 0) {
        cuerpo.stock_inicial = inicial.valor;
        cuerpo.fecha = valores.fecha;
        if (controlaLotes) {
          cuerpo.codigo_lote = valores.codigo_lote.trim();
          cuerpo.fecha_caducidad = valores.fecha_caducidad;
        }
      }
    }

    setEnviando(true);
    try {
      if (editando) await actualizarProducto(producto.id, cuerpo);
      else await crearProducto(cuerpo);
      onGuardado(editando ? 'Producto actualizado' : 'Producto creado');
    } catch (err) {
      setEnviando(false);
      if (err.codigo === 'PRODUCTO_NO_ENCONTRADO' || (editando && err.estado === 404 && !POR_CODIGO[err.codigo])) {
        onNoExiste(MENSAJES.PRODUCTO_NO_ENCONTRADO);
        return undefined;
      }
      const { porCampo, general } = clasificarError(err, CAMPOS, POR_CODIGO);
      setErrores(porCampo);
      setErrorGeneral(general);
      enfocar(porCampo);
    }
    return undefined;
  }

  return (
    <Modal titulo={editando ? 'Editar producto' : 'Nuevo producto'} onCerrar={onCerrar} bloqueado={enviando}>
      <form ref={formRef} onSubmit={enviar} noValidate>
        <div className="modal__cuerpo">
          {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
          <CampoTexto
            etiqueta="Nombre"
            name="nombre"
            value={valores.nombre}
            onChange={cambia('nombre')}
            error={errores.nombre}
            autoComplete="off"
            data-foco-inicial
          />
          <CampoTexto
            etiqueta="SKU (opcional)"
            name="sku"
            value={valores.sku}
            onChange={cambia('sku')}
            error={errores.sku}
            autoComplete="off"
            ayuda="Código interno opcional. No puede repetirse."
          />
          <CampoArea
            etiqueta="Descripción (opcional)"
            name="descripcion"
            value={valores.descripcion}
            onChange={cambia('descripcion')}
            error={errores.descripcion}
            maxLength={255}
          />
          <div className="fila-doble">
            <CampoSelect
              etiqueta="Categoría"
              name="categoria_id"
              opciones={opcionesActivas(categorias, producto?.categoria_id)}
              value={valores.categoria_id}
              onChange={cambia('categoria_id')}
              error={errores.categoria_id}
            />
            <CampoSelect
              etiqueta="Unidad"
              name="unidad_id"
              opciones={opcionesActivas(unidades, producto?.unidad_id)}
              value={valores.unidad_id}
              onChange={cambia('unidad_id')}
              error={errores.unidad_id}
            />
          </div>
          <div className="fila-doble">
            <CampoTexto
              etiqueta="Precio de venta (USD)"
              name="precio_venta"
              inputMode="decimal"
              value={valores.precio_venta}
              onChange={cambia('precio_venta')}
              error={errores.precio_venta}
              autoComplete="off"
            />
            <CampoTexto
              etiqueta="Stock mínimo"
              name="stock_minimo"
              inputMode="decimal"
              value={valores.stock_minimo}
              onChange={cambia('stock_minimo')}
              error={errores.stock_minimo}
              autoComplete="off"
              ayuda={permiteDecimales ? undefined : 'Esta unidad solo admite cantidades enteras.'}
            />
          </div>

          {editando ? (
            <p className="campo__ayuda">El stock cambia solo con entradas y ajustes.</p>
          ) : (
            <>
              <div className="fila-doble">
                <CampoTexto
                  etiqueta="Stock inicial (opcional)"
                  name="stock_inicial"
                  inputMode="decimal"
                  value={valores.stock_inicial}
                  onChange={cambia('stock_inicial')}
                  error={errores.stock_inicial}
                  autoComplete="off"
                />
                <CampoTexto
                  etiqueta="Fecha"
                  name="fecha"
                  type="date"
                  max={hoyLocalISO()}
                  value={valores.fecha}
                  onChange={cambia('fecha')}
                  error={errores.fecha}
                />
              </div>
              {pideLote && (
                <div className="fila-doble">
                  <CampoTexto
                    etiqueta="Código de lote"
                    name="codigo_lote"
                    value={valores.codigo_lote}
                    onChange={cambia('codigo_lote')}
                    error={errores.codigo_lote}
                    maxLength={50}
                    autoComplete="off"
                  />
                  <CampoTexto
                    etiqueta="Fecha de caducidad"
                    name="fecha_caducidad"
                    type="date"
                    min={hoyLocalISO()}
                    value={valores.fecha_caducidad}
                    onChange={cambia('fecha_caducidad')}
                    error={errores.fecha_caducidad}
                  />
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal__pie">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} textoCargando="Guardando…">
            {editando ? 'Guardar cambios' : 'Crear producto'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
