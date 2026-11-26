import { describe, expect, it } from 'vitest';
import { textoContador, totalAlertas } from '../../src/utils/alertas.js';

describe('U17 alertas', () => {
  it('totalAlertas suma los tres totales y tolera nulos', () => {
    expect(totalAlertas({ stock_bajo: 2, por_vencer: 3, vencidos: 1 })).toBe(6);
    expect(totalAlertas({ stock_bajo: 2 })).toBe(2);
    expect(totalAlertas({ stock_bajo: null, por_vencer: undefined, vencidos: 'x' })).toBe(0);
    expect(totalAlertas(null)).toBe(0);
    expect(totalAlertas(undefined)).toBe(0);
  });

  it('textoContador en singular, plural y sin contador', () => {
    expect(textoContador(1)).toBe('1 alerta de inventario');
    expect(textoContador(3)).toBe('3 alertas de inventario');
    expect(textoContador(0)).toBe('');
  });
});
