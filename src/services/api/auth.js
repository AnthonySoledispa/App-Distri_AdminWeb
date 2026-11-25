import { api } from './cliente.js';

export const iniciarSesion = (correo, contrasena) =>
  api.post('/auth/login', { correo, contrasena, cliente: 'web' }, { autenticado: false });

export const cerrarSesionApi = () => api.post('/auth/logout');

export const obtenerPerfil = (opciones) => api.get('/auth/perfil', opciones);
