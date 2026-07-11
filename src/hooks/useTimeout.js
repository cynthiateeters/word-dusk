import { useEffect, useRef, useCallback } from "react";

export function useTimeout() {
  const idRef = useRef(null);

  const set = useCallback((fn, delay) => {
    clearTimeout(idRef.current);
    idRef.current = setTimeout(fn, delay);
  }, []);

  const clear = useCallback(() => {
    clearTimeout(idRef.current);
    idRef.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  return { set, clear };
}
