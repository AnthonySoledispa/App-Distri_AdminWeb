import { test, expect } from '@playwright/test';
import { API, entrarComoAdmin, hayCredenciales, iniciarSesionUI } from './credenciales.js';
import {
  crearCategoriaApi,
  crearProductoApi,
  crearUnidadApi,
  datosBase,
  diaNegocio,
  estadoCategoriaApi,
  estadoProductoApi,
  estadoUnidadApi,
  marca,
  tokenAdmin,
} from './datosInventario.js';

test.describe.configure({ mode: 'serial' });

const fila = (page, texto) => page.getByRole('row').filter({ hasText: texto });

async function irAProductos(page, request, consulta = '') {
  await entrarComoAdmin(page, request, `/productos${consulta}`);
  await expect(page.getByRole('button', { name: 'Nuevo producto' })).toBeVisible();
}

async function llenarProducto(dialogo, { nombre, categoria, unidad, precio = '12,50', minimo = '5', sku }) {
  await dialogo.getByLabel('Nombre', { exact: true }).fill(nombre);
  if (sku !== undefined) await dialogo.getByLabel('SKU (opcional)').fill(sku);
  if (categoria) await dialogo.getByLabel('Categoría').selectOption({ label: categoria.nombre });
  if (unidad) await dialogo.getByLabel('Unidad').selectOption({ label: unidad.nombre });
  await dialogo.getByLabel('Precio de venta (USD)').fill(precio);
  await dialogo.getByLabel('Stock mínimo').fill(minimo);
}

test.describe('Navegación del Módulo 2', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test('W33: Inicio muestra "2 de 8 disponibles" y "Gestionar productos" lleva a /productos', async ({ page, request }) => {
    await entrarComoAdmin(page, request);
    await expect(page.getByText('2 de 8 disponibles')).toBeVisible();
    await page.getByRole('link', { name: 'Gestionar productos' }).click();
    await expect(page).toHaveURL(/\/productos$/);
    await expect(page.getByRole('button', { name: 'Nuevo producto' })).toBeVisible();
  });

  test('W34: /productos sin sesión lleva al login y, tras entrar, vuelve a /productos', async ({ page }) => {
    await page.goto('/productos');
    await expect(page).toHaveURL(/\/login$/);
    await iniciarSesionUI(page);
    await expect(page).toHaveURL(/\/productos$/);
    await expect(page.getByRole('button', { name: 'Nuevo producto' })).toBeVisible();
  });

  test('W35: subnavegación con 4 enlaces, aria-current correcto y títulos de página', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const producto = await crearProductoApi(request, token, { categoria, unidad });
    await irAProductos(page, request);

    const sub = page.getByRole('navigation', { name: 'Secciones de productos' });
    await expect(sub.getByRole('link')).toHaveCount(4);
    const casos = [
      ['/productos', 'Productos', 'Productos | DistriGO'],
      ['/productos/movimientos', 'Movimientos', 'Movimientos de inventario | DistriGO'],
      ['/productos/alertas', 'Alertas', 'Alertas de inventario | DistriGO'],
      ['/productos/categorias', 'Categorías y unidades', 'Categorías y unidades | DistriGO'],
      [`/productos/${producto.id}`, null, 'Producto | DistriGO'],
    ];
    for (const [ruta, nombre, titulo] of casos) {
      await page.goto(ruta);
      await expect(page).toHaveTitle(titulo);
      const actuales = sub.locator('[aria-current="page"]');
      if (nombre) {
        await expect(actuales).toHaveCount(1);
        await expect(actuales).toContainText(nombre);
      } else {
        await expect(actuales).toHaveCount(0);
      }
    }
  });
});

