import { Canvas } from '@react-three/fiber';
import type { UExternalNode } from '../../lib/universalPolytopeData';
import { RootInternalNodeScene } from './RootInternalNodeScene';

export interface PlanetRootNodeViewProps {
  root: UExternalNode;
  selectedInternalPath: string[];
  onInternalPathChange: (path: string[]) => void;
  requestBackStep?: number;
  rootSwitchKey?: number;
}

/** BDT department drill-in node layout only — no convex polytope hull. */
export default function PlanetRootNodeView({
  root,
  selectedInternalPath,
  onInternalPathChange,
  requestBackStep = 0,
  rootSwitchKey = 0,
}: PlanetRootNodeViewProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 9.5], fov: 45, near: 0.1, far: 300 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        frameloop="always"
        style={{ background: 'transparent' }}
      >
        <RootInternalNodeScene
          root={root}
          selectedInternalPath={selectedInternalPath}
          onPathChange={onInternalPathChange}
          requestBackStep={requestBackStep}
          rootSwitchKey={rootSwitchKey}
        />
      </Canvas>
    </div>
  );
}
