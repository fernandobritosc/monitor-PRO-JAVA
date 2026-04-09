import { useState, useEffect, useRef, useMemo } from 'react';

interface ResizeObserverDimensions {
  width: number;
  height: number;
}

/**
 * Hook to observe the size of a DOM element.
 * Replaces the need for window.dispatchEvent(new Event('resize')) hacks.
 */
export const useResizeObserver = <T extends HTMLElement>() => {
  const [dimensions, setDimensions] = useState<ResizeObserverDimensions>({ width: 0, height: 0 });
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, dimensions] as const;
};
