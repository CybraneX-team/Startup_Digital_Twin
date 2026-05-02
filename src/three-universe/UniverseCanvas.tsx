import { useEffect, useRef } from 'react';
import { UniverseController, type NavPathEntry, type ZoomLevel, type HoverTarget } from './UniverseController';
import type { UniverseData } from '../data/universeGraph';

interface UniverseCanvasProps {
  data: UniverseData;
  onNavigate?: (path: NavPathEntry[], level: ZoomLevel) => void;
  onHover?: (target: HoverTarget | null) => void;
  controllerRef?: React.MutableRefObject<UniverseController | null>;
}

export default function UniverseCanvas({ data, onNavigate, onHover, controllerRef }: UniverseCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<UniverseController | null>(null);

  const stableOnNavigate = useRef(onNavigate);
  stableOnNavigate.current = onNavigate;
  const stableOnHover = useRef(onHover);
  stableOnHover.current = onHover;

  useEffect(() => {
    if (!containerRef.current) return;

    const ctrl = new UniverseController(
      containerRef.current,
      data,
      {
        onNavigate: (path, level) => stableOnNavigate.current?.(path, level),
        onHover: (target) => stableOnHover.current?.(target),
      },
    );
    ctrlRef.current = ctrl;
    if (controllerRef) controllerRef.current = ctrl;

    // Force resize after first paint — catches any layout-timing issues where
    // clientHeight was read before the browser finalised the fixed/absolute layout.
    const rafId = requestAnimationFrame(() => ctrl.resize());

    return () => {
      cancelAnimationFrame(rafId);
      ctrl.dispose();
      ctrlRef.current = null;
      if (controllerRef) controllerRef.current = null;
    };
  }, []); // mount once — data passed at construction time

  return <div ref={containerRef} className="absolute inset-1 w-screen h-screen overflow-hidden" />;
}
