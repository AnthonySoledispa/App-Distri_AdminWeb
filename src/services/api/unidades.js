import { api } from './cliente.js';

export const listarUnidades = (filtros = {}, opciones = {}) =>
  api.get('/unidades-medida', { ...opciones, query: filtros });
export const obtenerUnidad = (id) => api.get(`/unidades-medida/${id}`);
export const crearUnidad = (datos) => api.post('/unidades-medida', datos);
export const actualizarUnidad = (id, datos) => api.put(`/unidades-medida/${id}`, datos);
export const cambiarEstadoUnidad = (id, estado) => api.patch(`/unidades-medida/${id}/estado`, { estado });
