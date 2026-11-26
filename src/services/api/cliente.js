import { API_URL, TIEMPO_MAXIMO_MS } from '../../config.js';
import { obtenerToken, actualizarSesion } from '../almacenSesion.js';

export class ApiError extends Error {
  constructor({ estado = 0, codigo = 'ERROR', mensaje = '', errores = [], detalles = null } = {}) {
    super(mensaje || codigo);
    this.name = 'ApiError';
    this.estado = estado;
    this.codigo = codigo;
    this.mensaje = mensaje;
    this.errores = errores;
    this.detalles = detalles;
  }
}

export const CODIGOS_SESION_INVALIDA = ['TOKEN_AUSENTE', 'TOKEN_INVALIDO', 'SESION_CERRADA', 'SESION_EXPIRADA'];

let manejadorSesionInvalida = null;

export function registrarManejadorSesionInvalida(fn) {
  manejadorSesionInvalida = fn;
}

export function construirQuery(query = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

function registrarActividad() {
  actualizarSesion({ ultimaActividad: Date.now() });
}

export async function solicitar(metodo, ruta, { cuerpo, query, autenticado = true, signal } = {}) {
  const controlador = new AbortController();
  let agotado = false;
  const temporizador = setTimeout(() => {
    agotado = true;
    controlador.abort();
  }, TIEMPO_MAXIMO_MS);
  if (signal) {
    if (signal.aborted) controlador.abort();
    else signal.addEventListener('abort', () => controlador.abort(), { once: true });
  }

  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  const token = autenticado ? obtenerToken() : null;
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta;
  let json;
  try {
    respuesta = await fetch(`${API_URL}${ruta}${construirQuery(query)}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: controlador.signal,
    });
    try {
      json = await respuesta.json();
    } catch (e) {
      if (agotado) throw e;
      if (e?.name === 'AbortError') throw e;
      throw new ApiError({
        estado: respuesta.status,
        codigo: 'RESPUESTA_INVALIDA',
        mensaje: 'Respuesta inválida del servidor.',
      });
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (agotado) {
      throw new ApiError({ estado: 0, codigo: 'TIEMPO_AGOTADO', mensaje: 'Tiempo de espera agotado.' });
    }
    if (e?.name === 'AbortError') throw e; // cancelación pedida por quien llama
    throw new ApiError({ estado: 0, codigo: 'RED', mensaje: 'No se pudo conectar con el servidor.' });
  } finally {
    clearTimeout(temporizador);
  }

  if (json && json.ok === true) {
    if (autenticado) registrarActividad();
    return json.data;
  }

  const error = new ApiError({
    estado: respuesta.status,
    codigo: json?.codigo || 'ERROR',
    mensaje: json?.mensaje || '',
    errores: Array.isArray(json?.errores) ? json.errores : [],
    detalles: json?.detalles ?? null,
  });

  if (autenticado) {
    if (respuesta.status === 401) {
      if (CODIGOS_SESION_INVALIDA.includes(error.codigo)) manejadorSesionInvalida?.(error.codigo);
    } else if (respuesta.status < 500) {
      // Un 5xx (p. ej. 503 con la base de datos caída) no renueva la sesión en el backend.
      registrarActividad();
    }
  }
  throw error;
}

export const api = {
  get: (ruta, opciones) => solicitar('GET', ruta, opciones),
  post: (ruta, cuerpo, opciones) => solicitar('POST', ruta, { ...opciones, cuerpo }),
  put: (ruta, cuerpo, opciones) => solicitar('PUT', ruta, { ...opciones, cuerpo }),
  patch: (ruta, cuerpo, opciones) => solicitar('PATCH', ruta, { ...opciones, cuerpo }),
  delete: (ruta, opciones) => solicitar('DELETE', ruta, opciones),
};
