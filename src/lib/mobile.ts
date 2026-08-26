"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}

export function useLongPress(
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void,
  onClick: (e: React.TouchEvent | React.MouseEvent) => void,
  { delay = 500 } = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);
  const posRef = useRef({ x: 0, y: 0 });

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      movedRef.current = false;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      posRef.current = { x: clientX, y: clientY };

      clear();
      timerRef.current = setTimeout(() => {
        if (!movedRef.current) onLongPress(e);
      }, delay);
    },
    [onLongPress, delay, clear]
  );

  const move = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      if (
        Math.abs(clientX - posRef.current.x) > 10 ||
        Math.abs(clientY - posRef.current.y) > 10
      ) {
        movedRef.current = true;
        clear();
      }
    },
    [clear]
  );

  const end = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      clear();
      if (!movedRef.current) onClick(e);
    },
    [onClick, clear]
  );

  return { onTouchStart: start, onTouchMove: move, onTouchEnd: end, onMouseDown: start, onMouseUp: end };
}
