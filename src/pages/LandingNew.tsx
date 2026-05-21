import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import Orb from '../components/Orb';
import OrbConstellation from '../components/OrbConstellation';
import RolesSection from '../components/RolesSection';
import ResearchSection from '../components/ResearchSection';
import TextRevealSection from '../components/TextRevealSection';
import FooterSection from '../components/FooterSection';

const REVEAL_TEXT = 'Core Industry Dynamics as a Product.';
const WORDS = REVEAL_TEXT.split(' ');
const REVEAL_START = 0.45; // orb progress at which words start appearing
const REVEAL_END = 0.92;   // all words visible by this progress

export default function LandingNew() {
  const [insideOrb, setInsideOrb] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const orbSectionRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = orbSectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      setScrollProgress(Math.min(1, Math.max(0, scrolled / scrollable)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const orbScale = 1 + scrollProgress * 5.5;
  const orbOpacity = Math.max(0, 1 - scrollProgress * 1.3);
  const uiOpacity = Math.max(0, 1 - scrollProgress * 7);  // hero text + buttons fast fade

  // Word reveal: maps scrollProgress [REVEAL_START → REVEAL_END] → [0 → 1]
  const revealProgress = Math.min(1, Math.max(0,
    (scrollProgress - REVEAL_START) / (REVEAL_END - REVEAL_START)
  ));
  const revealTextOpacity = Math.min(1, revealProgress * 3); // container fades in
  const activeWordCount = Math.floor(revealProgress * WORDS.length);

  function isInOrb(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const orbRadius = Math.min(rect.width, rect.height) / 2 * 0.82;
    return Math.sqrt(x * x + y * y) <= orbRadius;
  }

  const navButtons = ['3D Twin', 'Dashboard', 'Data'];

  return (
    <div style={{ width: '100%', background: '#111111', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Fixed navbar */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '62px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '30px 80px',
        background: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>Company</span>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.18em' }}>WORK OS</span>
        <button style={{
          padding: '10px 24px', borderRadius: '999px', border: 'none',
          background: '#ffffff', color: '#0a0a0a', fontSize: '0.8rem',
          fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>Try Demo</button>
      </header>

      {/* ── Orb scroll zone ── */}
      <div ref={orbSectionRef} style={{ height: '320vh' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', paddingTop: '62px',
        }}>

          {/* Orb — scales on scroll */}
          <div
            onMouseMove={(e) => setInsideOrb(isInOrb(e))}
            onMouseLeave={() => setInsideOrb(false)}
            style={{
              width: '100%', flex: 1, position: 'relative',
              cursor: insideOrb ? 'pointer' : 'default',
              transform: `scale(${orbScale})`,
              opacity: orbOpacity,
              willChange: 'transform, opacity',
            }}
          >
            {/* Hero background SVG — base beneath orb */}
            <img
              src="/hero_bg.svg"
              alt=""
              style={{
                position: 'absolute',
                bottom: -140, left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                pointerEvents: 'none',
                zIndex: -1,
              }}
            />
            <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
              <Orb hoverIntensity={0} rotateOnHover={false} hue={0} forceHoverState={false} />
            </div>

            {/* Hero text — fades out fast */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', userSelect: 'none',
              opacity: uiOpacity,
            }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 300, letterSpacing: '0.02em', color: '#ffffff', lineHeight: 1 }}>
                Work OS
              </h1>
              <p style={{ margin: '0.75rem 0 0', fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)', fontWeight: 400, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>
                One System. Infinite Opportunities.
              </p>
            </div>
          </div>

          {/* Nav buttons — fade out fast */}
          <div style={{
            display: 'flex', gap: '12px', paddingBottom: '40px',
            opacity: uiOpacity,
            pointerEvents: uiOpacity < 0.05 ? 'none' : 'auto',
          }}>
            {navButtons.map((label) => (
              <button key={label} style={{
                width: '160px', padding: '16px 0',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', color: 'rgba(255,255,255,0.75)',
                fontSize: '0.85rem', fontWeight: 500,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '0.03em', cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>

          {/* Reveal text — overlaid, appears as orb fills screen */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', userSelect: 'none',
            opacity: revealTextOpacity,
            padding: '0 10vw',
          }}>
            <p style={{
              margin: 0, textAlign: 'center',
              fontSize: 'clamp(2rem, 4.5vw, 3.8rem)',
              fontWeight: 500, lineHeight: 1.2, color: '#ffffff',
            }}>
              {WORDS.map((word, i) => (
                <span key={i} style={{
                  opacity: i <= activeWordCount ? 1 : 0.08,
                  transition: 'opacity 0.4s ease',
                  display: 'inline',
                }}>
                  {word}{i < WORDS.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          </div>

        </div>
      </div>

      {/* ── Orb Constellation section ── */}
      <OrbConstellation />

      {/* ── Roles section ── */}
      <RolesSection />

      {/* ── Research section ── */}
      <ResearchSection />

      {/* ── Text reveal section ── */}
      <TextRevealSection />

      {/* ── Footer ── */}
      <FooterSection />
    </div>
  );
}
