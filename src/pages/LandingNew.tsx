import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── SVG displacement filter id ─── */
const FILTER_ID = 'liquid-glass-filter';

export default function LandingNew() {
  const navigate = useNavigate();
  const blobRef = useRef<HTMLButtonElement>(null);
  const animScaleInRef = useRef<SVGAnimateElement>(null);
  const animScaleOutRef = useRef<SVGAnimateElement>(null);

  /* Trigger SMIL animations on mouse events */
  useEffect(() => {
    const el = blobRef.current;
    if (!el) return;
    const over = () => animScaleInRef.current?.beginElement();
    const out  = () => animScaleOutRef.current?.beginElement();
    el.addEventListener('mouseenter', over);
    el.addEventListener('mouseleave', out);
    return () => {
      el.removeEventListener('mouseenter', over);
      el.removeEventListener('mouseleave', out);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 30% 40%, #0d0d2b 0%, #060612 60%, #000 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* ── Ambient star-dust glow blobs ─────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        {/* top-left purple */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-8%',
          width: '55vw', height: '55vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(120,80,255,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        {/* bottom-right amber */}
        <div style={{
          position: 'absolute', bottom: '-12%', right: '-10%',
          width: '50vw', height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,120,30,0.14) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        {/* center cyan hint */}
        <div style={{
          position: 'absolute', top: '35%', left: '50%',
          transform: 'translateX(-50%)',
          width: '30vw', height: '30vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }} />
      </div>

      {/* ── Headline ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', zIndex: 2 }}>
        <p style={{
          fontSize: 'clamp(0.65rem, 1.2vw, 0.8rem)',
          letterSpacing: '0.25em',
          color: 'rgba(180,160,255,0.7)',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
          fontWeight: 500,
        }}>
          Work OS Universe
        </p>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          margin: 0,
        }}>
          Work OS
        </h1>
        <p style={{
          fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
          color: 'rgba(200,190,255,0.55)',
          marginTop: '0.5rem',
          letterSpacing: '0.05em',
        }}>
          One System. Infinite Opportunities.
        </p>
      </div>

      {/* ── Liquid glass blob ────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Gradient ring glow behind blob */}
        <div style={{
          position: 'absolute',
          inset: '-6px',
          borderRadius: '50%',
          background: 'conic-gradient(from 180deg, #7b5cf6, #818cf8, #38bdf8, #4ade80, #f59e0b, #f43f5e, #c084fc, #7b5cf6)',
          filter: 'blur(8px)',
          opacity: 0.85,
          zIndex: 0,
        }} />

        {/* Orbit rings (decorative) */}
        {[1.55, 1.85].map((scale, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${scale})`,
            width: '100%', height: '100%',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
            zIndex: 0,
            pointerEvents: 'none',
          }} />
        ))}

        {/* The blob button */}
        <button
          ref={blobRef}
          onClick={() => navigate('/overview')}
          style={{
            position: 'relative',
            zIndex: 1,
            width: 'clamp(240px, 28vw, 380px)',
            height: 'clamp(240px, 28vw, 380px)',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: `url(#${FILTER_ID}) blur(0px)`,
            WebkitBackdropFilter: `url(#${FILTER_ID})`,
            boxShadow: [
              'inset 0 0 60px rgba(255,255,255,0.04)',
              '0 0 0 1.5px rgba(255,255,255,0.18)',
              '0 24px 60px rgba(0,0,0,0.5)',
            ].join(', '),
            cursor: 'pointer',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '0.5rem',
            transition: 'box-shadow 0.3s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = [
              'inset 0 0 80px rgba(255,255,255,0.07)',
              '0 0 0 2px rgba(255,255,255,0.3)',
              '0 32px 80px rgba(0,0,0,0.6)',
            ].join(', ');
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = [
              'inset 0 0 60px rgba(255,255,255,0.04)',
              '0 0 0 1.5px rgba(255,255,255,0.18)',
              '0 24px 60px rgba(0,0,0,0.5)',
            ].join(', ');
          }}
        >
          {/* Cross highlight lines */}
          <div style={{
            position: 'absolute',
            width: '38%', height: '8px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 12px rgba(255,255,255,0.4)',
          }} />
          <div style={{
            position: 'absolute',
            width: '38%', height: '8px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 12px rgba(255,255,255,0.4)',
            transform: 'rotate(90deg)',
          }} />

          {/* Inner text */}
          <span style={{
            position: 'relative',
            fontSize: 'clamp(0.9rem, 1.8vw, 1.2rem)',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
            userSelect: 'none',
            marginTop: '4.5rem',
          }}>
            Enter
          </span>
        </button>
      </div>

      {/* ── Bottom tagline pills ──────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        zIndex: 2,
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '0 1rem',
      }}>
        {['All Context', 'Real-time Insights', 'Personalized for You', 'Actionable Every Day'].map((t, i) => (
          <span key={t} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: 'clamp(0.65rem, 1.1vw, 0.78rem)',
            color: 'rgba(180,170,220,0.6)',
            letterSpacing: '0.03em',
          }}>
            {i > 0 && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(150,130,200,0.4)', display: 'inline-block' }} />}
            {t}
          </span>
        ))}
      </div>

      {/* ── Hidden SVG displacement filter ───────────────────────── */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id={FILTER_ID} primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              seed="2"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="noiseMask"
            />
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.015" result="blurred" />
            <feDisplacementMap
              in="blurred"
              in2="noiseMask"
              result="displaced"
              xChannelSelector="R"
              yChannelSelector="G"
            >
              <animate
                ref={animScaleInRef}
                attributeName="scale"
                from="0.8"
                to="1.6"
                dur="0.35s"
                fill="freeze"
                begin="indefinite"
              />
              <animate
                ref={animScaleOutRef}
                attributeName="scale"
                from="1.6"
                to="0.8"
                dur="0.35s"
                fill="freeze"
                begin="indefinite"
              />
            </feDisplacementMap>
            <feComposite in="displaced" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* ── Conic gradient border via CSS ────────────────────────── */}
      <style>{`
        @keyframes spin-ring {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-blob {
          0%, 100% { opacity: 0.82; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
