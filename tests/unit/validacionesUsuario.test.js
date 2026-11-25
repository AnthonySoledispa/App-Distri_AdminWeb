import { describe, expect, it } from 'vitest';
import {
  bytesUtf8,
  camposCambiados,
  validarContrasena,
  validarCorreo,
  validarFormularioUsuario,
  validarNombre,
} from '../../src/utils/validacionesUsuario.js';

describe('validaciones de usuario (U07)', () => {
  it('nombre: 1 y 101 caracteres fallan; 2 pasa; se recorta con trim', () => {
    expect(validarNombre('a')).not.toBeNull();
    expect(validarNombre('a'.repeat(101))).not.toBeNull();
    expect(validarNombre('ab')).toBeNull();
    expect(validarNombre(' a ')).not.toBeNull();
    expect(validarNombre('a'.repeat(100))).toBeNull();
  });

  it('correo: formato y máximo de 150 caracteres', () => {
    expect(validarCorreo('')).not.toBeNull();
    expect(validarCorreo('sin-arroba')).not.toBeNull();
    expect(validarCorreo('a@b')).not.toBeNull();
    expect(validarCorreo('persona@dominio.com')).toBeNull();
    expect(validarCorreo(`${'a'.repeat(146)}@b.co`)).not.toBeNull();
    expect(validarCorreo(`${'a'.repeat(145)}@b.co`)).toBeNull();
  });

  it('contraseña: exige letra y número', () => {
    expect(validarContrasena('abcdefgh')).not.toBeNull();
    expect(validarContrasena('12345678')).not.toBeNull();
    expect(validarContrasena('abc12345')).toBeNull();
    expect(validarContrasena('abc1234')).not.toBeNull();
  });

  it('contraseña: límite de 72 bytes y "ñ" cuenta 2 bytes', () => {
    expect(bytesUtf8('ñ')).toBe(2);
    expect(validarContrasena(`a1${'b'.repeat(70)}`)).toBeNull(); // 72 bytes
    expect(validarContrasena(`a1${'b'.repeat(71)}`)).not.toBeNull(); // 73 bytes
    // 35 "ñ" = 70 bytes + "a1" = 72 → pasa; 36 "ñ" = 74 → falla
    expect(validarContrasena(`a1${'ñ'.repeat(35)}`)).toBeNull();
    expect(validarContrasena(`a1${'ñ'.repeat(36)}`)).not.toBeNull();
  });

  it('formulario: al crear exige contraseña y confirmación igual', () => {
    const base = { nombre: 'Ana Pérez', correo: 'ana@x.com', rol: 'repartidor', contrasena: '', confirmacion: '' };
    expect(validarFormularioUsuario(base)).toHaveProperty('contrasena');
    expect(validarFormularioUsuario({ ...base, contrasena: 'abc12345', confirmacion: 'abc12346' })).toHaveProperty(
      'confirmacion',
    );
    expect(validarFormularioUsuario({ ...base, contrasena: 'abc12345', confirmacion: 'abc12345' })).toEqual({});
  });

  it('formulario: al editar la contraseña es opcional y el rol bloqueado no se valida', () => {
    const base = { nombre: 'Ana Pérez', correo: 'ana@x.com', rol: '', contrasena: '', confirmacion: '' };
    expect(validarFormularioUsuario(base, { editando: true, rolBloqueado: true })).toEqual({});
    expect(validarFormularioUsuario({ ...base, contrasena: 'corta1' }, { editando: true, rolBloqueado: true })).toHaveProperty(
      'contrasena',
    );
  });
});

describe('camposCambiados', () => {
  const original = { nombre: 'Ana Pérez', correo: 'ana@x.com', rol: 'repartidor' };

  it('sin cambios devuelve un objeto vacío (se compara normalizado)', () => {
    expect(
      camposCambiados(original, { nombre: '  Ana Pérez ', correo: ' ANA@x.com', rol: 'repartidor', contrasena: '' }),
    ).toEqual({});
  });

  it('solo incluye los campos que cambiaron', () => {
    expect(
      camposCambiados(original, { nombre: 'Ana María', correo: 'ana@x.com', rol: 'repartidor', contrasena: '' }),
    ).toEqual({ nombre: 'Ana María' });
    expect(
      camposCambiados(original, { nombre: 'Ana Pérez', correo: 'ana@x.com', rol: 'administrador', contrasena: 'abc12345' }),
    ).toEqual({ rol: 'administrador', contrasena: 'abc12345' });
  });

  it('nunca envía el rol cuando está bloqueado', () => {
    expect(
      camposCambiados(original, { nombre: 'Ana Pérez', correo: 'ana@x.com', rol: 'administrador', contrasena: '' }, { rolBloqueado: true }),
    ).toEqual({});
  });
});
