import { describe, expect, it } from 'vitest';
import {
  camposCambiadosProducto,
  esCantidadValida,
  motivosParaTipo,
  parsearCantidad,
  validarAjuste,
  validarCategoria,
  validarEntrada,
  validarProducto,
  validarUnidad,
} from '../../src/utils/validacionesInventario.js';

const HOY = '2026-11-25';
const base = {
  nombre: 'Helado de vainilla',
  sku: '',
  descripcion: '',
  categoria_id: '1',
  unidad_id: '1',
  precio_venta: '12,50',
  stock_minimo: '5',
};

describe('U09 validarProducto', () => {
  const v = (cambios, opciones = {}) => validarProducto({ ...base, ...cambios }, { hoy: HOY, ...opciones });

  it('valida el nombre entre 2 y 120', () => {
    expect(v({ nombre: 'A' }).nombre).toBeTruthy();
    expect(v({ nombre: 'A'.repeat(121) }).nombre).toBeTruthy();
    expect(v({ nombre: 'Ab' }).nombre).toBeUndefined();
  });

  it('el SKU es opcional, sin espacios y de hasta 50', () => {
    expect(v({ sku: '' }).sku).toBeUndefined();
    expect(v({ sku: 'AB 12' }).sku).toBeTruthy();
    expect(v({ sku: 'A'.repeat(51) }).sku).toBeTruthy();
    expect(v({ sku: 'HEL-001' }).sku).toBeUndefined();
  });

  it('descripción de 256 falla', () => {
    expect(v({ descripcion: 'a'.repeat(256) }).descripcion).toBeTruthy();
    expect(v({ descripcion: 'a'.repeat(255) }).descripcion).toBeUndefined();
  });

  it('precio: vacío, 0, negativo y 3 decimales fallan; "12,50" pasa', () => {
    expect(v({ precio_venta: '' }).precio_venta).toBeTruthy();
    expect(v({ precio_venta: '0' }).precio_venta).toBeTruthy();
    expect(v({ precio_venta: '-1' }).precio_venta).toBeTruthy();
    expect(v({ precio_venta: '1,234' }).precio_venta).toBeTruthy();
    expect(v({ precio_venta: '12,50' }).precio_venta).toBeUndefined();
  });

  it('stock mínimo negativo falla y 0 pasa', () => {
    expect(v({ stock_minimo: '-1' }).stock_minimo).toBeTruthy();
    expect(v({ stock_minimo: '0' }).stock_minimo).toBeUndefined();
  });

  it('el stock mínimo respeta la unidad', () => {
    expect(v({ stock_minimo: '1,5' }, { permiteDecimales: false }).stock_minimo).toBeTruthy();
    expect(v({ stock_minimo: '1,5' }, { permiteDecimales: true }).stock_minimo).toBeUndefined();
  });

  it('exige categoría y unidad', () => {
    const e = v({ categoria_id: '', unidad_id: '' });
    expect(e.categoria_id).toBeTruthy();
    expect(e.unidad_id).toBeTruthy();
  });

  it('con lotes y stock inicial > 0 exige código y caducidad (solo al crear)', () => {
    const conLotes = { creando: true, controlaLotes: true };
    const e = v({ stock_inicial: '10', fecha: HOY, codigo_lote: '', fecha_caducidad: '' }, conLotes);
    expect(e.codigo_lote).toBeTruthy();
    expect(e.fecha_caducidad).toBeTruthy();
    expect(v({ stock_inicial: '0', fecha: HOY }, conLotes).codigo_lote).toBeUndefined();
    expect(v({ stock_inicial: '', fecha: HOY }, conLotes).codigo_lote).toBeUndefined();
    const ok = v({ stock_inicial: '10', fecha: HOY, codigo_lote: 'L1', fecha_caducidad: '2026-12-01' }, conLotes);
    expect(ok).toEqual({});
    expect(v({ stock_inicial: '10', fecha: HOY, codigo_lote: 'L1', fecha_caducidad: '2026-11-24' }, conLotes).fecha_caducidad).toBeTruthy();
    // Al editar no se pide lote.
    expect(validarProducto(base, { creando: false, controlaLotes: true, hoy: HOY })).toEqual({});
  });
});

