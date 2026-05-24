import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import Orb from '../components/Orb';
import OrbConstellation from '../components/OrbConstellation';
import RolesSection from '../components/RolesSection';
import ResearchSection from '../components/ResearchSection';
import TextRevealSection from '../components/TextRevealSection';
import FooterSection from '../components/FooterSection';

const REVEAL_TEXT = 'Core Industry Dynamics as a Product.';
const WORDS = REVEAL_TEXT.split(' ');
const REVEAL_START = 0.45;
const REVEAL_END   = 0.92;

// ─── Timing knobs ──────────────────────────────────────────────────────────
const MINIMIZE_DURATION = 0.9;   // seconds — orb flies to corner
const RESTORE_DURATION  = 0.9;   // seconds — orb flies back to center
const CARDS_APPEAR_DELAY = 200;  // ms after minimize completes before cards show
const CORNER_SIZE       = 80;    // px — diameter of orb in corner
const CORNER_MARGIN     = 24;    // px — distance from screen edges
// ───────────────────────────────────────────────────────────────────────────

export default function LandingNew() {
  const [insideOrb, setInsideOrb]       = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [orbMinimized, setOrbMinimized]     = useState(false);
  const [orbAnimating, setOrbAnimating]     = useState(false);
  const [showCards, setShowCards]           = useState(false);

  const orbSectionRef    = useRef<HTMLDivElement>(null);
  const orbDivRef        = useRef<HTMLDivElement>(null);
  const lenisRef         = useRef<Lenis | null>(null);
  const welcomeIntensity  = useRef(0); // driven each frame by scripted curve, no re-renders
  const intensityDriverRef = useRef(0); // rAF id — allows canceling from anywhere

  // ── Lenis smooth scroll ──────────────────────────────────────────────────
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenisRef.current = lenis;
    let rafId: number;
    const raf = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(rafId); lenis.destroy(); };
  }, []);

  // ── Scroll progress ───────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const el = orbSectionRef.current;
      if (!el) return;
      const rect      = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      setScrollProgress(Math.min(1, Math.max(0, -rect.top / scrollable)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const orbScale   = 1 + scrollProgress * 5.5;
  const orbOpacity = Math.max(0, 1 - scrollProgress * 7);
  const uiOpacity  = Math.max(0, 1 - scrollProgress * 7);

  // ── Apply scroll-driven transform directly to DOM — never via React style.
  //    This lets GSAP own the same property during animation without conflicts.
  useLayoutEffect(() => {
    const el = orbDivRef.current;
    if (!el || orbAnimating || orbMinimized) return;
    el.style.transform = `scale(${orbScale})`;
    el.style.opacity   = String(orbOpacity);
  });

  // ── Derived display values ────────────────────────────────────────────────
  const isOrbBusy       = orbAnimating || orbMinimized;
  const effectiveUiOpacity = isOrbBusy ? 0 : uiOpacity;

  // ── Word reveal ──────────────────────────────────────────────────────────
  const revealProgress    = Math.min(1, Math.max(0, (scrollProgress - REVEAL_START) / (REVEAL_END - REVEAL_START)));
  const revealTextOpacity = Math.min(1, revealProgress * 3);
  const activeWordCount   = Math.floor(revealProgress * WORDS.length);

  // ── Orb hit-test ─────────────────────────────────────────────────────────
  function isInOrb(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top  - rect.height / 2;
    return Math.sqrt(x * x + y * y) <= Math.min(rect.width, rect.height) / 2 * 0.82;
  }

  // ── Speech intensity curve — maps elapsed seconds to 0-1 loudness ────────
  function speechIntensity(t: number): number {
    if (t <= 0 || t >= 2.4) return 0;
    if (t < 0.15) return (t / 0.15) * 0.65;            // "Wel-"  ramp up
    if (t < 0.55) return 0.65 - (t - 0.15) / 0.4 * 0.2; // "-come" sustain
    if (t < 0.80) return 0.45 - (t - 0.55) / 0.25 * 0.25; // " to "  valley
    if (t < 1.10) return 0.20 + (t - 0.80) / 0.30 * 0.75; // "Work-" build
    if (t < 1.55) return 0.95 - (t - 1.10) / 0.45 * 0.55; // "-OS"   decay
    return Math.max(0, 0.40 - (t - 1.55) / 0.85 * 0.40);  // tail
  }

  // ── Minimize: welcome animation → voice → orb flies to corner ─────────────
  const triggerMinimize = () => {
    if (orbAnimating || orbMinimized) return;
    const el = orbDivRef.current;
    if (!el) return;

    lenisRef.current?.stop();

    welcomeIntensity.current = 0;

    // Speak "Welcome to Work OS"
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance('Welcome to Work OS');
      utter.rate   = 0.88;
      utter.pitch  = 1.05;
      utter.volume = 1.0;
      // Prefer a premium voice if available
      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        return (
          voices.find(v => /Samantha|Daniel|Google UK|Google US|Aaron/i.test(v.name)) ||
          voices.find(v => v.lang.startsWith('en')) ||
          null
        );
      };
      const voice = pickVoice();
      if (voice) utter.voice = voice;
      window.speechSynthesis.speak(utter);
    }

    // 3. Drive intensity ref each frame via scripted curve
    cancelAnimationFrame(intensityDriverRef.current); // kill any leftover loop from previous play
    welcomeIntensity.current = 0;
    const startTime = performance.now();
    const driveIntensity = () => {
      const t = (performance.now() - startTime) / 1000;
      if (t >= 2.4) {
        welcomeIntensity.current = 0; // explicit zero — orb stops reacting
        return;
      }
      welcomeIntensity.current = speechIntensity(t);
      intensityDriverRef.current = requestAnimationFrame(driveIntensity);
    };
    intensityDriverRef.current = requestAnimationFrame(driveIntensity);

    // 4. After ~600ms (orb has been reacting), start the minimize flight
    const WELCOME_HOLD_MS = 600;
    setTimeout(() => {
      setOrbAnimating(true);

      const W = window.innerWidth;
      const H = window.innerHeight;
      const navH = 62;

      const dx = (W - CORNER_MARGIN - CORNER_SIZE / 2) - W / 2;
      const dy = (H - CORNER_MARGIN - CORNER_SIZE / 2) - (navH + (H - navH) / 2);
      const visualDiameter = Math.min(W, H - navH) * 0.72;
      const targetScale    = CORNER_SIZE / visualDiameter;

      gsap.killTweensOf(el);
      gsap.set(el, { x: 0, y: 0, scale: 1 }); // sync GSAP internal state to DOM
      gsap.to(el, {
          x: dx, y: dy, scale: targetScale,
          duration: MINIMIZE_DURATION,
          ease: 'power3.inOut',
          onComplete: () => {
            setOrbAnimating(false);
            setOrbMinimized(true);
            setTimeout(() => setShowCards(true), CARDS_APPEAR_DELAY);
          },
        }
      );
    }, WELCOME_HOLD_MS);
  };

  // ── Restore: orb flies back to center ────────────────────────────────────
  const triggerRestore = () => {
    if (orbAnimating) return;
    // Kill any running intensity loop immediately
    cancelAnimationFrame(intensityDriverRef.current);
    intensityDriverRef.current = 0;
    welcomeIntensity.current = 0;
    window.speechSynthesis?.cancel();
    setShowCards(false);
    setOrbMinimized(false);
    setOrbAnimating(true);

    const el = orbDivRef.current;
    if (!el) return;

    gsap.killTweensOf(el);
    gsap.to(el, {
      x: 0, y: 0, scale: 1,
      duration: RESTORE_DURATION,
      ease: 'power3.inOut',
      onComplete: () => {
        setOrbAnimating(false);
        lenisRef.current?.start();
      },
    });
  };

  const handleOrbClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (orbMinimized) { triggerRestore(); return; }
    if (!isInOrb(e))  return;
    triggerMinimize();
  };

  const navigate = useNavigate();

  // ── Orb AI voice: speaks any text, drives orb boundary via oscillating intensity ──
  const speakWithOrb = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    cancelAnimationFrame(intensityDriverRef.current);
    intensityDriverRef.current = 0;
    welcomeIntensity.current = 0;

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.88; utter.pitch = 1.05; utter.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => /Samantha|Daniel|Google UK|Google US|Aaron/i.test(v.name))
      || voices.find(v => v.lang.startsWith('en')) || null;
    if (voice) utter.voice = voice;

    // Start driver immediately — don't wait for onstart (async, unreliable on some browsers)
    const driveStart = performance.now();
    const drive = () => {
      const t = (performance.now() - driveStart) / 1000;
      // Ramp in first 80ms to avoid abrupt jump
      const ramp = Math.min(1, t / 0.08);
      welcomeIntensity.current =
        ramp * (0.25 + 0.30 * Math.abs(Math.sin(t * 6.8)) * (0.65 + 0.35 * Math.sin(t * 2.9 + 1.1)));
      intensityDriverRef.current = requestAnimationFrame(drive);
    };
    intensityDriverRef.current = requestAnimationFrame(drive);

    utter.onend = utter.onerror = () => {
      cancelAnimationFrame(intensityDriverRef.current);
      intensityDriverRef.current = 0;
      // Smooth ramp-out over 200ms
      const fadeStart = performance.now();
      const lastVal = welcomeIntensity.current;
      const fade = () => {
        const p = Math.min(1, (performance.now() - fadeStart) / 200);
        welcomeIntensity.current = lastVal * (1 - p);
        if (p < 1) intensityDriverRef.current = requestAnimationFrame(fade);
        else { welcomeIntensity.current = 0; intensityDriverRef.current = 0; }
      };
      intensityDriverRef.current = requestAnimationFrame(fade);
    };

    window.speechSynthesis.speak(utter);
  };

  // Speak greeting when choose-path screen appears
  useEffect(() => {
    if (!showCards) return;
    const t = setTimeout(() => speakWithOrb('Choose your path to enter Work OS.'), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCards]);

  const ROLE_CARDS: { label: string; sub: string; route: string; voiceHint: string; highlight?: boolean; external?: boolean }[] = [
    {
      label: 'VC',
      sub: 'Portfolio & deal flow intelligence',
      route: '/auth/vc',
      voiceHint: 'Venture capital mode. Access portfolio intelligence and deal flow analytics.',
    },
    {
      label: 'Investor',
      sub: 'Institutional capital allocation',
      route: '/auth/incubator',
      voiceHint: 'Investor mode. Manage institutional capital allocation and investment tracking.',
    },
    {
      label: 'Company',
      sub: 'Build & track your digital twin',
      route: '/auth',
      voiceHint: 'Company mode. Build and monitor your digital twin in real time.',
    },
    // { label: 'Unicorn Simulator', sub: 'Explore the 3D galaxy universe', route: 'https://unicornsimulator.com', voiceHint: 'Explore the unicorn galaxy universe.', highlight: true, external: true },
  ];

  return (
    <div style={{ width: '100%', background: '#111111', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Navbar ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '62px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '30px 80px',
        background: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(12px)',
        opacity: effectiveUiOpacity,
        transition: isOrbBusy ? 'opacity 0.3s ease' : 'none',
        pointerEvents: showCards ? 'none' : 'auto',
      }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>Company</span>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.18em' }}>WORK OS</span>
        <button onClick={() => navigate('/auth')} style={{
          padding: '10px 24px', borderRadius: '999px', border: 'none',
          background: '#ffffff', color: '#0a0a0a', fontSize: '0.8rem',
          fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>Try Demo</button>
      </header>

      {/* ── Orb scroll zone ── */}
      <div ref={orbSectionRef} style={{ height: '320vh' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          overflow: isOrbBusy ? 'visible' : 'hidden',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', paddingTop: '62px',
          // Lift stacking context so orb renders above fixed overlay
          zIndex: orbMinimized ? 401 : 'auto',
          // Pass clicks through to overlay when minimized (back button etc.)
          pointerEvents: orbMinimized ? 'none' : 'auto',
        }}>

          {/* hero_bg.svg — fixed to sticky container, NOT inside orb div so it stays put */}
          <img src="/hero_bg.svg" alt="" style={{
            position: 'absolute', bottom: -140, left: '50%',
            transform: 'translateX(-50%)', width: '100%',
            pointerEvents: 'none', zIndex: 0,
            opacity: isOrbBusy ? 0 : orbOpacity,
          }} />

          {/* Orb div — transform owned by useLayoutEffect (scroll) or GSAP (animation).
              Never set transform in React style to avoid conflicts. */}
          <div
            ref={orbDivRef}
            onMouseMove={(e) => setInsideOrb(isInOrb(e))}
            onMouseLeave={() => setInsideOrb(false)}
            onClick={handleOrbClick}
            style={{
              width: '100%', flex: 1, position: 'relative',
              willChange: 'transform, opacity',
              zIndex: 1, pointerEvents: 'auto',
              cursor: orbMinimized
                ? 'pointer'
                : (insideOrb && !orbAnimating ? 'pointer' : 'default'),
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
              <Orb hoverIntensity={0} rotateOnHover={false} hue={0} forceHoverState={false} intensityRef={welcomeIntensity} />
            </div>
          </div>

          {/* Hero text — outside scaling div, only fades */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', userSelect: 'none',
            opacity: effectiveUiOpacity,
            transition: isOrbBusy ? 'opacity 0.3s ease' : 'none',
          }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 300, letterSpacing: '0.02em', color: '#ffffff', lineHeight: 1 }}>
              Work OS
            </h1>
            <p style={{ margin: '0.75rem 0 0', fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)', fontWeight: 400, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>
              One System. Infinite Opportunities.
            </p>
          </div>

          {/* Enter pill — bottom-center */}
          {!isOrbBusy && (
            <button onClick={triggerMinimize} style={{
              position: 'absolute', bottom: '37vh', left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 5, opacity: effectiveUiOpacity,
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '11px 28px', borderRadius: '999px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(12px)',
              color: 'rgba(255,255,255,0.75)',
              fontSize: '0.82rem', fontWeight: 500,
              letterSpacing: '0.06em', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'background 0.2s, border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background    = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.borderColor   = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.color         = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background    = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor   = 'rgba(255,255,255,0.18)';
              e.currentTarget.style.color         = 'rgba(255,255,255,0.75)';
            }}>
              Experience Work OS
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7h9M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* Reveal text */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', userSelect: 'none',
            opacity: revealTextOpacity, padding: '0 10vw',
          }}>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 500, lineHeight: 1.2, color: '#ffffff' }}>
              {WORDS.map((word, i) => (
                <span key={i} style={{ opacity: i <= activeWordCount ? 1 : 0.08, transition: 'opacity 0.4s ease', display: 'inline' }}>
                  {word}{i < WORDS.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          </div>

        </div>
      </div>

      {/* ── Cards overlay — shown after orb minimized ── */}
      {showCards && (
        <>
          <style>{`
            @keyframes orbCardIn {
              from { opacity: 0; transform: translateY(28px) scale(0.95); }
              to   { opacity: 1; transform: translateY(0)   scale(1);    }
            }
            @keyframes orbOverlayIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes orbTitleIn   { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
            .orb-card-btn:hover {
              transform: translateY(-4px) scale(1.04) !important;
              box-shadow: 0 16px 40px rgba(0,0,0,0.4) !important;
            }
          `}</style>
          <div
            onClick={(e) => { if (e.target === e.currentTarget) triggerRestore(); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '32px',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              animation: 'orbOverlayIn 0.4s ease forwards',
            }}
          >
            {/* Title */}
            <div style={{ textAlign: 'center', animation: 'orbTitleIn 0.5s ease 0.05s both' }}>
              <p style={{ margin: 0, fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)', fontWeight: 300, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Choose your path
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Work OS — One System. Infinite Opportunities.
              </p>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '0 24px' }}>
              {ROLE_CARDS.map((card, i) => (
                <button
                  key={card.label}
                  className="orb-card-btn"
                  onMouseEnter={() => speakWithOrb(card.voiceHint)}
                  onClick={() => card.external
                    ? window.open(card.route, '_blank', 'noopener,noreferrer')
                    : navigate(card.route)}
                  style={{
                    width: '172px', padding: '22px 16px',
                    background: card.highlight ? '#ffffff' : 'rgba(255,255,255,0.08)',
                    border: card.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '14px',
                    color: card.highlight ? '#0a0a0a' : 'rgba(255,255,255,0.85)',
                    fontSize: '0.88rem', fontWeight: card.highlight ? 700 : 500,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: '0.03em', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    backdropFilter: 'blur(16px)',
                    boxShadow: card.highlight ? '0 8px 32px rgba(255,255,255,0.2)' : '0 8px 24px rgba(0,0,0,0.3)',
                    animation: `orbCardIn 0.55s cubic-bezier(0.16,1,0.3,1) ${0.12 + i * 0.08}s both`,
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  }}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{card.label}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, color: card.highlight ? 'rgba(10,10,10,0.5)' : 'rgba(255,255,255,0.4)', letterSpacing: '0.01em', lineHeight: 1.4, textAlign: 'center' }}>
                    {card.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Back button */}
            <button
              onClick={triggerRestore}
              style={{
                marginTop: '8px', padding: '10px 28px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '999px', color: 'rgba(255,255,255,0.45)',
                fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.06em',
                animation: `orbCardIn 0.5s ease ${0.12 + ROLE_CARDS.length * 0.08 + 0.05}s both`,
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            >
              ← back
            </button>
          </div>
        </>
      )}

      <OrbConstellation />
      <RolesSection />
      <ResearchSection />
      <TextRevealSection />
      <FooterSection />
    </div>
  );
}
