import { describe, expect, it } from 'vitest';
import { CODIGOS_CLIENTES, CODIGOS_INVENTARIO, MENSAJES, mensajeError, mensajeLogin, mensajeSesionInvalida } from '../../src/utils/mensajesError.js';

describe('mensajes de login (U08)', () => {
  it('cada código tiene su texto', () => {
    expect(mensajeLogin({ estado: 401, codigo: 'CREDENCIALES_INVALIDAS' })).toBe('Correo o contraseña incorrectos.');
    expect(mensajeLogin({ estado: 403, codigo: 'USUARIO_INACTIVO' })).toBe('Usuario desactivado. Contacte al administrador.');
    expect(mensajeLogin({ estado: 403, codigo: 'CLIENTE_NO_PERMITIDO' })).toBe(MENSAJES.CLIENTE_NO_PERMITIDO);
    expect(mensajeLogin({ codigo: 'RED', estado: 0 })).toBe(MENSAJES.CONEXION);
    expect(mensajeLogin({ codigo: 'TIEMPO_AGOTADO', estado: 0 })).toBe(MENSAJES.CONEXION);
    expect(mensajeLogin({ estado: 503, codigo: 'BD_NO_DISPONIBLE' })).toBe(MENSAJES.SERVICIO_NO_DISPONIBLE);
    expect(mensajeLogin({ estado: 500, codigo: 'ERROR_INTERNO' })).toBe(MENSAJES.SERVICIO_NO_DISPONIBLE);
  });

  it('el 429 usa el mensaje del backend o, si falta, el texto propio', () => {
    expect(mensajeLogin({ estado: 429, codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Intente en 15 minutos.' })).toBe(
      'Intente en 15 minutos.',
    );
    expect(mensajeLogin({ estado: 429, codigo: 'DEMASIADOS_INTENTOS' })).toBe(MENSAJES.DEMASIADOS_INTENTOS);
  });

  it('un código desconocido da el texto genérico', () => {
    expect(mensajeLogin({ estado: 418, codigo: 'RARO' })).toBe(MENSAJES.GENERICO);
    expect(mensajeError({ estado: 418, codigo: 'RARO' })).toBe(MENSAJES.GENERICO);
    expect(mensajeLogin(null)).toBe(MENSAJES.GENERICO);
  });
});

describe('mensajes dentro del panel', () => {
  it('traduce los códigos conocidos', () => {
    expect(mensajeError({ codigo: 'ACCESO_DENEGADO' })).toBe('No tiene permisos para realizar esta acción.');
    expect(mensajeError({ codigo: 'CORREO_DUPLICADO' })).toBe('Ya existe un usuario con ese correo.');
    expect(mensajeError({ codigo: 'USUARIO_NO_ENCONTRADO' })).toBe('El usuario ya no existe.');
    expect(mensajeError({ codigo: 'OPERACION_NO_PERMITIDA', mensaje: 'No puede desactivarse.' })).toBe(
      'No puede desactivarse.',
    );
    expect(mensajeError({ codigo: 'RED', estado: 0 })).toBe(MENSAJES.CONEXION);
  });
});

describe('mensaje al perder la sesión', () => {
  const minuto = 60_000;
  it('SESION_EXPIRADA tras superar la inactividad habla de inactividad', () => {
    const ahora = 100 * minuto;
    expect(
      mensajeSesionInvalida('SESION_EXPIRADA', { ultimaActividad: ahora - 31 * minuto, inactividadMinutos: 30, ahora }),
    ).toBe(MENSAJES.INACTIVIDAD);
  });

  it('SESION_EXPIRADA sin inactividad cumplida y otros códigos dan el mensaje de sesión cerrada', () => {
    const ahora = 100 * minuto;
    expect(
      mensajeSesionInvalida('SESION_EXPIRADA', { ultimaActividad: ahora - 2 * minuto, inactividadMinutos: 30, ahora }),
    ).toBe(MENSAJES.SESION_CERRADA);
    expect(mensajeSesionInvalida('SESION_CERRADA')).toBe(MENSAJES.SESION_CERRADA);
    expect(mensajeSesionInvalida('TOKEN_INVALIDO')).toBe(MENSAJES.SESION_CERRADA);
  });
});

describe('U15 mensajes del Módulo 2', () => {
  it('cada código nuevo tiene texto en español', () => {
    expect(CODIGOS_INVENTARIO.length).toBe(21);
    for (const codigo of CODIGOS_INVENTARIO) {
      const texto = mensajeError({ estado: 409, codigo });
      expect(texto, codigo).toBe(MENSAJES[codigo]);
      expect(texto, codigo).not.toBe(MENSAJES.GENERICO);
    }
    expect(mensajeError({ estado: 409, codigo: 'SKU_DUPLICADO' })).toBe('Ya existe un producto con ese SKU.');
  });

  it('STOCK_INSUFICIENTE incluye el disponible de detalles', () => {
    const e = { estado: 409, codigo: 'STOCK_INSUFICIENTE', mensaje: 'Stock insuficiente. Disponible: 4 caja.', detalles: { disponible: 4 } };
    expect(mensajeError(e)).toContain('Disponible: 4');
    expect(mensajeError({ ...e, detalles: null })).toBe('Stock insuficiente. Disponible: 4 caja.');
    expect(mensajeError({ estado: 409, codigo: 'STOCK_INSUFICIENTE' })).toBe(MENSAJES.STOCK_INSUFICIENTE);
  });

  it('un código desconocido da el texto genérico', () => {
    expect(mensajeError({ estado: 409, codigo: 'NO_EXISTE_ESTE' })).toBe(MENSAJES.GENERICO);
  });
});

describe('U15 mensajes del Módulo 3', () => {
  it('cada código de clientes y rutas tiene texto en español', () => {
    expect(CODIGOS_CLIENTES.length).toBe(8);
    for (const codigo of CODIGOS_CLIENTES) {
      const texto = mensajeError({ estado: 409, codigo });
      expect(texto, codigo).toBe(MENSAJES[codigo]);
      expect(texto, codigo).not.toBe(MENSAJES.GENERICO);
    }
    expect(mensajeError({ estado: 404, codigo: 'CLIENTE_NO_ENCONTRADO' })).toBe('La tienda no existe.');
    expect(mensajeError({ estado: 409, codigo: 'RUTA_EN_USO' })).toContain('tiendas activas');
  });
});
