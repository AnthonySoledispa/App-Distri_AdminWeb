import { api } from './cliente.js';

export const listarProductos = (filtros = {}, opciones = {}) =>
  api.get('/productos', { ...opciones, query: filtros });
export const obtenerProducto = (id, opciones = {}) => api.get(`/productos/${id}`, opciones);
export const crearProducto = (datos) => api.post('/productos', datos);
export const actualizarProducto = (id, datos) => api.put(`/productos/${id}`, datos);
export const cambiarEstadoProducto = (id, estado) => api.patch(`/productos/${id}/estado`, { estado });
export const eliminarProducto = (id) => api.delete(`/productos/${id}`);
export const listarLotes = (id, filtros = {}, opciones = {}) =>
  api.get(`/productos/${id}/lotes`, { ...opciones, query: filtros });
