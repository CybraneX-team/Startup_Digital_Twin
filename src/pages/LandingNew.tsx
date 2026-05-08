import { useState } from 'react';
import Orb from '../components/Orb';

export default function LandingNew() {
  const [expanded, setExpanded] = useState(false);
  const [insideOrb, setInsideOrb] = useState(false);

  function isInOrb(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const orbRadius = Math.min(rect.width, rect.height) / 2 * 0.82;
    return Math.sqrt(x * x + y * y) <= orbRadius;
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    setInsideOrb(isInOrb(e));
  }

  function handleMouseLeave() {
    setInsideOrb(false);
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (isInOrb(e)) setExpanded(true);
  }

  return (
    <div
      style={{
        width: '100%',
        height: '90vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          height: '100%',
          cursor: expanded ? 'default' : insideOrb ? 'pointer' : 'default',
          transform: expanded ? 'scale(5)' : 'scale(1)',
          opacity: expanded ? 0 : 1,
          transition: 'transform 4.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 1.2s ease 1.0s',
          willChange: 'transform, opacity',
        }}
      >
        <Orb
          hoverIntensity={0}
          rotateOnHover={true}
          hue={0}
          forceHoverState={false}
        />
      </div>
    </div>
  );
}