describe('U10 validarEntrada', () => {
  const e = (cambios, opciones = {}) =>
    validarEntrada({ cantidad: '5', fecha: HOY, observacion: '', ...cambios }, { hoy: HOY, ...opciones });

  it('rechaza cantidades inválidas', () => {
    for (const c of ['0', '-1', '1e3', 'abc', '']) expect(e({ cantidad: c }).cantidad).toBeTruthy();
    expect(e({ cantidad: '1,2345' }).cantidad).toBeTruthy();
  });

  it('1,5 falla con unidad entera y pasa con decimal; acepta coma o punto', () => {
    expect(e({ cantidad: '1,5' }, { permiteDecimales: false }).cantidad).toBeTruthy();
    expect(e({ cantidad: '1,5' }, { permiteDecimales: true }).cantidad).toBeUndefined();
    expect(e({ cantidad: '1.5' }, { permiteDecimales: true }).cantidad).toBeUndefined();
  });

  it('la fecha futura falla', () => {
    expect(e({ fecha: '2026-11-26' }).fecha).toBeTruthy();
    expect(e({ fecha: '2026-02-30' }).fecha).toBeTruthy();
    expect(e({ fecha: HOY }).fecha).toBeUndefined();
  });

  it('lote y caducidad solo se exigen si controla lotes', () => {
    expect(e({}).codigo_lote).toBeUndefined();
    const c = e({ codigo_lote: '', fecha_caducidad: '' }, { controlaLotes: true });
    expect(c.codigo_lote).toBeTruthy();
    expect(c.fecha_caducidad).toBeTruthy();
    expect(e({ codigo_lote: 'L1', fecha_caducidad: '2026-11-24' }, { controlaLotes: true }).fecha_caducidad).toBeTruthy();
    expect(e({ codigo_lote: 'L1', fecha_caducidad: HOY }, { controlaLotes: true })).toEqual({});
  });
});

describe('U11 validarAjuste', () => {
  const a = (cambios, opciones = {}) =>
    validarAjuste({ tipo: 'disminucion', motivo: 'merma', cantidad: '2', observacion: '', lote_id: '', ...cambios }, { stock: 10, ...opciones });

  it('el motivo es obligatorio', () => {
    expect(a({ motivo: '' }).motivo).toBeTruthy();
  });

  it('"otro" y "corrección" exigen observación', () => {
    expect(a({ motivo: 'otro' }).observacion).toBeTruthy();
    expect(a({ motivo: 'correccion' }).observacion).toBeTruthy();
    expect(a({ motivo: 'otro', observacion: 'conteo' }).observacion).toBeUndefined();
  });

  it('disminuir más que el stock o que el lote falla', () => {
    expect(a({ cantidad: '11' }).cantidad).toBeTruthy();
    expect(a({ cantidad: '10' }).cantidad).toBeUndefined();
    const lote = { controlaLotes: true, disponibleLote: 3 };
    expect(a({ cantidad: '4', lote_id: '7' }, lote).cantidad).toBeTruthy();
    expect(a({ cantidad: '3', lote_id: '7' }, lote).cantidad).toBeUndefined();
    expect(a({ cantidad: '1', lote_id: '' }, lote).lote_id).toBeTruthy();
  });

  it('aumentar con daño, pérdida, merma o caducidad falla; con corrección u otro pasa', () => {
    for (const m of ['danio', 'perdida', 'merma', 'caducidad']) {
      expect(a({ tipo: 'aumento', motivo: m }).motivo).toBeTruthy();
    }
    expect(a({ tipo: 'aumento', motivo: 'correccion', observacion: 'x', cantidad: '50' })).toEqual({});
    expect(a({ tipo: 'aumento', motivo: 'otro', observacion: 'x' })).toEqual({});
  });

  it('motivosParaTipo limita los motivos al aumentar', () => {
    expect(motivosParaTipo('aumento').map((m) => m.valor)).toEqual(['correccion', 'otro']);
    expect(motivosParaTipo('disminucion')).toHaveLength(6);
  });
});

