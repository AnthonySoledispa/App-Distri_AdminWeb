import { api } from './cliente.js';

export const registrarEntrada = (datos) => api.post('/inventario/entradas', datos);
export const registrarAjuste = (datos) => api.post('/inventario/ajustes', datos);
export const listarMovimientos = (filtros = {}, opciones = {}) =>
  api.get('/inventario/movimientos', { ...opciones, query: filtros });
export const obtenerAlertas = (dias, opciones = {}) =>
  api.get('/inventario/alertas', { ...opciones, query: { dias } });
