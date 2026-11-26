import { useEffect, useRef, useState } from 'react';
import { registrarAjuste } from '../../services/api/inventario.js';
import { listarLotes, obtenerProducto } from '../../services/api/productos.js';
import { clasificarError } from '../../utils/erroresFormulario.js';
import { formatearCantidad, formatearDia } from '../../utils/formato.js';
import { mensajeError, MENSAJES } from '../../utils/mensajesError.js';
import {
  aNumero,
  motivosParaTipo,
  parsearCantidad,
  TIPOS_AJUSTE,
  validarAjuste,
} from '../../utils/validacionesInventario.js';
import Modal from '../ui/Modal.jsx';
import Boton from '../ui/Boton.jsx';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoSelect from '../ui/CampoSelect.jsx';
import CampoArea from '../ui/CampoArea.jsx';
import Alerta from '../ui/Alerta.jsx';

const CAMPOS = ['tipo_ajuste', 'motivo', 'cantidad', 'observacion', 'lote_id'];
const redondear = (n) => Math.round(n * 1000) / 1000;

/**
 * Modal de ajuste de inventario (RF-18).
 * - producto: producto fijo (con su stock).
 * - inicial: { tipo, motivo, lote_id, cantidad } para preseleccionar (p. ej. "Dar de baja" desde Alertas).
 * - onRegistrado({ movimiento, producto }).
 */