test.describe('Productos (RF-09, RF-11, RF-14, RF-15)', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test('W39: crear producto sin stock inicial muestra stock 0, precio en moneda y "Stock bajo"', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const nombre = `E2E Prod ${marca()}`;
    await irAProductos(page, request);

    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo producto' });
    await llenarProducto(dialogo, { nombre, categoria, unidad });
    await dialogo.getByRole('button', { name: 'Crear producto' }).click();

    await expect(page.getByText('Producto creado')).toBeVisible();
    const f = fila(page, nombre);
    await expect(f).toContainText(`0 ${unidad.abreviatura}`);
    await expect(f).toContainText('$12,50');
    await expect(f).toContainText('Stock bajo');
    await expect(f).toContainText(categoria.nombre);
  });

  test('W40: la validación local impide enviar y no hace ninguna petición POST', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    await irAProductos(page, request);
    const posts = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/productos')) posts.push(r.url());
    });

    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo producto' });
    const crear = dialogo.getByRole('button', { name: 'Crear producto' });
    await dialogo.getByLabel('Nombre', { exact: true }).fill('E2E Local');
    await dialogo.getByLabel('Categoría').selectOption({ label: categoria.nombre });
    await dialogo.getByLabel('Unidad').selectOption({ label: unidad.nombre });
    const precio = dialogo.getByLabel('Precio de venta (USD)');

    await precio.fill('');
    await crear.click();
    await expect(dialogo.getByText('Este campo es obligatorio.').first()).toBeVisible();

    await precio.fill('-3');
    await crear.click();
    await expect(precio).toHaveAttribute('aria-invalid', 'true');

    await precio.fill('1,234');
    await crear.click();
    await expect(dialogo.getByText('El precio de venta admite como máximo 2 decimales.')).toBeVisible();

    await precio.fill('5');
    await dialogo.getByLabel('Stock mínimo').fill('-1');
    await crear.click();
    await expect(dialogo.getByLabel('Stock mínimo')).toHaveAttribute('aria-invalid', 'true');

    await dialogo.getByLabel('Stock mínimo').fill('1');
    await dialogo.getByLabel('Categoría').selectOption({ label: 'Seleccione…' });
    await crear.click();
    await expect(dialogo.getByText('Seleccione una categoría.')).toBeVisible();

    expect(posts).toHaveLength(0);
  });

  test('W41: los selects de categoría y unidad solo ofrecen elementos activos', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const activa = await crearCategoriaApi(request, token);
    const inactiva = await crearCategoriaApi(request, token);
    await estadoCategoriaApi(request, token, inactiva.id, 'inactivo');
    const unidadActiva = await crearUnidadApi(request, token);
    const unidadInactiva = await crearUnidadApi(request, token);
    await estadoUnidadApi(request, token, unidadInactiva.id, 'inactivo');
    await irAProductos(page, request);

    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo producto' });
    const categorias = await dialogo.getByLabel('Categoría').locator('option').allTextContents();
    const unidades = await dialogo.getByLabel('Unidad').locator('option').allTextContents();
    expect(categorias).toContain(activa.nombre);
    expect(categorias).not.toContain(inactiva.nombre);
    expect(unidades).toContain(unidadActiva.nombre);
    expect(unidades).not.toContain(unidadInactiva.nombre);
  });

  test('W42: un nombre de producto duplicado se muestra en el campo nombre (409 real)', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const existente = await crearProductoApi(request, token, { categoria, unidad });
    await irAProductos(page, request);

    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo producto' });
    await llenarProducto(dialogo, { nombre: existente.nombre, categoria, unidad });
    await dialogo.getByRole('button', { name: 'Crear producto' }).click();
    await expect(dialogo.getByText('Ya existe un producto con ese nombre.')).toBeVisible();
    await expect(dialogo.getByLabel('Nombre', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  });

  test('W43: producto con stock inicial en categoría con lotes pide lote y caducidad; la ficha lo refleja', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token, { lotes: true });
    const nombre = `E2E Lotes ${marca()}`;
    const caducidad = diaNegocio(40);
    await irAProductos(page, request);

    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo producto' });
    await llenarProducto(dialogo, { nombre, categoria, unidad });
    await expect(dialogo.getByLabel('Código de lote')).toHaveCount(0);
    await dialogo.getByLabel('Stock inicial (opcional)').fill('10');
    await expect(dialogo.getByLabel('Código de lote')).toBeVisible();
    await expect(dialogo.getByLabel('Fecha de caducidad')).toBeVisible();

    await dialogo.getByRole('button', { name: 'Crear producto' }).click();
    await expect(dialogo.getByText('El código de lote es obligatorio.')).toBeVisible();

    await dialogo.getByLabel('Código de lote').fill('L-INI');
    await dialogo.getByLabel('Fecha de caducidad').fill(caducidad);
    await dialogo.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page.getByText('Producto creado')).toBeVisible();

    await fila(page, nombre).getByRole('link', { name: nombre }).click();
    await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
    const lotes = page.getByRole('table', { name: 'Lotes del producto' });
    await expect(lotes).toContainText('L-INI');
    await expect(lotes).toContainText('Vigente');
    const historial = page.getByRole('table', { name: 'Historial de movimientos de inventario' });
    await expect(historial).toContainText('Entrada');
    await expect(historial).toContainText('Stock inicial');
    await expect(historial).toContainText('L-INI');
  });

  test('W44: filtros en la URL (buscar, categoría, estado, stock bajo), limpiar y estado vacío', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const bajo = await crearProductoApi(request, token, { categoria, unidad, stock_minimo: 5 });
    const normal = await crearProductoApi(request, token, { categoria, unidad, stock_minimo: 0, stock_inicial: 3 });
    const inactivo = await crearProductoApi(request, token, { categoria, unidad });
    await estadoProductoApi(request, token, inactivo.id, 'inactivo');
    await irAProductos(page, request);

    await page.getByLabel('Categoría').selectOption({ label: categoria.nombre });
    await expect(page).toHaveURL(new RegExp(`categoria_id=${categoria.id}`));
    await expect(fila(page, bajo.nombre)).toBeVisible();
    await expect(fila(page, normal.nombre)).toBeVisible();

    await page.getByLabel('Estado', { exact: true }).selectOption('inactivo');
    await expect(page).toHaveURL(/estado=inactivo/);
    await expect(fila(page, inactivo.nombre)).toBeVisible();
    await expect(fila(page, bajo.nombre)).toHaveCount(0);

    await page.getByLabel('Estado', { exact: true }).selectOption('activo');
    // El estado de la casilla viene de la URL: se espera a que React lo refleje.
    await page.getByLabel('Solo stock bajo').click();
    await expect(page.getByLabel('Solo stock bajo')).toBeChecked();
    await expect(page).toHaveURL(/stock_bajo=true/);
    await expect(fila(page, bajo.nombre)).toBeVisible();
    await expect(fila(page, normal.nombre)).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).not.toHaveURL(/categoria_id=|estado=|stock_bajo=/);

    await page.getByLabel('Buscar por nombre o SKU').fill(normal.nombre);
    await expect(page).toHaveURL(/buscar=/);
    await expect(fila(page, normal.nombre)).toBeVisible();
    await expect(fila(page, bajo.nombre)).toHaveCount(0);

    await page.getByLabel('Buscar por nombre o SKU').fill('zzz-no-existe-xyz');
    await expect(page.getByText('No hay productos que coincidan con los filtros.')).toBeVisible();
  });

  test('W45: editar envía solo los campos cambiados; sin cambios no hay PUT; sin campo de stock', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const producto = await crearProductoApi(request, token, { categoria, unidad, precio_venta: 10 });
    await irAProductos(page, request, `?buscar=${encodeURIComponent(producto.nombre)}`);
    const puts = [];
    page.on('request', (r) => {
      if (r.method() === 'PUT') puts.push(r);
    });

    await fila(page, producto.nombre).getByRole('button', { name: `Editar ${producto.nombre}` }).click();
    const dialogo = page.getByRole('dialog', { name: 'Editar producto' });
    await expect(dialogo.getByLabel('Stock inicial (opcional)')).toHaveCount(0);
    await expect(dialogo).toContainText('El stock cambia solo con entradas y ajustes.');

    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialogo.getByText('No hay cambios para guardar.')).toBeVisible();
    expect(puts).toHaveLength(0);

    await dialogo.getByLabel('Precio de venta (USD)').fill('15');
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Producto actualizado')).toBeVisible();
    expect(puts).toHaveLength(1);
    expect(puts[0].postDataJSON()).toEqual({ precio_venta: 15 });
    await expect(fila(page, producto.nombre)).toContainText('$15,00');
  });

  test('W54: el aviso de stock bajo enlaza con Alertas', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    await crearProductoApi(request, token, { categoria, unidad, stock_minimo: 5 });
    await irAProductos(page, request);

    const aviso = page.getByRole('status').filter({ hasText: 'con stock igual o menor al mínimo' });
    await expect(aviso).toBeVisible();
    await aviso.getByRole('link', { name: 'Ver alertas' }).click();
    await expect(page).toHaveURL(/\/productos\/alertas$/);
  });

  test('W55: eliminar solo sin movimientos; con movimientos no hay botón; 409 simulado muestra RB-05', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const libre = await crearProductoApi(request, token, { categoria, unidad });
    const usado = await crearProductoApi(request, token, { categoria, unidad, stock_inicial: 3 });
    const simulado = await crearProductoApi(request, token, { categoria, unidad });
    await irAProductos(page, request);

    await expect(fila(page, usado.nombre)).toBeVisible();
    await expect(fila(page, usado.nombre).getByRole('button', { name: `Eliminar ${usado.nombre}` })).toHaveCount(0);

    await fila(page, libre.nombre).getByRole('button', { name: `Eliminar ${libre.nombre}` }).click();
    const confirmar = page.getByRole('dialog', { name: 'Eliminar producto' });
    await expect(confirmar).toContainText(`¿Eliminar ${libre.nombre}? Esta acción no se puede deshacer.`);
    await confirmar.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Producto eliminado')).toBeVisible();
    await expect(fila(page, libre.nombre)).toHaveCount(0);

    await page.route(/\/api\/productos\/\d+$/, (ruta) => {
      if (ruta.request().method() !== 'DELETE') return ruta.fallback();
      return ruta.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, codigo: 'PRODUCTO_CON_MOVIMIENTOS', mensaje: 'x' }),
      });
    });
    await fila(page, simulado.nombre).getByRole('button', { name: `Eliminar ${simulado.nombre}` }).click();
    await page.getByRole('dialog', { name: 'Eliminar producto' }).getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('El producto tiene movimientos de inventario; solo puede desactivarse.')).toBeVisible();
  });

  test('W56: desactivar con stock menciona el stock; queda Inactivo y "Entrada" deshabilitado', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const producto = await crearProductoApi(request, token, { categoria, unidad, stock_inicial: 4 });
    await irAProductos(page, request, `?buscar=${encodeURIComponent(producto.nombre)}`);

    await fila(page, producto.nombre).getByRole('button', { name: `Desactivar ${producto.nombre}` }).click();
    const confirmar = page.getByRole('dialog', { name: 'Desactivar producto' });
    await expect(confirmar).toContainText(`Aún tiene 4 ${unidad.abreviatura} en bodega.`);
    await confirmar.getByRole('button', { name: 'Desactivar' }).click();
    await expect(page.getByText('Producto desactivado')).toBeVisible();
    await expect(fila(page, producto.nombre)).toContainText('Inactivo');
    await expect(fila(page, producto.nombre).getByRole('button', { name: /^Entrada de/ })).toBeDisabled();
  });

  test('W57: un 503 en la lista muestra "Reintentar"; una ficha inexistente o no numérica avisa', async ({ page, request }) => {
    await entrarComoAdmin(page, request, '/usuarios');
    await page.route(/\/api\/productos(\?.*)?$/, (ruta) =>
      ruta.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, codigo: 'BD_NO_DISPONIBLE', mensaje: 'x' }),
      }),
    );
    await page.goto('/productos');
    await expect(page.getByText('El servicio no está disponible en este momento. Intente más tarde.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await page.unroute(/\/api\/productos(\?.*)?$/);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);

    for (const id of ['999999', 'abc']) {
      await page.goto(`/productos/${id}`);
      await expect(page.getByText('El producto no existe o fue eliminado.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Volver a productos' })).toBeVisible();
    }
  });

  test('W60: SKU visible bajo el nombre, único sin importar mayúsculas, buscable y se puede vaciar', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const m = marca();
    const sku = `sku-${m}`;
    const nombre = `E2E Sku ${m}`;
    await irAProductos(page, request);

    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo producto' });
    await llenarProducto(dialogo, { nombre, categoria, unidad, sku });
    await dialogo.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page.getByText('Producto creado')).toBeVisible();
    await expect(fila(page, nombre)).toContainText(sku);

    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const otro = page.getByRole('dialog', { name: 'Nuevo producto' });
    await llenarProducto(otro, { nombre: `${nombre} B`, categoria, unidad, sku: sku.toUpperCase() });
    await otro.getByRole('button', { name: 'Crear producto' }).click();
    await expect(otro.getByText('Ya existe un producto con ese SKU.')).toBeVisible();
    await expect(otro.getByLabel('SKU (opcional)')).toHaveAttribute('aria-invalid', 'true');
    await otro.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByLabel('Buscar por nombre o SKU').fill(sku);
    await expect(fila(page, nombre)).toBeVisible();
    await expect(page.getByText('1 producto', { exact: true })).toBeVisible();

    const puts = [];
    page.on('request', (r) => {
      if (r.method() === 'PUT') puts.push(r);
    });
    await fila(page, nombre).getByRole('button', { name: `Editar ${nombre}` }).click();
    const edicion = page.getByRole('dialog', { name: 'Editar producto' });
    await edicion.getByLabel('SKU (opcional)').fill('');
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Producto actualizado')).toBeVisible();
    expect(puts[0].postDataJSON()).toEqual({ sku: null });
  });

  test('W63: producto inactivo no admite entradas (botón, select del modal y 409 de la API)', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const activo = await crearProductoApi(request, token, { categoria, unidad });
    const inactivo = await crearProductoApi(request, token, { categoria, unidad });
    await estadoProductoApi(request, token, inactivo.id, 'inactivo');
    await irAProductos(page, request);

    await expect(fila(page, inactivo.nombre).getByRole('button', { name: /^Entrada de/ })).toBeDisabled();
    await expect(fila(page, activo.nombre).getByRole('button', { name: /^Entrada de/ })).toBeEnabled();

    await page.getByRole('button', { name: 'Registrar entrada', exact: true }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar entrada' });
    const opciones = await dialogo.getByLabel('Producto').locator('option').allTextContents();
    expect(opciones).toContain(activo.nombre);
    expect(opciones).not.toContain(inactivo.nombre);

    const r = await request.post(`${API}/inventario/entradas`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { producto_id: inactivo.id, cantidad: 1 },
    });
    expect(r.status()).toBe(409);
    expect((await r.json()).codigo).toBe('PRODUCTO_INACTIVO');
  });
});
