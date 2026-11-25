// Validaciones de la interfaz. El backend vuelve a validar todo.

export const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROLES = [
  { valor: 'administrador', etiqueta: 'Administrador' },
  { valor: 'repartidor', etiqueta: 'Repartidor' },
];

export const ESTADOS = [
  { valor: 'activo', etiqueta: 'Activo' },
  { valor: 'inactivo', etiqueta: 'Inactivo' },
];

export const etiquetaRol = (rol) => ROLES.find((r) => r.valor === rol)?.etiqueta ?? rol;
export const etiquetaEstado = (estado) => ESTADOS.find((e) => e.valor === estado)?.etiqueta ?? estado;

export function bytesUtf8(texto) {
  return new TextEncoder().encode(texto).length;
}

export const normalizarNombre = (v) => String(v ?? '').trim();
export const normalizarCorreo = (v) => String(v ?? '').trim().toLowerCase();

export function validarNombre(valor) {
  const n = normalizarNombre(valor);
  if (n === '') return 'El nombre es obligatorio.';
  if (n.length < 2 || n.length > 100) return 'El nombre debe tener entre 2 y 100 caracteres.';
  return null;
}

export function validarCorreo(valor) {
  const c = normalizarCorreo(valor);
  if (c === '') return 'El correo es obligatorio.';
  if (c.length > 150) return 'El correo no puede superar 150 caracteres.';
  if (!REGEX_CORREO.test(c)) return 'El correo no tiene un formato válido.';
  return null;
}

export function validarContrasena(valor) {
  if (typeof valor !== 'string' || valor === '') return 'La contraseña es obligatoria.';
  const bytes = bytesUtf8(valor);
  if (bytes < 8 || bytes > 72) {
    return 'La contraseña debe tener entre 8 y 72 bytes (los caracteres con tilde o especiales ocupan más de uno).';
  }
  if (!/[A-Za-z]/.test(valor) || !/[0-9]/.test(valor)) {
    return 'La contraseña debe contener al menos una letra y un número.';
  }
  return null;
}

export function validarRol(valor) {
  return ROLES.some((r) => r.valor === valor) ? null : 'Seleccione un rol.';
}

export function validarConfirmacion(contrasena, confirmacion) {
  return contrasena === confirmacion ? null : 'Las contraseñas no coinciden.';
}

/**
 * Valida el formulario de usuario. En edición la contraseña es opcional.
 * Devuelve un objeto { campo: mensaje } vacío si todo es válido.
 */
export function validarFormularioUsuario(valores, { editando = false, rolBloqueado = false } = {}) {
  const errores = {};
  const nombre = validarNombre(valores.nombre);
  if (nombre) errores.nombre = nombre;
  const correo = validarCorreo(valores.correo);
  if (correo) errores.correo = correo;
  if (!rolBloqueado) {
    const rol = validarRol(valores.rol);
    if (rol) errores.rol = rol;
  }
  const hayContrasena = (valores.contrasena ?? '') !== '' || (valores.confirmacion ?? '') !== '';
  if (!editando || hayContrasena) {
    const c = validarContrasena(valores.contrasena);
    if (c) errores.contrasena = c;
    else {
      const conf = validarConfirmacion(valores.contrasena, valores.confirmacion ?? '');
      if (conf) errores.confirmacion = conf;
    }
  }
  return errores;
}

/**
 * Cuerpo del PUT con solo los campos cambiados (comparados ya normalizados).
 * `original` es el usuario cargado; `valores` es lo que hay en el formulario.
 */
export function camposCambiados(original, valores, { rolBloqueado = false } = {}) {
  const cambios = {};
  const nombre = normalizarNombre(valores.nombre);
  if (nombre !== normalizarNombre(original.nombre)) cambios.nombre = nombre;
  const correo = normalizarCorreo(valores.correo);
  if (correo !== normalizarCorreo(original.correo)) cambios.correo = correo;
  if (!rolBloqueado && valores.rol !== original.rol) cambios.rol = valores.rol;
  if ((valores.contrasena ?? '') !== '') cambios.contrasena = valores.contrasena;
  return cambios;
}
