// Validaciones del Módulo 3 en la interfaz (mismas reglas que el backend, que valida de nuevo).
import { aNumero, parsearCantidad } from './validacionesInventario.js';

export const MAX_LIMITE = 99999999.99;
const REGEX_TELEFONO = /^0(9\d{8}|[2-7]\d{7})$/;

const texto = (v) => String(v ?? '').trim();

/**
 * Normaliza un teléfono ecuatoriano a 09XXXXXXXX (celular) o 0[2-7]XXXXXXX (fijo).
 * Acepta espacios, guiones, puntos, paréntesis y el prefijo +593 / 593. Devuelve { valor } o { error }.
 */
export function normalizarTelefono(entrada) {
  if (typeof entrada !== 'string' || entrada.trim() === '') return { error: 'El teléfono es obligatorio.' };
  let t = entrada.trim();
  if (!/^[+\d\s().-]+$/.test(t)) {
    return { error: 'El teléfono solo puede contener dígitos, espacios, guiones, puntos, paréntesis y el signo +.' };
  }
  const tieneMas = t.startsWith('+');
  t = t.replace(/[\s().-]/g, '');
  if (tieneMas) t = t.slice(1);
  if (t.includes('+')) return { error: 'El teléfono no tiene un formato válido.' };
  if (tieneMas && !t.startsWith('593')) return { error: 'El teléfono debe ser ecuatoriano (+593).' };
  if (t.startsWith('593')) t = `0${t.slice(3)}`;
  if (!REGEX_TELEFONO.test(t)) {
    return { error: 'Ingrese un celular (09XXXXXXXX) o un fijo (02XXXXXXX a 07XXXXXXX) de Ecuador.' };
  }
  return { valor: t };
}

const opcionesLimite = { permitirCero: true, maxDecimales: 2, maximo: MAX_LIMITE, etiqueta: 'El límite de crédito' };

/** Límite de crédito escrito en el formulario: 0 permitido, hasta 2 decimales y máximo 99999999.99. */
export const esLimiteValido = (entrada) => !parsearCantidad(entrada, opcionesLimite).error;

function longitud(valor, min, max, etiqueta) {
  const t = texto(valor);
  if (t.length < min || t.length > max) return `${etiqueta} debe tener entre ${min} y ${max} caracteres.`;
  return undefined;
}

/** Errores por campo del formulario de tienda ({} si todo es válido). */
export function validarTienda(valores) {
  const errores = {};
  const nombre = longitud(valores.nombre, 2, 120, 'El nombre de la tienda');
  if (nombre) errores.nombre = nombre;
  const contacto = longitud(valores.contacto, 2, 100, 'El contacto');
  if (contacto) errores.contacto = contacto;
  const tel = normalizarTelefono(texto(valores.telefono));
  if (tel.error) errores.telefono = tel.error;
  const direccion = longitud(valores.direccion, 5, 255, 'La dirección');
  if (direccion) errores.direccion = direccion;
  const limite = parsearCantidad(valores.limite_credito, opcionesLimite);
  if (limite.error) errores.limite_credito = limite.error;
  return errores;
}

/** Errores por campo del formulario de ruta. */
export function validarRuta(valores) {
  const errores = {};
  const nombre = longitud(valores.nombre, 2, 80, 'El nombre de la ruta');
  if (nombre) errores.nombre = nombre;
  if (texto(valores.descripcion).length > 255) errores.descripcion = 'La descripción no puede superar 255 caracteres.';
  return errores;
}

/** ruta_id del formulario ('' = sin ruta) como número o null. */
export const rutaIdDe = (valor) => (valor === '' || valor === null || valor === undefined ? null : Number(valor));

/**
 * Cuerpo del PUT con solo lo que cambió respecto a la tienda original.
 * Los valores se comparan ya normalizados (teléfono y límite). "Sin ruta" envía ruta_id: null.
 */
export function camposCambiadosTienda(original, valores) {
  const cambios = {};
  const nombre = texto(valores.nombre);
  if (nombre !== original.nombre) cambios.nombre = nombre;
  const contacto = texto(valores.contacto);
  if (contacto !== original.contacto) cambios.contacto = contacto;
  const tel = normalizarTelefono(texto(valores.telefono));
  const telefono = tel.valor ?? texto(valores.telefono);
  if (telefono !== original.telefono) cambios.telefono = telefono;
  const direccion = texto(valores.direccion);
  if (direccion !== original.direccion) cambios.direccion = direccion;
  const ruta = rutaIdDe(valores.ruta_id);
  if (ruta !== (original.ruta_id ?? null)) cambios.ruta_id = ruta;
  const limite = aNumero(valores.limite_credito);
  if (limite !== Number(original.limite_credito)) cambios.limite_credito = limite;
  return cambios;
}

/** Cuerpo del POST de una tienda (ruta_id solo si se eligió una). */
export function cuerpoNuevaTienda(valores) {
  const cuerpo = {
    nombre: texto(valores.nombre),
    contacto: texto(valores.contacto),
    telefono: normalizarTelefono(texto(valores.telefono)).valor,
    direccion: texto(valores.direccion),
    limite_credito: aNumero(valores.limite_credito),
  };
  const ruta = rutaIdDe(valores.ruta_id);
  if (ruta !== null) cuerpo.ruta_id = ruta;
  return cuerpo;
}