export default function FormularioAjuste({ producto: inicialProducto, inicial = {}, onRegistrado, onCerrar, onNoExiste }) {
  const [producto, setProducto] = useState(inicialProducto);
  const [lotes, setLotes] = useState(null); // null = cargando; [] sin lotes
  const [errorLotes, setErrorLotes] = useState('');
  const [valores, setValores] = useState({
    tipo: inicial.tipo ?? 'disminucion',
    motivo: inicial.motivo ?? '',
    cantidad: inicial.cantidad !== undefined ? String(inicial.cantidad).replace('.', ',') : '',
    observacion: '',
    lote_id: inicial.lote_id ? String(inicial.lote_id) : '',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef(null);

  const controlaLotes = Boolean(producto.controla_lotes);
  const permiteDecimales = Boolean(producto.permite_decimales);
  const abrev = producto.unidad_abreviatura ?? '';
  const aumento = valores.tipo === 'aumento';

  useEffect(() => {
    if (!inicialProducto.controla_lotes) {
      setLotes([]);
      return undefined;
    }
    const control = new AbortController();
    listarLotes(inicialProducto.id, { con_stock: true }, { signal: control.signal })
      .then((r) => setLotes(Array.isArray(r) ? r : []))
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setLotes([]);
        setErrorLotes(mensajeError(e));
      });
    return () => control.abort();
  }, [inicialProducto.id, inicialProducto.controla_lotes]);

  const lotesVisibles = (lotes ?? []).filter((l) => !(aumento && l.estado_caducidad === 'vencido'));
  const lote = (lotes ?? []).find((l) => String(l.id) === valores.lote_id) ?? null;

  const cantidad = parsearCantidad(valores.cantidad, { decimales: permiteDecimales });
  let resultante = null;
  if (!cantidad.error) {
    const vencido = lote?.estado_caducidad === 'vencido';
    const base = Number(producto.stock_vendible ?? producto.stock_actual);
    // Disminuir un lote vencido no cambia el stock vendible.
    const delta = aumento ? cantidad.valor : vencido ? 0 : -cantidad.valor;
    resultante = redondear(base + delta);
  }

  const cambia = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  function cambiarTipo(e) {
    const tipo = e.target.value;
    setValores((v) => {
      const permitidos = motivosParaTipo(tipo).map((m) => m.valor);
      const vencidoElegido = tipo === 'aumento' && (lotes ?? []).find((l) => String(l.id) === v.lote_id)?.estado_caducidad === 'vencido';
      return {
        ...v,
        tipo,
        motivo: permitidos.includes(v.motivo) ? v.motivo : '',
        lote_id: vencidoElegido ? '' : v.lote_id,
      };
    });
    setErrores((er) => ({ ...er, motivo: undefined, lote_id: undefined }));
  }

  function enfocar(mapa) {
    const mapaCampo = { tipo_ajuste: 'tipo' };
    const campo = CAMPOS.find((c) => mapa[c]);
    if (campo) formRef.current?.querySelector(`[name="${mapaCampo[campo] ?? campo}"]`)?.focus();
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    setErrorGeneral('');
    const locales = validarAjuste(valores, {
      stock: Number(producto.stock_actual),
      disponibleLote: lote ? Number(lote.cantidad_disponible) : undefined,
      controlaLotes,
      permiteDecimales,
    });
    setErrores(locales);
    if (Object.keys(locales).length) return enfocar(locales);

    const cuerpo = {
      producto_id: producto.id,
      tipo_ajuste: valores.tipo,
      cantidad: aNumero(valores.cantidad),
      motivo: valores.motivo,
    };
    if (valores.observacion.trim()) cuerpo.observacion = valores.observacion.trim();
    if (controlaLotes) cuerpo.lote_id = Number(valores.lote_id);

    setEnviando(true);
    try {
      const resultado = await registrarAjuste(cuerpo);
      onRegistrado(resultado);
    } catch (err) {
      setEnviando(false);
      if (err.codigo === 'PRODUCTO_NO_ENCONTRADO') {
        onNoExiste?.(MENSAJES.PRODUCTO_NO_ENCONTRADO);
        return undefined;
      }
      if (err.codigo === 'STOCK_INSUFICIENTE') {
        const disponible = err.detalles?.disponible;
        const texto =
          disponible !== undefined && disponible !== null
            ? `Stock insuficiente. Disponible: ${formatearCantidad(disponible)} ${abrev}.`.trim()
            : MENSAJES.STOCK_INSUFICIENTE;
        setErrores({ cantidad: texto });
        enfocar({ cantidad: texto });
        // Se recarga el stock mostrado.
        obtenerProducto(producto.id)
          .then((p) => setProducto(p))
          .catch(() => {});
        if (controlaLotes) {
          listarLotes(producto.id, { con_stock: true })
            .then((r) => setLotes(Array.isArray(r) ? r : []))
            .catch(() => {});
        }
        return undefined;
      }
      const { porCampo, general } = clasificarError(err, CAMPOS, {
        LOTE_VENCIDO: 'lote_id',
        LOTE_NO_ENCONTRADO: 'lote_id',
      });
      setErrores(porCampo);
      setErrorGeneral(general);
      enfocar(porCampo);
    }
    return undefined;
  }

  const opcionesLote = [
    { valor: '', etiqueta: lotes === null ? 'Cargando lotes…' : 'Seleccione un lote' },
    ...lotesVisibles.map((l) => ({
      valor: String(l.id),
      etiqueta: `${l.codigo_lote} — vence ${formatearDia(l.fecha_caducidad)} — disponible ${formatearCantidad(l.cantidad_disponible)}${
        l.estado_caducidad === 'vencido' ? ' (vencido)' : ''
      }`,
    })),
  ];

  return (
    <Modal titulo="Registrar ajuste" onCerrar={onCerrar} bloqueado={enviando}>
      <form ref={formRef} onSubmit={enviar} noValidate>
        <div className="modal__cuerpo">
          {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
          {errorLotes && <Alerta tipo="aviso">{errorLotes}</Alerta>}
          <p className="campo">
            <strong>{producto.nombre}</strong>
            <span className="campo__ayuda">
              Stock actual: {formatearCantidad(producto.stock_actual, abrev)}
              {Number(producto.stock_vencido) > 0 && ` (vencido: ${formatearCantidad(producto.stock_vencido, abrev)})`}
            </span>
          </p>
          <CampoSelect
            etiqueta="Tipo de ajuste"
            name="tipo"
            opciones={TIPOS_AJUSTE}
            value={valores.tipo}
            onChange={cambiarTipo}
            error={errores.tipo_ajuste}
          />
          <CampoSelect
            etiqueta="Motivo"
            name="motivo"
            opciones={[{ valor: '', etiqueta: 'Seleccione un motivo…' }, ...motivosParaTipo(valores.tipo)]}
            value={valores.motivo}
            onChange={cambia('motivo')}
            error={errores.motivo}
            data-foco-inicial
          />
          {controlaLotes && (
            <CampoSelect
              etiqueta="Lote"
              name="lote_id"
              opciones={opcionesLote}
              value={valores.lote_id}
              onChange={cambia('lote_id')}
              error={errores.lote_id}
              disabled={lotes === null}
            />
          )}
          <CampoTexto
            etiqueta={`Cantidad${abrev ? ` (${abrev})` : ''}`}
            name="cantidad"
            inputMode="decimal"
            value={valores.cantidad}
            onChange={cambia('cantidad')}
            error={errores.cantidad}
            autoComplete="off"
            ayuda={!permiteDecimales ? 'Esta unidad solo admite cantidades enteras.' : undefined}
          />
          <CampoArea
            etiqueta="Observación"
            name="observacion"
            value={valores.observacion}
            onChange={cambia('observacion')}
            error={errores.observacion}
            maxLength={255}
            ayuda={['otro', 'correccion'].includes(valores.motivo) ? 'Obligatoria para este motivo.' : undefined}
          />
          {resultante !== null && (
            <p className="vista-previa" aria-live="polite">
              Stock vendible resultante: {formatearCantidad(resultante, abrev)}
            </p>
          )}
        </div>
        <div className="modal__pie">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} textoCargando="Registrando…">
            Registrar ajuste
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
