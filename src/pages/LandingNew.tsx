import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [showOptions, setShowOptions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
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

  const handleOrbClick = () => {
    if (insideOrb && !showOptions) {
      lenisRef.current?.stop();
      setIsAnimating(true);
      setShowOptions(true);
    }
  };

  const closeOptions = () => {
    setShowOptions(false);
    setTimeout(() => {
      setIsAnimating(false);
      lenisRef.current?.start();
    }, 800);
  };

  const navigate = useNavigate();

  const ROLE_CARDS = [
    {
      label: 'VC',
      sub: 'Portfolio & deal flow intelligence',
      route: '/auth/vc',
    },
    {
      label: 'Investor',
      sub: 'Institutional capital allocation',
      route: '/auth/incubator',
    },
    {
      label: 'Company',
      sub: 'Build & track your digital twin',
      route: '/auth',
    },
  ];

  const targetOrbScale = showOptions ? Math.max(orbScale, 6.5) : orbScale;
  const targetOrbOpacity = showOptions ? 0 : orbOpacity;
  const targetUiOpacity = showOptions ? 0 : uiOpacity;
  const dynamicTransition = isAnimating ? 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease' : 'none';

  return (
    <div style={{ width: '100%', background: '#111111', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Global CSS for pulse animation */}
      <style>{`
        @keyframes subtlePulse {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        .pulse-text {
          animation: subtlePulse 3s infinite ease-in-out;
        }
        .overlay-fade-enter {
          opacity: 0;
          backdrop-filter: blur(0px);
        }
        .overlay-fade-enter-active {
          opacity: 1;
          backdrop-filter: blur(20px);
          transition: opacity 0.4s ease, backdrop-filter 0.4s ease;
        }
      `}</style>

      {/* Fixed navbar */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '62px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '30px 80px',
        background: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(12px)',
        opacity: targetUiOpacity,
        transition: dynamicTransition,
        pointerEvents: showOptions ? 'none' : 'auto',
      }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>Company</span>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.18em' }}>WORK OS</span>
        <button
          onClick={() => navigate('/auth')}
          style={{
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

          {/* Orb — scales on scroll or click */}
          <div
            onMouseMove={(e) => setInsideOrb(isInOrb(e))}
            onMouseLeave={() => setInsideOrb(false)}
            onClick={handleOrbClick}
            style={{
              width: '100%', flex: 1, position: 'relative',
              cursor: insideOrb ? 'pointer' : 'default',
              transform: `scale(${targetOrbScale})`,
              opacity: targetOrbOpacity,
              willChange: 'transform, opacity',
              transition: dynamicTransition,
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
              opacity: targetUiOpacity,
              transition: dynamicTransition,
            }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 300, letterSpacing: '0.02em', color: '#ffffff', lineHeight: 1 }}>
                Work OS
              </h1>
              <p style={{ margin: '0.75rem 0 0', fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)', fontWeight: 400, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>
                One System. Infinite Opportunities.
              </p>
              
              <div
                className="pulse-text"
                style={{
                  marginTop: '2.5rem',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <p style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.8)',
                  textTransform: 'uppercase',
                }}>
                  Click inside to experience Work OS
                </p>
              </div>
            </div>
          </div>

          {/* Reveal text — overlaid, appears as orb fills screen */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', userSelect: 'none',
            opacity: showOptions ? 0 : revealTextOpacity,
            transition: dynamicTransition,
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

      {/* Options Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(5, 5, 5, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: showOptions ? 1 : 0,
          pointerEvents: showOptions ? 'auto' : 'none',
          backdropFilter: showOptions ? 'blur(20px)' : 'blur(0px)',
          transition: 'all 0.4s ease 0.3s', // delayed fade in so orb scales first
        }}
      >
        <button
          onClick={closeOptions}
          style={{
            position: 'absolute',
            top: '40px',
            right: '40px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.2rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>
        
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: 300,
            color: '#fff',
            marginBottom: '3rem',
            letterSpacing: '0.05em',
            transform: showOptions ? 'translateY(0)' : 'translateY(-20px)',
            opacity: showOptions ? 1 : 0,
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.4s', // delayed further
          }}
        >
          Select Your Role
        </h2>

        <div style={{
          display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px'
        }}>
          {ROLE_CARDS.map((card, idx) => (
            <button
              key={card.label}
              onClick={() => navigate(card.route)}
              style={{
                width: '240px', padding: '32px 24px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                color: '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transform: showOptions ? 'translateY(0)' : 'translateY(30px)',
                opacity: showOptions ? 1 : 0,
                transition: `transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.5 + idx * 0.1}s, opacity 0.4s ease ${0.5 + idx * 0.1}s, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
                // Maintain the translate Y state if any, just scale up slightly
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{
                fontSize: '1.25rem', fontWeight: 600,
                letterSpacing: '0.03em',
              }}>{card.label}</span>
              <span style={{
                fontSize: '0.85rem', fontWeight: 400,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.4,
                textAlign: 'center',
              }}>{card.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
