import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface RevealCtx {
  progress: number;
  total: number;
}

const Ctx = createContext<RevealCtx>({ progress: 0, total: 1 });

function useScrollProgress(ref: React.RefObject<HTMLDivElement>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      setProgress(Math.min(1, Math.max(0, scrolled / scrollable)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);

  return progress;
}

interface TextRevealProps {
  body: string;
  className?: string;
  children: (tokens: string[]) => ReactNode;
}

function Root({ body, className, children }: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref);
  const tokens = body.split(' ');

  return (
    <Ctx.Provider value={{ progress, total: tokens.length }}>
      <div ref={ref} className={className} style={{ position: 'relative' }}>
        {children(tokens)}
      </div>
    </Ctx.Provider>
  );
}

interface TokenProps {
  index: number;
  children: (isActive: boolean) => ReactNode;
}

function Token({ index, children }: TokenProps) {
  const { progress, total } = useContext(Ctx);
  const isActive = progress >= index / total;
  return <>{children(isActive)}</>;
}

export const TextReveal = Object.assign(Root, { Token });
