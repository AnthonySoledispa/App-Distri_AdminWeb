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
  UNIDAD_DUPLICADA: 'Ya existe una unidad con ese nombre o abreviatura.',
  CATEGORIA_DUPLICADA: 'Ya existe una categoría con ese nombre.',
  PRODUCTO_DUPLICADO: 'Ya existe un producto con ese nombre.',
  SKU_DUPLICADO: 'Ya existe un producto con ese SKU.',
  LOTE_VENCIDO: 'El lote está vencido: solo puede darse de baja, no aumentarse.',
  UNIDAD_NO_ENCONTRADA: 'La unidad ya no existe.',
  CATEGORIA_NO_ENCONTRADA: 'La categoría ya no existe.',
  PRODUCTO_NO_ENCONTRADO: 'El producto no existe o fue eliminado.',
  LOTE_NO_ENCONTRADO: 'El lote no existe para este producto.',
  UNIDAD_EN_USO: 'No se puede desactivar: hay productos activos que la usan.',
  CATEGORIA_EN_USO: 'No se puede desactivar: hay productos activos que la usan.',
  CATEGORIA_INACTIVA: 'La categoría está inactiva. Elija otra.',
  UNIDAD_INACTIVA: 'La unidad está inactiva. Elija otra.',
  PRODUCTO_INACTIVO: 'El producto está inactivo: actívelo para registrar entradas.',
  PRODUCTO_CON_MOVIMIENTOS: 'El producto tiene movimientos de inventario; solo puede desactivarse.',
  CAMBIO_NO_PERMITIDO:
    'No se puede cambiar a una categoría o unidad con distinto control de lotes o decimales: el producto tiene movimientos.',
  CAMBIO_LOTES_NO_PERMITIDO: 'No se puede cambiar el control de lotes: hay productos con movimientos.',
  LOTE_REQUERIDO: 'Indique el código de lote y la fecha de caducidad.',
  LOTE_NO_APLICA: 'Esta categoría no controla lotes.',
  LOTE_CADUCIDAD_DISTINTA: 'Ese lote ya existe con otra fecha de caducidad.',
  PRODUCTO_SIN_LOTES: 'La categoría de este producto no controla lotes.',
  STOCK_INSUFICIENTE: 'Stock insuficiente.',
};

export const CODIGOS_INVENTARIO = [
  'UNIDAD_DUPLICADA',
  'CATEGORIA_DUPLICADA',
  'PRODUCTO_DUPLICADO',
  'SKU_DUPLICADO',
  'LOTE_VENCIDO',
  'UNIDAD_NO_ENCONTRADA',
  'CATEGORIA_NO_ENCONTRADA',
  'PRODUCTO_NO_ENCONTRADO',
  'LOTE_NO_ENCONTRADO',
  'UNIDAD_EN_USO',
  'CATEGORIA_EN_USO',
  'CATEGORIA_INACTIVA',
  'UNIDAD_INACTIVA',
  'PRODUCTO_INACTIVO',
  'PRODUCTO_CON_MOVIMIENTOS',
  'CAMBIO_NO_PERMITIDO',
  'CAMBIO_LOTES_NO_PERMITIDO',
  'LOTE_REQUERIDO',
  'LOTE_NO_APLICA',
  'LOTE_CADUCIDAD_DISTINTA',
  'PRODUCTO_SIN_LOTES',
];

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
    case 'STOCK_INSUFICIENTE':
      return e.detalles?.disponible !== undefined && e.detalles?.disponible !== null
        ? `Stock insuficiente. Disponible: ${e.detalles.disponible}.`
        : e.mensaje || MENSAJES.STOCK_INSUFICIENTE;
    default:
      if (CODIGOS_INVENTARIO.includes(e.codigo)) return MENSAJES[e.codigo];
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
