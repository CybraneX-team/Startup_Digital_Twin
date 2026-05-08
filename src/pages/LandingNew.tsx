import { useNavigate } from 'react-router-dom';

export default function LandingNew() {
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#05051a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ── Page-level ambient glow ─────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 70% 55% at 20% 55%, rgba(60,30,160,0.35) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 80% 60%, rgba(180,70,10,0.22) 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 50% 90%, rgba(255,160,20,0.12) 0%, transparent 55%)
        `,
      }} />

      {/* ── Headline ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2.8rem', zIndex: 2, position: 'relative' }}>
        <p style={{
          fontSize: '0.72rem', letterSpacing: '0.28em',
          color: 'rgba(160,140,220,0.65)', textTransform: 'uppercase',
          marginBottom: '0.6rem', fontWeight: 500,
        }}>Work OS Universe</p>
        <h1 style={{
          fontSize: 'clamp(2.2rem,5vw,3.8rem)', fontWeight: 700,
          color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0,
        }}>Work OS</h1>
        <p style={{
          fontSize: 'clamp(0.8rem,1.4vw,0.95rem)',
          color: 'rgba(180,165,230,0.5)', marginTop: '0.45rem', letterSpacing: '0.04em',
        }}>One System. Infinite Opportunities.</p>
      </div>

      {/* ── Orb wrapper ──────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* Orbit rings */}
        {[1.52, 1.82].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${s})`,
            width: 'clamp(240px,28vw,380px)', height: 'clamp(240px,28vw,380px)',
            borderRadius: '50%',
            border: `1px solid rgba(255,255,255,${i === 0 ? 0.07 : 0.04})`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Outer halo glow ring */}
        <div style={{
          position: 'absolute', inset: '-14px', borderRadius: '50%',
          background: `conic-gradient(
            from 200deg,
            rgba(80,40,220,0) 0%,
            rgba(100,60,255,0.55) 18%,
            rgba(56,189,248,0.4) 35%,
            rgba(74,222,128,0.15) 50%,
            rgba(250,160,30,0.45) 68%,
            rgba(244,63,94,0.4) 82%,
            rgba(80,40,220,0) 100%
          )`,
          filter: 'blur(12px)',
          opacity: 0.9,
          pointerEvents: 'none',
        }} />

        {/* The orb button */}
        <button
          onClick={() => navigate('/overview')}
          style={{
            position: 'relative',
            width: 'clamp(240px,28vw,380px)', height: 'clamp(240px,28vw,380px)',
            borderRadius: '50%', cursor: 'pointer', outline: 'none',
            border: 'none', padding: 0, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            /* Base dark sphere body */
            background: `
              radial-gradient(circle at 50% 50%, #0a0820 0%, #060418 55%, #020210 100%)
            `,
            boxShadow: `
              0 0 0 1.5px rgba(255,255,255,0.10),
              0 30px 80px rgba(0,0,0,0.75),
              0 0 120px rgba(80,40,220,0.15)
            `,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {/* Blue-purple atmospheric rim — top-left */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(ellipse 80% 70% at 20% 25%,
              rgba(100,80,255,0.55) 0%,
              rgba(56,130,248,0.35) 30%,
              transparent 65%)`,
          }} />

          {/* Cyan-teal mid band */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(ellipse 60% 40% at 35% 60%,
              rgba(30,180,220,0.20) 0%, transparent 60%)`,
          }} />

          {/* Amber-orange rim — right */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(ellipse 70% 65% at 82% 40%,
              rgba(230,100,20,0.50) 0%,
              rgba(200,60,10,0.25) 40%,
              transparent 65%)`,
          }} />

          {/* Warm point-light bloom — bottom-center */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(ellipse 55% 35% at 50% 98%,
              rgba(255,200,60,0.60) 0%,
              rgba(255,140,20,0.30) 40%,
              transparent 70%)`,
          }} />

          {/* Edge vignette to keep sphere looking 3-D */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%,
              transparent 50%,
              rgba(0,0,0,0.55) 75%,
              rgba(0,0,0,0.88) 100%)`,
          }} />

          {/* Specular highlight — top-left glint */}
          <div style={{
            position: 'absolute',
            top: '14%', left: '18%',
            width: '30%', height: '14%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, transparent 70%)',
            filter: 'blur(4px)',
            transform: 'rotate(-30deg)',
          }} />

          {/* Cross reflection lines */}
          <div style={{
            position: 'absolute',
            width: '36%', height: '7px', borderRadius: '7px',
            background: 'rgba(255,255,255,0.50)',
            boxShadow: '0 0 14px rgba(255,255,255,0.45)',
          }} />
          <div style={{
            position: 'absolute',
            width: '36%', height: '7px', borderRadius: '7px',
            background: 'rgba(255,255,255,0.50)',
            boxShadow: '0 0 14px rgba(255,255,255,0.45)',
            transform: 'rotate(90deg)',
          }} />

          {/* Enter label */}
          <span style={{
            position: 'absolute', bottom: '28%',
            fontSize: 'clamp(0.7rem,1.4vw,0.9rem)', fontWeight: 700,
            color: 'rgba(255,255,255,0.85)', letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textShadow: '0 0 16px rgba(255,255,255,0.5)',
            userSelect: 'none',
          }}>
            Enter
          </span>
        </button>
      </div>

      {/* ── Bottom tagline ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: '2.2rem',
        display: 'flex', alignItems: 'center', gap: '0.45rem',
        zIndex: 2, flexWrap: 'wrap', justifyContent: 'center', padding: '0 1rem',
      }}>
        {['All Context', 'Real-time Insights', 'Personalized for You', 'Actionable Every Day'].map((t, i) => (
          <span key={t} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: 'clamp(0.65rem,1.1vw,0.75rem)',
            color: 'rgba(160,148,210,0.55)', letterSpacing: '0.02em',
          }}>
            {i > 0 && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(140,120,190,0.4)', display: 'inline-block' }} />}
            {t}
          </span>
        ))}
      </div>

      <style>{`
        button { transition: transform 0.25s ease, filter 0.25s ease; }
      `}</style>
    </div>
  );
}
