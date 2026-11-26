import { api } from './cliente.js';

export const listarCategorias = (filtros = {}, opciones = {}) =>
  api.get('/categorias', { ...opciones, query: filtros });
export const obtenerCategoria = (id) => api.get(`/categorias/${id}`);
export const crearCategoria = (datos) => api.post('/categorias', datos);
export const actualizarCategoria = (id, datos) => api.put(`/categorias/${id}`, datos);
export const cambiarEstadoCategoria = (id, estado) => api.patch(`/categorias/${id}/estado`, { estado });
