import { describe, expect, it } from 'vitest';
import { formatearCantidad, formatearDia, formatearMoneda, hoyLocalISO } from '../../src/utils/formato.js';

describe('U14 formato', () => {
  it('moneda USD en es-EC', () => {
    expect(formatearMoneda(12.5).replace(/\s/g, '')).toBe('$12,50');
    expect(formatearMoneda(0).replace(/\s/g, '')).toBe('$0,00');
    expect(formatearMoneda(null)).toBe('—');
  });

  it('cantidad con coma decimal y abreviatura', () => {
    expect(formatearCantidad(2.5, 'L')).toBe('2,5 L');
    expect(formatearCantidad(12, 'caja')).toBe('12 caja');
    expect(formatearCantidad(3)).toBe('3');
    expect(formatearCantidad(undefined, 'L')).toBe('—');
  });

  it('formatearDia no desfasa el día ni usa Date', () => {
    expect(formatearDia('2026-11-25')).toBe('25/11/2026');
    expect(formatearDia('2026-01-01')).toBe('01/01/2026');
    expect(formatearDia('2026-12-31T00:00:00.000Z')).toBe('31/12/2026');
    expect(formatearDia(null)).toBe('—');
    expect(formatearDia('basura')).toBe('—');
  });

  it('hoyLocalISO usa la fecha local con formato AAAA-MM-DD', () => {
    expect(hoyLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(hoyLocalISO(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
    expect(hoyLocalISO(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
