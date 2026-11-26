// Validaciones del Módulo 2 en la interfaz (límites iguales a los del backend, que valida de nuevo).
import { hoyLocalISO } from './formato.js';

export const MAX_CANTIDAD = 999999999.999;
export const MAX_PRECIO = 99999999.99;
export const REGEX_SKU = /^[A-Za-z0-9._-]{1,50}$/;
const REGEX_NUMERO = /^\d+(?:[.,]\d+)?$/;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const MOTIVOS = [
  { valor: 'danio', etiqueta: 'Daño' },
  { valor: 'perdida', etiqueta: 'Pérdida' },
  { valor: 'merma', etiqueta: 'Merma' },
  { valor: 'caducidad', etiqueta: 'Caducidad' },
  { valor: 'correccion', etiqueta: 'Corrección' },
  { valor: 'otro', etiqueta: 'Otro' },
];
export const MOTIVOS_DISMINUCION = MOTIVOS.map((m) => m.valor);
export const MOTIVOS_AUMENTO = ['correccion', 'otro'];
export const MOTIVOS_FILTRO = [
  ...MOTIVOS,
  { valor: 'stock_inicial', etiqueta: 'Stock inicial' },
  { valor: 'despacho', etiqueta: 'Despacho' },
];
export const TIPOS_MOVIMIENTO = [
  { valor: 'entrada', etiqueta: 'Entrada' },
  { valor: 'salida', etiqueta: 'Salida' },
  { valor: 'ajuste', etiqueta: 'Ajuste' },
];
export const TIPOS_AJUSTE = [
  { valor: 'disminucion', etiqueta: 'Disminuir' },
  { valor: 'aumento', etiqueta: 'Aumentar' },
];

export const etiquetaMotivo = (v) => MOTIVOS_FILTRO.find((m) => m.valor === v)?.etiqueta ?? (v || '—');
export const etiquetaTipoMovimiento = (v) => TIPOS_MOVIMIENTO.find((t) => t.valor === v)?.etiqueta ?? v;

/** Motivos disponibles según el sentido del ajuste. */
export const motivosParaTipo = (tipo) =>
  MOTIVOS.filter((m) => (tipo === 'aumento' ? MOTIVOS_AUMENTO.includes(m.valor) : true));

const texto = (v) => String(v ?? '').trim();

/**
 * Convierte el texto de un campo numérico. Acepta coma o punto decimal.
 * Devuelve { valor } o { error }.
 */
export function parsearCantidad(
  entrada,
  { decimales = true, permitirCero = false, maxDecimales = 3, etiqueta = 'La cantidad', maximo = MAX_CANTIDAD } = {},
) {
  const t = texto(entrada);
  if (t === '') return { error: 'Este campo es obligatorio.' };
  if (!REGEX_NUMERO.test(t)) return { error: `${etiqueta} debe ser un número válido.` };
  const normal = t.replace(',', '.');
  const fraccion = normal.split('.')[1] ?? '';
  if (fraccion.length > maxDecimales) {
    return { error: `${etiqueta} admite como máximo ${maxDecimales} decimales.` };
  }
  const valor = Number(normal);
  if (!Number.isFinite(valor)) return { error: `${etiqueta} debe ser un número válido.` };
  if (!decimales && !Number.isInteger(valor)) {
    return { error: `${etiqueta} debe ser un número entero para esta unidad.` };
  }
  if (valor > maximo) return { error: `${etiqueta} es demasiado grande.` };
  if (valor === 0 && !permitirCero) return { error: `${etiqueta} debe ser mayor que cero.` };
  return { valor };
}

export const esCantidadValida = (entrada, opciones) => !parsearCantidad(entrada, opciones).error;

/** Número de un campo ya validado (coma o punto). NaN si no es válido. */
export const aNumero = (entrada) => Number(texto(entrada).replace(',', '.'));

