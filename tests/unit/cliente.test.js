import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, construirQuery, registrarManejadorSesionInvalida, solicitar } from '../../src/services/api/cliente.js';
import { guardarSesion, leerSesion } from '../../src/services/almacenSesion.js';

function crearAlmacenFalso() {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    clear: () => datos.clear(),
  };
}

function respuesta(estado, cuerpo) {
  return { status: estado, json: async () => cuerpo };
}

describe('cliente HTTP', () => {
  let fetchFalso;

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', crearAlmacenFalso());
    fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);
    registrarManejadorSesionInvalida(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('U01: envía Bearer solo en peticiones autenticadas y con token', async () => {
    guardarSesion({ token: 'token-de-prueba', ultimaActividad: 1 });
    fetchFalso.mockResolvedValue(respuesta(200, { ok: true, data: {} }));

    await solicitar('GET', '/usuarios');
    expect(fetchFalso.mock.calls[0][1].headers.Authorization).toBe('Bearer token-de-prueba');

    await solicitar('POST', '/auth/login', { cuerpo: { a: 1 }, autenticado: false });
    const cabeceras = fetchFalso.mock.calls[1][1].headers;
    expect(cabeceras.Authorization).toBeUndefined();
    expect(cabeceras['Content-Type']).toBe('application/json');
  });

  it('U01b: sin token no envía Authorization', async () => {
    fetchFalso.mockResolvedValue(respuesta(200, { ok: true, data: [] }));
    await solicitar('GET', '/usuarios');
    expect(fetchFalso.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('devuelve data cuando ok es true y renueva la actividad', async () => {
    guardarSesion({ token: 't', ultimaActividad: 1 });
    fetchFalso.mockResolvedValue(respuesta(200, { ok: true, data: { x: 1 } }));
    await expect(solicitar('GET', '/algo')).resolves.toEqual({ x: 1 });
    expect(leerSesion().ultimaActividad).toBeGreaterThan(1);
  });

  it('un 503 autenticado no renueva la actividad, un 200 sí', async () => {
    guardarSesion({ token: 't', ultimaActividad: 1 });
    fetchFalso.mockResolvedValue(respuesta(503, { ok: false, codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'x' }));
    await expect(solicitar('GET', '/usuarios')).rejects.toMatchObject({ estado: 503 });
    expect(leerSesion().ultimaActividad).toBe(1);

    fetchFalso.mockResolvedValue(respuesta(200, { ok: true, data: [] }));
    await solicitar('GET', '/usuarios');
    expect(leerSesion().ultimaActividad).toBeGreaterThan(1);
  });

  it('U02: un 401 SESION_EXPIRADA autenticado llama al manejador', async () => {
    const manejador = vi.fn();
    registrarManejadorSesionInvalida(manejador);
    guardarSesion({ token: 't', ultimaActividad: 1 });
    fetchFalso.mockResolvedValue(respuesta(401, { ok: false, codigo: 'SESION_EXPIRADA', mensaje: 'x' }));

    await expect(solicitar('GET', '/usuarios')).rejects.toMatchObject({ estado: 401, codigo: 'SESION_EXPIRADA' });
    expect(manejador).toHaveBeenCalledWith('SESION_EXPIRADA');
    expect(leerSesion().ultimaActividad).toBe(1); // un 401 no renueva la actividad
  });

  it('U03: un 401 CREDENCIALES_INVALIDAS no llama al manejador', async () => {
    const manejador = vi.fn();
    registrarManejadorSesionInvalida(manejador);
    fetchFalso.mockResolvedValue(respuesta(401, { ok: false, codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'x' }));

    await expect(solicitar('POST', '/auth/login', { cuerpo: {}, autenticado: false })).rejects.toMatchObject({
      codigo: 'CREDENCIALES_INVALIDAS',
    });
    expect(manejador).not.toHaveBeenCalled();
  });

  it('U03b: un 403 ACCESO_DENEGADO no cierra la sesión', async () => {
    const manejador = vi.fn();
    registrarManejadorSesionInvalida(manejador);
    guardarSesion({ token: 't', ultimaActividad: 1 });
    fetchFalso.mockResolvedValue(respuesta(403, { ok: false, codigo: 'ACCESO_DENEGADO', mensaje: 'x' }));
    await expect(solicitar('GET', '/usuarios')).rejects.toMatchObject({ codigo: 'ACCESO_DENEGADO' });
    expect(manejador).not.toHaveBeenCalled();
  });

  it('U04: un fallo de red lanza RED con estado 0', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await solicitar('GET', '/usuarios').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ codigo: 'RED', estado: 0 });
  });

  it('U04b: tras 15 s sin respuesta lanza TIEMPO_AGOTADO', async () => {
    vi.useFakeTimers();
    fetchFalso.mockImplementation(
      (_url, { signal }) =>
        new Promise((_res, rej) => {
          signal.addEventListener('abort', () => rej(Object.assign(new Error('abortado'), { name: 'AbortError' })));
        }),
    );
    const promesa = solicitar('GET', '/usuarios').catch((e) => e);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await promesa).toMatchObject({ codigo: 'TIEMPO_AGOTADO', estado: 0 });
  });

  it('U05: una respuesta que no es JSON lanza RESPUESTA_INVALIDA', async () => {
    fetchFalso.mockResolvedValue({
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    await expect(solicitar('GET', '/usuarios')).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA', estado: 502 });
  });

  it('conserva errores por campo en el ApiError', async () => {
    fetchFalso.mockResolvedValue(
      respuesta(400, { ok: false, codigo: 'VALIDACION', mensaje: 'x', errores: [{ campo: 'nombre', mensaje: 'm' }] }),
    );
    const error = await solicitar('POST', '/usuarios', { cuerpo: {} }).catch((e) => e);
    expect(error.errores).toEqual([{ campo: 'nombre', mensaje: 'm' }]);
  });

  it('U06: la query omite valores vacíos', () => {
    expect(construirQuery({ rol: '', estado: undefined, buscar: null })).toBe('');
    expect(construirQuery({ rol: 'repartidor', estado: '', buscar: 'ana pérez' })).toBe(
      '?rol=repartidor&buscar=ana+p%C3%A9rez',
    );
  });
});
