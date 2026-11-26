import { api } from './cliente.js';

export const listarRutas = (filtros = {}, opciones = {}) => api.get('/rutas', { ...opciones, query: filtros });
export const obtenerRuta = (id) => api.get(`/rutas/${id}`);
export const crearRuta = (datos) => api.post('/rutas', datos);
export const actualizarRuta = (id, datos) => api.put(`/rutas/${id}`, datos);
export const cambiarEstadoRuta = (id, estado) => api.patch(`/rutas/${id}/estado`, { estado });
