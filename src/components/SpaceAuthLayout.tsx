import React from 'react';

/* ── Deterministic star field ── */
const STAR_BG = Array.from({ length: 60 }, (_, i) => {
  const x = (((i * 173 + 37) + i * i * 7) % 1000) / 10;
  const y = (((i * 97 + 13) + i * i * 3) % 1000) / 10;
  const sz = i % 9 === 0 ? 1.5 : i % 5 === 0 ? 1.2 : 1;
  const op = (0.2 + ((i * 11) % 50) / 100).toFixed(2);
  return `radial-gradient(${sz}px ${sz}px at ${x.toFixed(1)}% ${y.toFixed(1)}%, rgba(255,255,255,${op}) 0%, transparent 100%)`;
}).join(', ');

interface Props {
  /** CSS color for planet's main body (e.g. '#5b21b6') */
  planetCore: string;
  /** CSS color for atmospheric glow on lower edge (e.g. '#ec4899') */
  atmosphereGlow: string;
  children: React.ReactNode;
}

export default function SpaceAuthLayout({ planetCore, atmosphereGlow, children }: Props) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#06060e',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Star field */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: STAR_BG, zIndex: 0, pointerEvents: 'none' }} />

      {/* Planet outer haze */}
      <div style={{
        position: 'absolute',
        top: '-240px', right: '-260px',
        width: '820px', height: '820px',
        borderRadius: '50%',
        background: `radial-gradient(circle, transparent 42%, ${planetCore}0e 56%, ${planetCore}05 68%, transparent 76%)`,
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      {/* Planet body */}
      <div style={{
        position: 'absolute',
        top: '-160px', right: '-190px',
        width: '700px', height: '700px',
        borderRadius: '50%',
        overflow: 'hidden',
        zIndex: 1,
        pointerEvents: 'none',
      }}>
        {/* Core surface */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 40% 50%, ${planetCore} 0%, ${planetCore}aa 18%, #1a0e3a 44%, #080514 68%)`,
        }} />
        {/* Atmospheric glow — lower-left */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 28% 78%, ${atmosphereGlow}90 0%, ${atmosphereGlow}38 32%, transparent 56%)`,
          filter: 'blur(2px)',
        }} />
        {/* Upper-right edge highlight */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 70% 20%, ${planetCore}50 0%, transparent 42%)`,
        }} />
        {/* Terminator (dark-side gradient) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 90% 50%, transparent 30%, rgba(2,2,8,0.55) 65%, rgba(2,2,8,0.85) 85%)',
        }} />
      </div>

      {/* Small moon — far left */}
      <div style={{
        position: 'absolute',
        left: '11%', top: '21%',
        width: '46px', height: '46px',
        borderRadius: '50%',
        background: `radial-gradient(circle at 36% 36%, #3a3260 0%, #100d20 70%)`,
        boxShadow: `0 0 22px ${planetCore}22`,
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '0 24px' }}>
        {children}
      </div>
    </div>
  );
}
