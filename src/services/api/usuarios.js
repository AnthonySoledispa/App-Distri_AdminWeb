import { api } from './cliente.js';

export const listarUsuarios = (filtros = {}, opciones = {}) =>
  api.get('/usuarios', { ...opciones, query: filtros });

export const obtenerUsuario = (id) => api.get(`/usuarios/${id}`);

export const crearUsuario = (datos) => api.post('/usuarios', datos);

export const actualizarUsuario = (id, datos) => api.put(`/usuarios/${id}`, datos);

export const cambiarEstadoUsuario = (id, estado) => api.patch(`/usuarios/${id}/estado`, { estado });
