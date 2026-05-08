import Orb from '../components/Orb';

export default function LandingNew() {
  return (
    <div style={{ width: '100%', height: '800px', position: 'relative' }}>
      <Orb
        hoverIntensity={0}
        rotateOnHover={true}
        hue={0}
        forceHoverState={false}
      />
    </div>
  );
}
