import { mensajeError } from './mensajesError.js';

/**
 * Reparte un error del backend entre los campos del formulario y un mensaje general.
 * - campos: nombres de campo válidos del formulario.
 * - porCodigo: { CODIGO: 'campo' } para errores 409 que se muestran junto a un campo.
 */
export function clasificarError(err, campos, porCodigo = {}) {
  const porCampo = {};
  const generales = [];
  if (porCodigo[err.codigo] && campos.includes(porCodigo[err.codigo])) {
    porCampo[porCodigo[err.codigo]] = mensajeError(err);
    return { porCampo, general: '' };
  }
  if (err.codigo === 'VALIDACION' && err.errores?.length) {
    for (const { campo, mensaje } of err.errores) {
      if (campos.includes(campo) && !porCampo[campo]) porCampo[campo] = mensaje;
      else generales.push(mensaje);
    }
    return { porCampo, general: generales.join(' ') };
  }
  if (err.codigo === 'LOTE_REQUERIDO' && err.errores?.length) {
    for (const { campo, mensaje } of err.errores) {
      if (campos.includes(campo) && !porCampo[campo]) porCampo[campo] = mensaje;
    }
    if (Object.keys(porCampo).length) return { porCampo, general: '' };
  }
  return { porCampo, general: mensajeError(err) };
}
