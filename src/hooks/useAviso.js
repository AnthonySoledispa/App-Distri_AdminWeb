import { useCallback, useEffect, useRef, useState } from 'react';

/** Aviso flotante que desaparece solo a los 4 segundos. */
export function useAviso() {
  const [aviso, setAviso] = useState(null); // { texto, tipo } | null
  const temporizador = useRef(null);
  useEffect(() => () => clearTimeout(temporizador.current), []);
  const mostrarAviso = useCallback((texto, tipo = 'exito') => {
    clearTimeout(temporizador.current);
    setAviso({ texto, tipo });
    temporizador.current = setTimeout(() => setAviso(null), 4000);
  }, []);
  return { aviso, mostrarAviso };
}