function esFechaReal(iso) {
  if (!REGEX_FECHA.test(iso ?? '')) return false;
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

function validarFechaMovimiento(valor, hoy, etiqueta = 'La fecha') {
  if (!esFechaReal(valor)) return `${etiqueta} debe ser una fecha válida.`;
  if (valor > hoy) return `${etiqueta} no puede ser futura.`;
  return null;
}

function validarCaducidad(valor, hoy) {
  if (!esFechaReal(valor)) return 'La fecha de caducidad es obligatoria y debe ser válida.';
  if (valor < hoy) return 'La fecha de caducidad no puede ser anterior a hoy.';
  return null;
}

function validarLote(valor) {
  const t = texto(valor);
  if (t === '') return 'El código de lote es obligatorio.';
  if (t.length > 50) return 'El código de lote no puede superar 50 caracteres.';
  return null;
}

export function validarUnidad(valores) {
  const errores = {};
  const nombre = texto(valores.nombre);
  if (nombre.length < 2 || nombre.length > 50) errores.nombre = 'El nombre debe tener entre 2 y 50 caracteres.';
  const abrev = texto(valores.abreviatura);
  if (abrev.length < 1 || abrev.length > 10) errores.abreviatura = 'La abreviatura debe tener entre 1 y 10 caracteres.';
  if (valores.permite_decimales !== undefined && typeof valores.permite_decimales !== 'boolean') {
    errores.permite_decimales = 'Valor no válido.';
  }
  return errores;
}

export function validarCategoria(valores) {
  const errores = {};
  const nombre = texto(valores.nombre);
  if (nombre.length < 2 || nombre.length > 80) errores.nombre = 'El nombre debe tener entre 2 y 80 caracteres.';
  if (texto(valores.descripcion).length > 255) errores.descripcion = 'La descripción no puede superar 255 caracteres.';
  if (valores.controla_lotes !== undefined && typeof valores.controla_lotes !== 'boolean') {
    errores.controla_lotes = 'Valor no válido.';
  }
  return errores;
}

/** Valores de producto en texto (como salen del formulario). Devuelve { campo: mensaje }. */
export function validarProducto(
  valores,
  { creando = false, controlaLotes = false, permiteDecimales = true, hoy = hoyLocalISO() } = {},
) {
  const errores = {};
  const nombre = texto(valores.nombre);
  if (nombre.length < 2 || nombre.length > 120) errores.nombre = 'El nombre debe tener entre 2 y 120 caracteres.';
  const sku = texto(valores.sku);
  if (sku !== '' && !REGEX_SKU.test(sku)) {
    errores.sku = 'El SKU admite hasta 50 caracteres: letras, números, guion, guion bajo o punto, sin espacios.';
  }
  if (texto(valores.descripcion).length > 255) errores.descripcion = 'La descripción no puede superar 255 caracteres.';
  if (!valores.categoria_id) errores.categoria_id = 'Seleccione una categoría.';
  if (!valores.unidad_id) errores.unidad_id = 'Seleccione una unidad.';
  const precio = parsearCantidad(valores.precio_venta, {
    maxDecimales: 2,
    etiqueta: 'El precio de venta',
    maximo: MAX_PRECIO,
  });
  if (precio.error) errores.precio_venta = precio.error;
  const minimo = parsearCantidad(valores.stock_minimo, {
    decimales: permiteDecimales,
    permitirCero: true,
    etiqueta: 'El stock mínimo',
  });
  if (minimo.error) errores.stock_minimo = minimo.error;

  if (creando) {
    const hayStock = texto(valores.stock_inicial) !== '';
    let inicial = { valor: 0 };
    if (hayStock) {
      inicial = parsearCantidad(valores.stock_inicial, {
        decimales: permiteDecimales,
        permitirCero: true,
        etiqueta: 'El stock inicial',
      });
      if (inicial.error) errores.stock_inicial = inicial.error;
    }
    if (texto(valores.fecha) !== '' || hayStock) {
      const e = validarFechaMovimiento(valores.fecha, hoy);
      if (e) errores.fecha = e;
    }
    if (controlaLotes && inicial.valor > 0) {
      const l = validarLote(valores.codigo_lote);
      if (l) errores.codigo_lote = l;
      const c = validarCaducidad(valores.fecha_caducidad, hoy);
      if (c) errores.fecha_caducidad = c;
    }
  }
  return errores;
}

export function validarEntrada(valores, { controlaLotes = false, permiteDecimales = true, hoy = hoyLocalISO() } = {}) {
  const errores = {};
  const cantidad = parsearCantidad(valores.cantidad, { decimales: permiteDecimales });
  if (cantidad.error) errores.cantidad = cantidad.error;
  const e = validarFechaMovimiento(valores.fecha, hoy);
  if (e) errores.fecha = e;
  if (texto(valores.observacion).length > 255) errores.observacion = 'La observación no puede superar 255 caracteres.';
  if (controlaLotes) {
    const l = validarLote(valores.codigo_lote);
    if (l) errores.codigo_lote = l;
    const c = validarCaducidad(valores.fecha_caducidad, hoy);
    if (c) errores.fecha_caducidad = c;
  }
  return errores;
}

export function validarAjuste(
  valores,
  { stock = 0, disponibleLote, controlaLotes = false, permiteDecimales = true } = {},
) {
  const errores = {};
  const aumento = valores.tipo === 'aumento';
  if (!valores.motivo) errores.motivo = 'Seleccione un motivo.';
  else if (!MOTIVOS_DISMINUCION.includes(valores.motivo)) errores.motivo = 'Motivo no válido.';
  else if (aumento && !MOTIVOS_AUMENTO.includes(valores.motivo)) {
    errores.motivo = 'Este motivo solo permite disminuir el stock.';
  }
  if (['otro', 'correccion'].includes(valores.motivo) && texto(valores.observacion) === '') {
    errores.observacion = 'La observación es obligatoria para este motivo.';
  }
  if (texto(valores.observacion).length > 255) errores.observacion = 'La observación no puede superar 255 caracteres.';
  if (controlaLotes && !valores.lote_id) errores.lote_id = 'Seleccione el lote.';
  const cantidad = parsearCantidad(valores.cantidad, { decimales: permiteDecimales });
  if (cantidad.error) errores.cantidad = cantidad.error;
  else if (!aumento) {
    const tope = controlaLotes && disponibleLote !== undefined && disponibleLote !== null ? disponibleLote : stock;
    if (cantidad.valor > tope) errores.cantidad = `La cantidad no puede ser mayor al stock disponible (${tope}).`;
  }
  return errores;
}

/** Cuerpo del PUT con solo los campos cambiados, comparados ya normalizados. */
export function camposCambiadosProducto(original, valores) {
  const cambios = {};
  const nombre = texto(valores.nombre);
  if (nombre !== texto(original.nombre)) cambios.nombre = nombre;
  const sku = texto(valores.sku) || null;
  if (sku !== (texto(original.sku) || null)) cambios.sku = sku;
  const descripcion = texto(valores.descripcion) || null;
  if (descripcion !== (texto(original.descripcion) || null)) cambios.descripcion = descripcion;
  if (Number(valores.categoria_id) !== Number(original.categoria_id)) cambios.categoria_id = Number(valores.categoria_id);
  if (Number(valores.unidad_id) !== Number(original.unidad_id)) cambios.unidad_id = Number(valores.unidad_id);
  const precio = aNumero(valores.precio_venta);
  if (precio !== Number(original.precio_venta)) cambios.precio_venta = precio;
  const minimo = aNumero(valores.stock_minimo);
  if (minimo !== Number(original.stock_minimo)) cambios.stock_minimo = minimo;
  return cambios;
}
