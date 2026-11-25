// Textos en español para el usuario, elegidos según el `codigo` del backend.

export const MENSAJES = {
  GENERICO: 'Ocurrió un error inesperado. Intente de nuevo.',
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  USUARIO_INACTIVO: 'Usuario desactivado. Contacte al administrador.',
  CLIENTE_NO_PERMITIDO:
    'Esta cuenta no tiene acceso al panel web. Los repartidores ingresan desde la aplicación móvil.',
  DEMASIADOS_INTENTOS: 'Demasiados intentos fallidos. Intente de nuevo más tarde.',
  CONEXION: 'No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo.',
  SERVICIO_NO_DISPONIBLE: 'El servicio no está disponible en este momento. Intente más tarde.',
  ACCESO_DENEGADO: 'No tiene permisos para realizar esta acción.',
  CORREO_DUPLICADO: 'Ya existe un usuario con ese correo.',
  USUARIO_NO_ENCONTRADO: 'El usuario ya no existe.',
  VALIDACION: 'Revise los datos ingresados.',
  INACTIVIDAD: 'Su sesión expiró por inactividad.',
  SESION_CERRADA: 'Su sesión fue cerrada. Inicie sesión nuevamente.',
  LOGOUT: 'Sesión cerrada correctamente.',
};

const CODIGOS_CONEXION = ['RED', 'TIEMPO_AGOTADO', 'RESPUESTA_INVALIDA'];

function esServicioNoDisponible(e) {
  return e?.codigo === 'BD_NO_DISPONIBLE' || e?.codigo === 'ERROR_INTERNO' || e?.estado === 503 || e?.estado >= 500;
}

/** Mensaje para la pantalla de login. */
export function mensajeLogin(e) {
  if (!e) return MENSAJES.GENERICO;
  if (CODIGOS_CONEXION.includes(e.codigo)) return MENSAJES.CONEXION;
  switch (e.codigo) {
    case 'CREDENCIALES_INVALIDAS':
      return MENSAJES.CREDENCIALES_INVALIDAS;
    case 'USUARIO_INACTIVO':
      return MENSAJES.USUARIO_INACTIVO;
    case 'CLIENTE_NO_PERMITIDO':
      return MENSAJES.CLIENTE_NO_PERMITIDO;
    case 'DEMASIADOS_INTENTOS':
      return e.mensaje || MENSAJES.DEMASIADOS_INTENTOS;
    case 'VALIDACION':
      return MENSAJES.VALIDACION;
    default:
      if (e.estado === 401) return MENSAJES.CREDENCIALES_INVALIDAS;
      if (e.estado === 429) return e.mensaje || MENSAJES.DEMASIADOS_INTENTOS;
      if (esServicioNoDisponible(e)) return MENSAJES.SERVICIO_NO_DISPONIBLE;
      return MENSAJES.GENERICO;
  }
}

/** Mensaje general para acciones dentro del panel. */
export function mensajeError(e) {
  if (!e) return MENSAJES.GENERICO;
  if (CODIGOS_CONEXION.includes(e.codigo)) return MENSAJES.CONEXION;
  switch (e.codigo) {
    case 'ACCESO_DENEGADO':
      return MENSAJES.ACCESO_DENEGADO;
    case 'CORREO_DUPLICADO':
      return MENSAJES.CORREO_DUPLICADO;
    case 'USUARIO_NO_ENCONTRADO':
      return MENSAJES.USUARIO_NO_ENCONTRADO;
    case 'OPERACION_NO_PERMITIDA':
      return e.mensaje || MENSAJES.GENERICO;
    case 'VALIDACION':
      return e.mensaje || MENSAJES.VALIDACION;
    default:
      if (esServicioNoDisponible(e)) return MENSAJES.SERVICIO_NO_DISPONIBLE;
      return MENSAJES.GENERICO;
  }
}

/**
 * Flash que se muestra en el login al perder la sesión.
 * SESION_EXPIRADA se atribuye a inactividad solo si ya pasó el límite.
 */
export function mensajeSesionInvalida(codigo, { ultimaActividad, inactividadMinutos, ahora = Date.now() } = {}) {
  if (codigo === 'SESION_EXPIRADA' && ultimaActividad && inactividadMinutos) {
    if (ahora - ultimaActividad >= inactividadMinutos * 60_000 - 5000) return MENSAJES.INACTIVIDAD;
  }
  return MENSAJES.SESION_CERRADA;
}
