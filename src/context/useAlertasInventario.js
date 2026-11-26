import { useContext } from 'react';
import { AlertasInventarioContext } from './AlertasInventarioContext.jsx';

export function useAlertasInventario() {
  const ctx = useContext(AlertasInventarioContext);
  if (!ctx) throw new Error('useAlertasInventario debe usarse dentro de AlertasInventarioProvider.');
  return ctx;
}
