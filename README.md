# DistriGO – Panel web de administración (AdminWeb)

Panel web del **administrador** de DistriGO. Módulo 1 (Autenticación y usuarios, RF-01 a RF-08): inicio de sesión, cierre de sesión, control de inactividad y gestión de usuarios (listar, filtrar, crear, editar, activar y desactivar). Módulo 2 (Productos e inventario, RF-09 a RF-19): productos, categorías, unidades, entradas, ajustes, lotes y caducidad, movimientos y alertas. Módulo 3 (Clientes, RF-20 a RF-24): tiendas, rutas de reparto, crédito y historial de compras.

Stack: React 19 + Vite 8 (JavaScript) y react-router 7. Diseño propio con CSS y variables, sin frameworks de UI. Toda la lógica y los permisos viven en el backend; este panel solo consume su API REST.

## Requisitos

- Node.js 22.12 o superior (probado con 22.15) y npm.
- Backend `App_DistriGo_Backen` en marcha en `http://localhost:3000` (con MySQL y al menos un administrador creado). Para Productos e inventario, el backend debe tener ejecutado el script `02_schema_modulo2.sql` (tablas de productos, lotes y movimientos); para Tiendas, el script del Módulo 3 (tablas `rutas` y `clientes`) y el backend en la rama del Módulo 3.
- Para las pruebas e2e: Google Chrome y Microsoft Edge instalados (no se descargan navegadores).

## Instalación

```bash
npm install
cp .env.example .env     # en PowerShell: Copy-Item .env.example .env
```

Variables de `.env` (el archivo no se versiona):

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | URL base de la API, sin barra final | `http://localhost:3000/api` |

> Las variables `VITE_*` quedan dentro del código publicado. Nunca coloque claves ni contraseñas en este archivo.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en http://localhost:5173 |
| `npm test` | Pruebas unitarias (vitest) |
| `npm run test:e2e` | Pruebas e2e (Playwright, Chrome y Edge) en entorno aislado (backend :3100 y panel :5174) |

El puerto **5173 es obligatorio** (`strictPort`): el backend solo admite CORS desde `http://localhost:5173`. Si está ocupado, libérelo en lugar de cambiar de puerto.

## Pruebas

- **Unitarias** (`tests/unit`): cliente HTTP, validaciones (usuarios, inventario y clientes), formato, alertas y mensajes de error. Corren en entorno `node`.
- **E2E** (`tests/e2e`): Playwright levanta su propio entorno aislado: una instancia del backend (`node src/server.js` en `../App_DistriGo_Backen`, puerto 3100, `LOGIN_MAX_INTENTOS=1000`, CORS para `http://localhost:5174`; el resto sale del `.env` del backend, que debe tener MySQL disponible) y Vite en el puerto 5174 apuntando a `http://localhost:3100/api`. No usa ni afecta al backend de :3000 ni al `npm run dev` de :5173, pero los puertos 3100 y 5174 deben estar libres. La URL de la API para las ayudas de prueba se puede cambiar con `E2E_API_URL` (por defecto `http://localhost:3100/api`).
  - Las credenciales se leen de variables de entorno `E2E_ADMIN_CORREO`, `E2E_ADMIN_CONTRASENA`, `E2E_ADMIN_NOMBRE` y `E2E_REPARTIDOR_*`. Si faltan, se leen `TEST_ADMIN_*` y `TEST_REPARTIDOR_*` del `.env` del backend (`../App_DistriGo_Backen/.env`). Nunca se imprimen.
  - Como el backend de pruebas es propio y con el límite de logins elevado, repetir la suite no produce 429.
  - Las pruebas del Módulo 2 crean por la API sus propias unidades, categorías y productos (nombres con la marca `E2E`) y se borran al terminar la suite (`globalTeardown` ejecuta `node scripts/limpiar-datos-e2e.js` en el backend; si el script no existe, solo avisa); los lotes vencidos se simulan con `page.route` porque la API no admite registrar mercadería ya vencida. Se fija la zona horaria `America/Guayaquil` para que las fechas sean estables.
  - Las pruebas del Módulo 3 crean por la API rutas y tiendas con nombre `E2E ...`; el mismo `globalTeardown` las borra. El crédito excedido, el saldo pendiente, el historial paginado y los errores 503 se simulan con `page.route` porque hasta el Módulo 4 no existen pedidos ni pagos (el saldo siempre es 0 y el historial siempre vacío).
  - Los usuarios creados por las pruebas (`e2e.<marca>@prueba.local`) quedan en la base de datos, desactivados al terminar.
  - Para correr un solo navegador: `npx playwright test --project=chrome` o `--project=msedge`.

## Productos e inventario (Módulo 2)

Sección **Productos** de la barra lateral, con subnavegación: Productos · Movimientos · Alertas · Categorías y unidades.