describe('U12 validarUnidad y validarCategoria', () => {
  it('unidad: límites de nombre y abreviatura, y booleano', () => {
    expect(validarUnidad({ nombre: 'A', abreviatura: 'a' }).nombre).toBeTruthy();
    expect(validarUnidad({ nombre: 'A'.repeat(51), abreviatura: 'a' }).nombre).toBeTruthy();
    expect(validarUnidad({ nombre: 'Litro', abreviatura: '' }).abreviatura).toBeTruthy();
    expect(validarUnidad({ nombre: 'Litro', abreviatura: 'A'.repeat(11) }).abreviatura).toBeTruthy();
    expect(validarUnidad({ nombre: 'Litro', abreviatura: 'L', permite_decimales: true })).toEqual({});
    expect(validarUnidad({ nombre: 'Litro', abreviatura: 'L', permite_decimales: 'si' }).permite_decimales).toBeTruthy();
  });

  it('categoría: límites de nombre y descripción, y booleano', () => {
    expect(validarCategoria({ nombre: 'A' }).nombre).toBeTruthy();
    expect(validarCategoria({ nombre: 'A'.repeat(81) }).nombre).toBeTruthy();
    expect(validarCategoria({ nombre: 'Helados', descripcion: 'a'.repeat(256) }).descripcion).toBeTruthy();
    expect(validarCategoria({ nombre: 'Helados', descripcion: '', controla_lotes: false })).toEqual({});
    expect(validarCategoria({ nombre: 'Helados', controla_lotes: 1 }).controla_lotes).toBeTruthy();
  });
});

describe('U13 camposCambiadosProducto', () => {
  const original = {
    nombre: 'Helado',
    sku: 'H-1',
    descripcion: null,
    categoria_id: 1,
    unidad_id: 2,
    precio_venta: 12.5,
    stock_minimo: 5,
  };
  const valores = {
    nombre: 'Helado',
    sku: 'H-1',
    descripcion: '',
    categoria_id: '1',
    unidad_id: '2',
    precio_venta: '12.50',
    stock_minimo: '5',
  };

  it('no cuenta como cambio un número equivalente ni un texto igual', () => {
    expect(camposCambiadosProducto(original, valores)).toEqual({});
    expect(camposCambiadosProducto(original, { ...valores, precio_venta: '12,5' })).toEqual({});
  });

  it('devuelve solo lo cambiado y recorta el nombre', () => {
    const c = camposCambiadosProducto(original, { ...valores, nombre: '  Helado XL  ', precio_venta: '13', categoria_id: '3' });
    expect(c).toEqual({ nombre: 'Helado XL', precio_venta: 13, categoria_id: 3 });
  });

  it('vaciar el SKU envía null y la descripción nueva se envía', () => {
    expect(camposCambiadosProducto(original, { ...valores, sku: '  ', descripcion: 'Nuevo' })).toEqual({
      sku: null,
      descripcion: 'Nuevo',
    });
  });
});

describe('parsearCantidad', () => {
  it('normaliza coma o punto y rechaza formatos raros', () => {
    expect(parsearCantidad('2,5').valor).toBe(2.5);
    expect(parsearCantidad('2.5').valor).toBe(2.5);
    expect(esCantidadValida('1e3')).toBe(false);
    expect(esCantidadValida('-2')).toBe(false);
    expect(esCantidadValida('1.2.3')).toBe(false);
    expect(esCantidadValida('0', { permitirCero: true })).toBe(true);
    expect(esCantidadValida('1,5', { decimales: false })).toBe(false);
    expect(esCantidadValida('2,00', { decimales: false })).toBe(true);
  });
});
