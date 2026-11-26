import { useRef, useState } from 'react';
import { registrarEntrada } from '../../services/api/inventario.js';
import { clasificarError } from '../../utils/erroresFormulario.js';
import { formatearCantidad, hoyLocalISO } from '../../utils/formato.js';
import { MENSAJES } from '../../utils/mensajesError.js';
import { aNumero, parsearCantidad, validarEntrada } from '../../utils/validacionesInventario.js';
import Modal from '../ui/Modal.jsx';
import Boton from '../ui/Boton.jsx';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoSelect from '../ui/CampoSelect.jsx';
import CampoArea from '../ui/CampoArea.jsx';
import Alerta from '../ui/Alerta.jsx';

const CAMPOS = ['producto_id', 'cantidad', 'fecha', 'observacion', 'codigo_lote', 'fecha_caducidad'];
const POR_CODIGO = {
  LOTE_CADUCIDAD_DISTINTA: 'fecha_caducidad',
  PRODUCTO_NO_ENCONTRADO: 'producto_id',
};

/**
 * Modal de entrada de mercadería (RF-12, RF-16).
 * - producto: si viene, queda fijo; si no, se elige entre `productos` (solo se ofrecen activos).
 * - onRegistrado({ movimiento, producto }): el padre muestra el aviso y recarga.
 */
export default function FormularioEntrada({ producto: fijo, productos = [], onRegistrado, onCerrar, onNoExiste }) {
  const [productoId, setProductoId] = useState(fijo ? String(fijo.id) : '');
  const [valores, setValores] = useState({
    cantidad: '',
    fecha: hoyLocalISO(),
    observacion: '',
    codigo_lote: '',
    fecha_caducidad: '',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef(null);

  const activos = productos.filter((p) => p.estado === 'activo');
  const producto = fijo ?? activos.find((p) => String(p.id) === productoId) ?? null;
  const controlaLotes = Boolean(producto?.controla_lotes);
  const permiteDecimales = producto ? Boolean(producto.permite_decimales) : true;
  const abrev = producto?.unidad_abreviatura ?? '';
  const cantidad = parsearCantidad(valores.cantidad, { decimales: permiteDecimales });
  const nuevoStock = producto && !cantidad.error ? Number(producto.stock_vendible) + cantidad.valor : null;

  const cambia = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  function enfocar(mapa) {
    const campo = CAMPOS.find((c) => mapa[c]);
    if (campo) formRef.current?.querySelector(`[name="${campo}"]`)?.focus();
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    setErrorGeneral('');
    const locales = producto ? validarEntrada(valores, { controlaLotes, permiteDecimales }) : { producto_id: 'Seleccione un producto.' };
    setErrores(locales);
    if (Object.keys(locales).length) return enfocar(locales);

    const cuerpo = { producto_id: producto.id, cantidad: aNumero(valores.cantidad), fecha: valores.fecha };
    if (valores.observacion.trim()) cuerpo.observacion = valores.observacion.trim();
    if (controlaLotes) {
      cuerpo.codigo_lote = valores.codigo_lote.trim();
      cuerpo.fecha_caducidad = valores.fecha_caducidad;
    }

    setEnviando(true);
    try {
      const resultado = await registrarEntrada(cuerpo);
      onRegistrado(resultado);
    } catch (err) {
      setEnviando(false);
      if (err.estado === 404 && err.codigo === 'PRODUCTO_NO_ENCONTRADO') {
        onNoExiste?.(MENSAJES.PRODUCTO_NO_ENCONTRADO);
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
    <Modal titulo="Registrar entrada" onCerrar={onCerrar} bloqueado={enviando}>
      <form ref={formRef} onSubmit={enviar} noValidate>
        <div className="modal__cuerpo">
          {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
          {fijo ? (
            <p className="campo">
              <strong>{fijo.nombre}</strong>
            </p>
          ) : (
            <CampoSelect
              etiqueta="Producto"
              name="producto_id"
              opciones={[
                { valor: '', etiqueta: 'Seleccione un producto…' },
                ...activos.map((p) => ({ valor: String(p.id), etiqueta: p.nombre })),
              ]}
              value={productoId}
              onChange={(e) => {
                setProductoId(e.target.value);
                setErrores((er) => ({ ...er, producto_id: undefined, cantidad: undefined }));
              }}
              error={errores.producto_id}
              data-foco-inicial
            />
          )}
          {producto && (
            <p className="campo__ayuda" style={{ marginBottom: 'var(--esp-4)' }}>
              Stock vendible: {formatearCantidad(producto.stock_vendible, abrev)}
            </p>
          )}
          <CampoTexto
            etiqueta={`Cantidad${abrev ? ` (${abrev})` : ''}`}
            name="cantidad"
            inputMode="decimal"
            value={valores.cantidad}
            onChange={cambia('cantidad')}
            error={errores.cantidad}
            autoComplete="off"
            data-foco-inicial={fijo ? true : undefined}
            ayuda={producto && !permiteDecimales ? 'Esta unidad solo admite cantidades enteras.' : undefined}
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
          {controlaLotes && (
            <>
              <CampoTexto
                etiqueta="Código de lote"
                name="codigo_lote"
                value={valores.codigo_lote}
                onChange={cambia('codigo_lote')}
                error={errores.codigo_lote}
                maxLength={50}
                autoComplete="off"
                ayuda="Si el lote ya existe con la misma fecha, se suma."
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
            </>
          )}
          <CampoArea
            etiqueta="Observación (opcional)"
            name="observacion"
            value={valores.observacion}
            onChange={cambia('observacion')}
            error={errores.observacion}
            maxLength={255}
          />
          {nuevoStock !== null && (
            <p className="vista-previa" aria-live="polite">
              Nuevo stock: {formatearCantidad(Math.round(nuevoStock * 1000) / 1000, abrev)}
            </p>
          )}
        </div>
        <div className="modal__pie">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} textoCargando="Registrando…">
            Registrar entrada
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
