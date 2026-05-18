import { useEffect, useRef, useState } from 'react';

const S_VIOLET = `16px 16px 46px rgba(255,54,54,0.12), 28px 61px 64.6px rgba(234,7,255,0.06), 12px -29px 64.6px rgba(255,94,7,0.08), -8px 14px 82.3px rgba(86,56,255,0.25), inset -4px -6px 15.3px #FFFFFF, inset 48px -53px 45.8px rgba(51,5,255,0.25), inset -43px -53px 45.8px rgba(255,138,5,0.25), inset -18px 10px 45.8px rgba(255,139,7,0.25), inset -21px -86px 64px rgba(78,2,255,0.25), inset -12px -20px 26.3px rgba(255,48,155,0.25), inset 0px -14px 64px rgba(66,2,255,0.25)`;

const S_ORANGE = `16px 16px 46px rgba(255,101,54,0.12), 28px 61px 64.6px rgba(255,152,7,0.06), -8px 21px 82.3px rgba(255,179,56,0.25), inset -4px -9px 15.3px #FFFFFF, inset 48px -53px 45.8px rgba(255,5,126,0.25), inset -43px -53px 45.8px rgba(255,138,5,0.25), inset -18px 10px 45.8px rgba(255,139,7,0.25), inset -21px -86px 64px rgba(78,2,255,0.25), inset -12px -20px 26.3px rgba(255,48,155,0.25), inset 0px -14px 64px rgba(66,2,255,0.25)`;

const S_BLUE = `16px 16px 46px rgba(255,94,54,0.12), 28px 61px 64.6px rgba(7,135,255,0.06), 12px -29px 64.6px rgba(7,11,255,0.08), -8px 14px 82.3px rgba(86,56,255,0.25), inset -4px -6px 15.3px #FFFFFF, inset 48px -53px 45.8px rgba(13,5,255,0.25), inset -43px -53px 45.8px rgba(5,134,255,0.25), inset -18px 10px 45.8px rgba(255,139,7,0.25), inset -21px -86px 64px rgba(78,2,255,0.25), inset -12px -20px 26.3px rgba(255,48,155,0.25), inset 0px -14px 64px rgba(66,2,255,0.25)`;

const ORBS = [
  { label: 'Engineering', size: 'clamp(140px,18.2vw,314px)', bg: 'rgba(0,0,0,0.01)', shadow: S_VIOLET, labelSide: 'right' as const, rotate: false },
  { label: 'Pharmacy', size: 'clamp(48px,5.6vw,96px)', bg: 'rgba(0,0,0,0.01)', shadow: S_VIOLET, labelSide: 'left' as const, rotate: true },
  { label: 'Education', size: 'clamp(90px,11.2vw,193px)', bg: '#FF823F', shadow: S_ORANGE, labelSide: 'right' as const, rotate: false },
  { label: 'Agriculture', size: 'clamp(64px,7.3vw,126px)', bg: '#FF823F', shadow: S_ORANGE, labelSide: 'right' as const, rotate: false },
  { label: 'Transportation', size: 'clamp(90px,11.2vw,193px)', bg: 'rgba(0,0,0,0.01)', shadow: S_BLUE, labelSide: 'left' as const, rotate: false },
];

// [step][orbIndex]: {left, top} in vw/vh
const STEPS = [
  [
    { left: '-7vw', top: '8vh' },
    { left: '87vw', top: '8vh' },
    { left: '41vw', top: '44vh' },
    { left: '12vw', top: '65vh' },
    { left: '84vw', top: '78vh' },
  ],
  [
    { left: '41vw', top: '44vh' },
    { left: '87vw', top: '8vh' },
    { left: '84vw', top: '78vh' },
    { left: '12vw', top: '65vh' },
    { left: '5vw', top: '8vh' },
  ],
  [
    { left: '41vw', top: '44vh' },
    { left: '12vw', top: '65vh' },
    { left: '84vw', top: '78vh' },
    { left: '87vw', top: '8vh' },
    { left: '5vw', top: '8vh' },
  ],
  [
    { left: '41vw', top: '44vh' },  // Engineering (unchanged)
    { left: '84vw', top: '78vh' },  // Pharmacy → Education spot
    { left: '87vw', top: '8vh' },  // Education → Agriculture spot
    { left: '5vw', top: '8vh' },  // Agriculture → Transportation spot
    { left: '12vw', top: '65vh' },  // Transportation → Pharmacy spot
  ],
];

// Each step occupies 250vh of scroll — tune this to adjust sensitivity
const SCROLL_HEIGHT = `${STEPS.length * 150}vh`;

export default function OrbConstellation() {
  const outerRef = useRef<HTMLDivElement>(null);   // tall scroll zone
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [step, setStep] = useState(0);

  // Derive step from scroll progress — same math as orb section
  useEffect(() => {
    const onScroll = () => {
      const el = outerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.min(1, Math.max(0, scrolled / scrollable));
      // Map [0,1) → step index; clamp so last band stays on final step
      const next = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));
      setStep(next);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  return (
    // Outer: tall scroll zone — same pattern as orb section (320vh)
    <div ref={outerRef} style={{ height: SCROLL_HEIGHT, width: '100%' }}>
      {/* Inner: sticky panel pinned to viewport */}
      <div
        style={{
          position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
          background: '#111111', fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Title */}
        {/* <p style={{
          position: 'absolute', top: '40px', left: '60px', zIndex: 10,
          margin: 0, fontSize: 'clamp(1rem,1.8vw,1.5rem)',
          fontWeight: 400, color: '#ffffff', letterSpacing: '-0.01em',
        }}>
          Every node is expressive
        </p> */}

        {/* Orbs */}
        {ORBS.map((orb, i) => {
          const pos = STEPS[step][i];
          return (
            <div
              key={orb.label}
              ref={el => { orbRefs.current[i] = el; }}
              style={{
                position: 'absolute',
                left: pos.left, top: pos.top,
                width: orb.size, height: orb.size,
                background: orb.bg, boxShadow: orb.shadow,
                borderRadius: '50%',
                transform: orb.rotate ? 'rotate(45deg)' : 'none',
                transition: 'left 1.1s cubic-bezier(0.4,0,0.2,1), top 1.1s cubic-bezier(0.4,0,0.2,1)',
                zIndex: 2,
              }}
            >
              <div style={{
                position: 'absolute', top: '50%',
                transform: `translateY(-50%)${orb.rotate ? ' rotate(-45deg)' : ''}`,
                ...(orb.labelSide === 'right'
                  ? { left: 'calc(100% + 10px)' }
                  : { right: 'calc(100% + 10px)' }),
                whiteSpace: 'nowrap',
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', padding: '5px 12px',
                fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)',
                letterSpacing: '0.03em',
              }}>
                {orb.label}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