- **Productos:** lista con filtros en la URL (buscar por nombre o SKU, categoría, estado, solo stock bajo), alta, edición, activar/desactivar y eliminar (solo si no tiene movimientos, RB-05). El stock mostrado es el **vendible**; el stock vencido se señala aparte.
- **Entrada de mercadería:** ventana modal desde la lista, la ficha y las alertas. Pide lote y caducidad si la categoría los controla. No se admiten entradas a productos inactivos.
- **Ajustes:** disminuir (daño, pérdida, merma, caducidad, corrección, otro) o aumentar (solo corrección y otro), con observación obligatoria en corrección y otro.
- **Ficha del producto:** datos, stock vendible, lotes con su estado (vigente, por vencer, vencido) e historial paginado de movimientos.
- **Alertas:** stock bajo, lotes por vencer (días editables con `?dias=`, 15 por defecto, sin guardarse) y lotes vencidos con la acción "Dar de baja". La barra lateral muestra el total de alertas junto a "Productos".
- **Categorías y unidades:** altas, ediciones y estado. La casilla "Controlar lotes y fecha de caducidad" es por categoría. Las unidades definen si admiten decimales (Litro) o solo enteros (Unidad, Caja, Paquete).
- Moneda en dólares (USD). Las fechas de negocio ('AAAA-MM-DD') se muestran sin conversión de zona horaria.
- Las reglas (stock, permisos, lotes) las aplica el backend; el panel solo valida para dar mejores mensajes.

## Tiendas y rutas (Módulo 3)

Sección **Tiendas** de la barra lateral, con subnavegación: Tiendas · Rutas (`/tiendas`, `/tiendas/rutas`). La sección "Rutas" de la barra sigue como "Próximamente" hasta el módulo de Despachos y rutas.

- **Tiendas:** lista con filtros en la URL (buscar por nombre, contacto, teléfono o ruta; ruta, incluida "Sin ruta"; estado), alta, edición y activar/desactivar. No hay botón Eliminar. La edición envía solo lo que cambió.
- **Teléfono:** celular `09XXXXXXXX` o fijo `0[2-7]XXXXXXX` de Ecuador; acepta espacios, guiones y +593. Se guarda normalizado y se muestra como `099 123 4567` o `02 234 5678`.
- **Crédito:** límite, saldo pendiente y crédito disponible en la lista y en la ficha (`0` = solo contado). Si el saldo supera el límite se muestra "Crédito excedido"; bajar el límite por debajo del saldo pide confirmación. El control del crédito en los pedidos (RB-02) lo hace el backend.
- **Rutas:** altas, ediciones y estado. Una ruta con tiendas activas no se desactiva. El enlace de la columna Tiendas abre la lista filtrada por esa ruta. Los días de visita y los repartidores se asignan en un módulo posterior.
- **Ficha de la tienda (`/tiendas/:id`):** datos, resumen de crédito e historial de compras paginado (20 por página, filtros Desde y Hasta), vacío hasta el Módulo 4.

## Estructura

```
src/
  assets/        logo reducido
  components/    layout/ (barra lateral, cabecera), ui/ (botones, campos, modal...), sesion/, usuarios/, inventario/, clientes/
  context/       AuthContext (sesión, inactividad), AlertasInventarioContext (contador de alertas) y sus hooks
  hooks/         useAviso, useParametrosUrl
  pages/         Login, Inicio, Usuarios, Productos, Ficha de producto, Movimientos, Alertas, Categorías y unidades, Tiendas, Ficha de tienda, Rutas, 404
  routes/        RutaProtegida, RutaPublica
  services/      api/ (cliente HTTP, auth, usuarios) y almacenSesion
  styles/        variables, base, layout, componentes, login, inventario, clientes
  utils/         mensajes de error, validaciones, formato
tests/           unit/ y e2e/
```

## Notas de diseño

- **Sesión:** el token JWT se guarda en `sessionStorage` (sobrevive a F5 y se borra al cerrar la pestaña). La contraseña nunca se guarda.
- **Inactividad:** el backend cierra la sesión tras 30 minutos sin peticiones. El panel avisa 60 segundos antes; ratón y teclado no renuevan la sesión, solo "Seguir conectado".
- **Pantalla mínima:** 768 px (tablet). Por debajo de 1024 px la barra lateral se abre con el botón "Menú".
- **Secciones futuras:** Pedidos, Rutas, Cobros, Reportes y Agentes IA aparecen deshabilitadas ("Próximamente") hasta sus módulos.
- **Logo:** `src/assets/logo-distrigo.png` (320x320) y `public/favicon.png` (64x64) son reducciones del logo original de `Contexto/`.
- **Instalación de dependencias:** `vitest@5.1.0` falla en `npm install` desde cero por un error de resolución de peers de npm 11; el `package-lock.json` incluido evita el problema (use `npm ci` o `npm install` con el lock presente).
