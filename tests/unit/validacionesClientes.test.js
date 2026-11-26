import { describe, expect, it } from 'vitest';
import {
  camposCambiadosTienda,
  cuerpoNuevaTienda,
  esLimiteValido,
  normalizarTelefono,
  validarRuta,
  validarTienda,
} from '../../src/utils/validacionesClientes.js';

describe('U18 normalizarTelefono', () => {
  it('acepta celular y fijo y los deja sin separadores', () => {
    expect(normalizarTelefono('0991234567').valor).toBe('0991234567');
    expect(normalizarTelefono('099 123 4567').valor).toBe('0991234567');
    expect(normalizarTelefono('(02) 234-5678').valor).toBe('022345678');
    expect(normalizarTelefono('05.234.5678').valor).toBe('052345678');
  });

  it('convierte +593 y 593 a formato nacional', () => {
    expect(normalizarTelefono('+593 99 123 4567').valor).toBe('0991234567');
    expect(normalizarTelefono('593991234567').valor).toBe('0991234567');
    expect(normalizarTelefono('+593 2 234 5678').valor).toBe('022345678');
  });

  it('rechaza vacíos, letras, otros países y largos incorrectos', () => {
    expect(normalizarTelefono('').error).toMatch(/obligatorio/);
    expect(normalizarTelefono('   ').error).toMatch(/obligatorio/);
    expect(normalizarTelefono(null).error).toMatch(/obligatorio/);
    expect(normalizarTelefono('09912ab567').error).toMatch(/solo puede contener/);
    expect(normalizarTelefono('+57 3001234567').error).toMatch(/\+593/);
    expect(normalizarTelefono('099123456').error).toMatch(/celular/);
    expect(normalizarTelefono('0891234567').error).toMatch(/celular/);
    expect(normalizarTelefono('0191234567').error).toMatch(/celular/);
    expect(normalizarTelefono('09912+34567').error).toBeTruthy();
  });
});

const valido = {
  nombre: 'Tienda La Esquina',
  contacto: 'Ana Pérez',
  telefono: '099 123 4567',
  direccion: 'Av. Principal 123',
  ruta_id: '',
  limite_credito: '150,50',
};

describe('U19 validarTienda / validarRuta / esLimiteValido', () => {
  it('una tienda correcta no tiene errores', () => {
    expect(validarTienda(valido)).toEqual({});
    expect(validarTienda({ ...valido, limite_credito: '0' })).toEqual({});
  });

  it('marca cada campo inválido con su límite', () => {
    const e = validarTienda({ nombre: 'A', contacto: ' ', telefono: '123', direccion: 'abc', limite_credito: '' });
    expect(Object.keys(e).sort()).toEqual(['contacto', 'direccion', 'limite_credito', 'nombre', 'telefono']);
    expect(validarTienda({ ...valido, nombre: 'x'.repeat(121) }).nombre).toMatch(/entre 2 y 120/);
    expect(validarTienda({ ...valido, contacto: 'x'.repeat(101) }).contacto).toMatch(/entre 2 y 100/);
    expect(validarTienda({ ...valido, direccion: 'x'.repeat(256) }).direccion).toMatch(/entre 5 y 255/);
  });

  it('esLimiteValido: cero sí; negativo, texto, 3 decimales o sobre el máximo no', () => {
    expect(esLimiteValido('0')).toBe(true);
    expect(esLimiteValido('99999999,99')).toBe(true);
    expect(esLimiteValido('10.5')).toBe(true);
    expect(esLimiteValido('-1')).toBe(false);
    expect(esLimiteValido('abc')).toBe(false);
    expect(esLimiteValido('1,234')).toBe(false);
    expect(esLimiteValido('100000000')).toBe(false);
    expect(esLimiteValido('')).toBe(false);
  });

  it('validarRuta: nombre de 2 a 80 y descripción hasta 255', () => {
    expect(validarRuta({ nombre: 'Norte', descripcion: '' })).toEqual({});
    expect(validarRuta({ nombre: 'N', descripcion: '' }).nombre).toBeTruthy();
    expect(validarRuta({ nombre: 'x'.repeat(81), descripcion: '' }).nombre).toBeTruthy();
    expect(validarRuta({ nombre: 'Norte', descripcion: 'x'.repeat(256) }).descripcion).toBeTruthy();
    expect(validarRuta({ nombre: 'Norte', descripcion: 'x'.repeat(255) })).toEqual({});
  });
});

describe('U20 camposCambiadosTienda', () => {
  const original = {
    nombre: 'Tienda La Esquina',
    contacto: 'Ana Pérez',
    telefono: '0991234567',
    direccion: 'Av. Principal 123',
    ruta_id: 3,
    limite_credito: 150.5,
  };
  const igual = { ...valido, ruta_id: '3' };

  it('sin cambios devuelve un objeto vacío (el teléfono se compara normalizado)', () => {
    expect(camposCambiadosTienda(original, igual)).toEqual({});
  });

  it('solo incluye los campos modificados, normalizados', () => {
    expect(
      camposCambiadosTienda(original, { ...igual, nombre: '  Nueva  ', telefono: '+593 98 765 4321', limite_credito: '200' }),
    ).toEqual({ nombre: 'Nueva', telefono: '0987654321', limite_credito: 200 });
  });

  it('"Sin ruta" envía ruta_id null y otra ruta su número', () => {
    expect(camposCambiadosTienda(original, { ...igual, ruta_id: '' })).toEqual({ ruta_id: null });
    expect(camposCambiadosTienda(original, { ...igual, ruta_id: '7' })).toEqual({ ruta_id: 7 });
    expect(camposCambiadosTienda({ ...original, ruta_id: null }, { ...igual, ruta_id: '' })).toEqual({});
  });

  it('cuerpoNuevaTienda omite ruta_id sin ruta', () => {
    expect(cuerpoNuevaTienda(valido)).toEqual({
      nombre: 'Tienda La Esquina',
      contacto: 'Ana Pérez',
      telefono: '0991234567',
      direccion: 'Av. Principal 123',
      limite_credito: 150.5,
    });
    expect(cuerpoNuevaTienda({ ...valido, ruta_id: '4' }).ruta_id).toBe(4);
  });
});
