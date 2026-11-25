import { test, expect } from '@playwright/test';
import { TEXTO, admin, asegurarRepartidor, hayCredenciales, hayRepartidor, iniciarSesionUI, repartidor } from './credenciales.js';

// Sin trace: las peticiones de login llevan la contraseña.
test.describe('Login (RF-01, RF-02, RF-05)', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible();
  });

  test('W01: el administrador entra y el token queda en sessionStorage', async ({ page }) => {
    await iniciarSesionUI(page);
    await expect(page.getByRole('heading', { name: /^Bienvenido/ })).toBeVisible();
    await expect(page).toHaveURL('/');
    const guardado = await page.evaluate(() => {
      const s = JSON.parse(sessionStorage.getItem('distrigo.sesion') || 'null');
      return Boolean(s && s.token) && !JSON.stringify(s).includes('contrasena');
    });
    expect(guardado).toBe(true);
    expect(await page.evaluate(() => Boolean(localStorage.getItem('distrigo.sesion')))).toBe(false);
  });

  test('W02: contraseña incorrecta muestra el texto genérico', async ({ page }) => {
    await page.getByLabel('Correo electrónico').fill(admin.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill('Incorrecta-123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toHaveText(new RegExp(TEXTO.genericoLogin));
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
    // Se compara sin exponer el valor en caso de fallo.
    expect((await page.getByLabel('Correo electrónico').inputValue()) === admin.correo).toBe(true);
  });

  test('W03: correo inexistente muestra el mismo texto (RF-02)', async ({ page }) => {
    // Respuesta simulada con la misma forma que el backend, para no gastar intentos reales.
    await page.route('**/api/auth/login', (ruta) =>
      ruta.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Correo o contrasena incorrectos' }),
      }),
    );
    await page.getByLabel('Correo electrónico').fill('no.existe@prueba.local');
    await page.getByLabel('Contraseña', { exact: true }).fill('Cualquiera123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toHaveText(new RegExp(TEXTO.genericoLogin));
  });

  test('W04: campos vacíos o inválidos no hacen ninguna petición', async ({ page }) => {
    let peticiones = 0;
    page.on('request', (r) => {
      if (r.url().includes('/auth/login')) peticiones += 1;
    });
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('El correo es obligatorio.')).toBeVisible();
    await page.getByLabel('Correo electrónico').fill('correo-sin-formato');
    await page.getByLabel('Contraseña', { exact: true }).fill('x');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('El correo no tiene un formato válido.')).toBeVisible();
    await page.getByLabel('Correo electrónico').fill('ok@prueba.local');
    await page.getByLabel('Contraseña', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('La contraseña es obligatoria.')).toBeVisible();
    expect(peticiones).toBe(0);
  });

  test('W05: un repartidor no puede entrar al panel web (CA-02, TP-02)', async ({ page, request }) => {
    test.skip(!hayRepartidor, 'Falta el repartidor de prueba.');
    await asegurarRepartidor(request);
    await iniciarSesionUI(page, repartidor);
    await expect(page.getByRole('alert')).toContainText('Esta cuenta no tiene acceso al panel web');
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => sessionStorage.getItem('distrigo.sesion'))).toBeNull();
  });

  test('W06: usuario inactivo ve "Usuario desactivado"', async ({ page }) => {
    await page.route('**/api/auth/login', (ruta) =>
      ruta.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, codigo: 'USUARIO_INACTIVO', mensaje: 'Usuario desactivado. Contacte al administrador.' }),
      }),
    );
    await page.getByLabel('Correo electrónico').fill('inactivo@prueba.local');
    await page.getByLabel('Contraseña', { exact: true }).fill('Cualquiera123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toContainText('Usuario desactivado');
  });

  test('W07: el 429 muestra el mensaje del backend con los minutos', async ({ page }) => {
    await page.route('**/api/auth/login', (ruta) =>
      ruta.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          codigo: 'DEMASIADOS_INTENTOS',
          mensaje: 'Demasiados intentos fallidos. Intente de nuevo en 15 minutos.',
        }),
      }),
    );
    await page.getByLabel('Correo electrónico').fill('a@prueba.local');
    await page.getByLabel('Contraseña', { exact: true }).fill('Cualquiera123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toContainText('en 15 minutos');
  });

  test('W08: backend caído muestra el mensaje de conexión', async ({ page }) => {
    await page.route('**/api/auth/login', (ruta) => ruta.abort('connectionrefused'));
    await page.getByLabel('Correo electrónico').fill('a@prueba.local');
    await page.getByLabel('Contraseña', { exact: true }).fill('Cualquiera123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toContainText('No se pudo conectar con el servidor');
  });

  test('el botón Mostrar/Ocultar alterna el tipo del campo', async ({ page }) => {
    const campo = page.getByLabel('Contraseña', { exact: true });
    await expect(campo).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar' }).click();
    await expect(campo).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Ocultar' })).toHaveAttribute('aria-pressed', 'true');
  });
});
