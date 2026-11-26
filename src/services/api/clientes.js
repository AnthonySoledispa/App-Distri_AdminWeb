import { api } from './cliente.js';

export const listarClientes = (filtros = {}, opciones = {}) => api.get('/clientes', { ...opciones, query: filtros });
export const obtenerCliente = (id, opciones = {}) => api.get(`/clientes/${id}`, opciones);
export const crearCliente = (datos) => api.post('/clientes', datos);
export const actualizarCliente = (id, datos) => api.put(`/clientes/${id}`, datos);
export const cambiarEstadoCliente = (id, estado) => api.patch(`/clientes/${id}/estado`, { estado });
export const listarCompras = (id, filtros = {}, opciones = {}) =>
  api.get(`/clientes/${id}/compras`, { ...opciones, query: filtros });
