// Almacén de sesión en sessionStorage: sobrevive a F5 y se borra al cerrar la pestaña.
// Nunca se guarda la contraseña.
const CLAVE = 'distrigo.sesion';
const CLAVE_FLASH = 'distrigo.flash';

function almacen() {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

export function leerSesion() {
  const a = almacen();
  if (!a) return null;
  try {
    const crudo = a.getItem(CLAVE);
    if (!crudo) return null;
    const s = JSON.parse(crudo);
    return s && typeof s.token === 'string' ? s : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  almacen()?.setItem(CLAVE, JSON.stringify(sesion));
}

export function obtenerToken() {
  return leerSesion()?.token ?? null;
}

export function actualizarSesion(parcial) {
  const s = leerSesion();
  if (s) guardarSesion({ ...s, ...parcial });
}

export function limpiarSesion() {
  almacen()?.removeItem(CLAVE);
}

export function guardarFlash(mensaje) {
  almacen()?.setItem(CLAVE_FLASH, mensaje);
}

export function leerFlash() {
  return almacen()?.getItem(CLAVE_FLASH) ?? null;
}

export function consumirFlash() {
  const m = leerFlash();
  if (m) almacen()?.removeItem(CLAVE_FLASH);
  return m;
}
