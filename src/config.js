const crudo = import.meta.env?.VITE_API_URL || 'http://localhost:3000/api';

export const API_URL = crudo.replace(/\/+$/, '');
export const TIEMPO_MAXIMO_MS = 15000;
