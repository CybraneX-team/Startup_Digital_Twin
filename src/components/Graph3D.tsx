import { useRef, useMemo, createContext, useContext, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { TwinNode, TwinEdge } from '../types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
export interface Graph3DProps {
  nodes: TwinNode[];
  edges: TwinEdge[];
  selectedNode: string | null;
  hoveredNode: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onNavigate?: (route: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Scope state & context                                              */
/* ------------------------------------------------------------------ */

interface ScopeState {
  distance: number;
  cameraPos: THREE.Vector3;
  focusedCluster: string | null;
  clusterFocus: number;
  focusedCompany: string | null;
  companyFocus: number;
  clusterFilter: ClusterFilter;
}

type ScopeLevel = 'galaxy' | 'cluster' | 'company';
type ClusterFilter = 'all' | 'competitors' | 'allies';

const ScopeCtx = createContext<React.RefObject<ScopeState>>(null!);
function useScope() { return useContext(ScopeCtx); }

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function getScopeLevel(clF: number, cf: number): ScopeLevel {
  if (cf > 0.15) return 'company';
  if (clF > 0.15) return 'cluster';
  return 'galaxy';
}

/* ------------------------------------------------------------------ */
/*  Layout — Constellation clusters                                    */
/* ------------------------------------------------------------------ */

const CLUSTER_CENTER: Record<string, [number, number, number]> = {
  'ind-saas':       [0,    0,    0],
  'ind-fintech':    [-70, -10, -55],
  'ind-healthtech': [70,  -10, -55],
  'ind-edtech':     [-60,  20,  60],
  'ind-ecommerce':  [60,   20,  60],
  'ind-aiml':       [0,   -35, -75],
  'ind-cleantech':  [0,    35,  75],
};

const BUBBLE_RADIUS: Record<string, number> = {
  'ind-saas': 13, 'ind-fintech': 10, 'ind-healthtech': 9,
  'ind-edtech': 9, 'ind-ecommerce': 10, 'ind-aiml': 10, 'ind-cleantech': 8,
};

const INDUSTRY_CLR: Record<string, string> = {
  'ind-saas': '#0ea5e9', 'ind-fintech': '#22d3ee', 'ind-healthtech': '#34d399',
  'ind-edtech': '#f59e0b', 'ind-ecommerce': '#ec4899', 'ind-aiml': '#38bdf8',
  'ind-cleantech': '#10b981',
};

/* Every node gets a 3D position */
const POS3D: Record<string, [number, number, number]> = {
  /* industries */
  ...CLUSTER_CENTER,

  /* SaaS companies (8) — within ~10u of [0,0,0] */
  'comp-you':    [2,   1,   2],
  'comp-rival1': [-7,  4,  -5],
  'comp-rival2': [7,  -3,  -6],
  'comp-rival3': [4,   7,  -8],
  'comp-saas4':  [-5, -6,   5],
  'comp-saas5':  [6,   5,   4],
  'comp-saas6':  [-4,  8,  -3],
  'comp-saas7':  [5,  -7,  -1],

  /* FinTech (5) — near [-70,-10,-55] */
  'comp-fin1': [-67, -7, -52],
  'comp-fin2': [-73,-13, -58],
  'comp-fin3': [-65,-10, -50],
  'comp-fin4': [-70, -5, -55],
  'comp-fin5': [-75,-10, -60],

  /* HealthTech (4) — near [70,-10,-55] */
  'comp-ht1': [73, -7, -52],
  'comp-ht2': [67,-13, -58],
  'comp-ht3': [70, -5, -50],
  'comp-ht4': [75,-10, -57],

  /* EdTech (4) — near [-60,20,60] */
  'comp-ed1': [-57, 23, 63],
  'comp-ed2': [-63, 17, 57],
  'comp-ed3': [-60, 25, 60],
  'comp-ed4': [-55, 18, 56],

  /* E-Commerce (5) — near [60,20,60] */
  'comp-ec1': [57, 23, 63],
  'comp-ec2': [63, 17, 57],
  'comp-ec3': [60, 25, 60],
  'comp-ec4': [65, 18, 56],
  'comp-ec5': [55, 15, 62],

  /* AI / ML (5) — near [0,-35,-75] */
  'comp-ai1': [-3,-32, -72],
  'comp-ai2': [3, -38, -78],
  'comp-ai3': [-5,-37, -73],
  'comp-ai4': [5, -32, -77],
  'comp-ai5': [0, -30, -71],

  /* CleanTech (3) — near [0,35,75] */
  'comp-ct1': [-3, 38, 78],
  'comp-ct2': [3,  32, 72],
  'comp-ct3': [0,  35, 70],

  /* YOUR departments — compact ~7-8u from comp-you [2,1,2] */
  'dept-product': [8,  7,  6],
  'dept-growth':  [9, -5, -3],
  'dept-eng':     [-5, -5, -2],
  'dept-support': [-5,  7,  6],

  /* Feature nodes — compact ~9-12u from comp-you */
  'feat-strategy':   [2,  11,  8],
  'feat-data':       [-9,  1,  2],
  'feat-benchmarks': [2,  -9, -4],
  'feat-team':       [12,  1,  2],
  'feat-analytics':  [9,  -7, -3],

  /* KPI nodes — ~3u from parent department */
  'kpi-prod-velocity': [10, 9,  7],
  'kpi-prod-nps':      [9,  6,  8],
  'kpi-prod-bugs':     [10, 5,  6],
  'kpi-growth-cac':        [11,-4, -2],
  'kpi-growth-ltv':        [10,-7, -4],
  'kpi-growth-activation': [11,-6, -1],
  'kpi-eng-velocity': [-7, -4, -1],
  'kpi-eng-uptime':   [-6, -7, -3],
  'kpi-eng-debt':     [-7, -6,  0],
  'kpi-sup-response': [-7,  9,  7],
  'kpi-sup-csat':     [-6,  6,  8],
  'kpi-sup-tickets':  [-7,  5,  6],

  /* Rival departments — close to their company */
  'dept-r1-prod':  [-9,  6, -7],
  'dept-r1-sales': [-5,  6, -7],
  'dept-r2-eng':   [5,  -5, -8],
  'dept-r2-mkt':   [9,  -5, -8],
  'dept-r3-ai':    [2,   9,-10],
  'dept-r3-ops':   [6,   9,-10],

  /* Signals — far periphery */
  'sig-market':        [40,  22,  28],
  'sig-regulation':    [-40, 22,  28],
  'sig-sentiment':     [40, -22, -28],
  'sig-macro':         [-40,-22, -28],
  'sig-talent':        [28,  25, -22],
  'sig-funding':       [-28,-25,  22],
  'sig-tech-trend':    [35, -10,  35],
  'sig-geopolitics':   [-35, 10, -35],
  'sig-climate':       [25,  30,  30],
  'sig-ai-regulation': [-25,-30, -30],
};

/* Maps company → parent industry (for cluster-based reveal) */
const COMPANY_INDUSTRY: Record<string, string> = {
  'comp-you': 'ind-saas', 'comp-rival1': 'ind-saas', 'comp-rival2': 'ind-saas',
  'comp-rival3': 'ind-saas', 'comp-saas4': 'ind-saas', 'comp-saas5': 'ind-saas',
  'comp-saas6': 'ind-saas', 'comp-saas7': 'ind-saas',
  'comp-fin1': 'ind-fintech', 'comp-fin2': 'ind-fintech', 'comp-fin3': 'ind-fintech',
  'comp-fin4': 'ind-fintech', 'comp-fin5': 'ind-fintech',
  'comp-ht1': 'ind-healthtech', 'comp-ht2': 'ind-healthtech',
  'comp-ht3': 'ind-healthtech', 'comp-ht4': 'ind-healthtech',
  'comp-ed1': 'ind-edtech', 'comp-ed2': 'ind-edtech',
  'comp-ed3': 'ind-edtech', 'comp-ed4': 'ind-edtech',
  'comp-ec1': 'ind-ecommerce', 'comp-ec2': 'ind-ecommerce', 'comp-ec3': 'ind-ecommerce',
  'comp-ec4': 'ind-ecommerce', 'comp-ec5': 'ind-ecommerce',
  'comp-ai1': 'ind-aiml', 'comp-ai2': 'ind-aiml', 'comp-ai3': 'ind-aiml',
  'comp-ai4': 'ind-aiml', 'comp-ai5': 'ind-aiml',
  'comp-ct1': 'ind-cleantech', 'comp-ct2': 'ind-cleantech', 'comp-ct3': 'ind-cleantech',
};

/* Maps every internal node → parent COMPANY (for emergence + ownership) */
const EMERGE_PARENT: Record<string, string> = {
  'dept-product': 'comp-you', 'dept-growth': 'comp-you',
  'dept-eng': 'comp-you', 'dept-support': 'comp-you',
  'feat-strategy': 'comp-you', 'feat-data': 'comp-you',
  'feat-benchmarks': 'comp-you', 'feat-team': 'comp-you',
  'feat-analytics': 'comp-you',
  'kpi-prod-velocity': 'comp-you', 'kpi-prod-nps': 'comp-you', 'kpi-prod-bugs': 'comp-you',
  'kpi-growth-cac': 'comp-you', 'kpi-growth-ltv': 'comp-you', 'kpi-growth-activation': 'comp-you',
  'kpi-eng-velocity': 'comp-you', 'kpi-eng-uptime': 'comp-you', 'kpi-eng-debt': 'comp-you',
  'kpi-sup-response': 'comp-you', 'kpi-sup-csat': 'comp-you', 'kpi-sup-tickets': 'comp-you',
  'dept-r1-prod': 'comp-rival1', 'dept-r1-sales': 'comp-rival1',
  'dept-r2-eng': 'comp-rival2', 'dept-r2-mkt': 'comp-rival2',
  'dept-r3-ai': 'comp-rival3', 'dept-r3-ops': 'comp-rival3',
};

/* ------------------------------------------------------------------ */
/*  Company View — flat 2D layout                                      */
/* ------------------------------------------------------------------ */

function computeFlatLayout(
  companyId: string,
  companyPos: [number, number, number],
): Record<string, [number, number, number]> {
  const children = Object.entries(EMERGE_PARENT)
    .filter(([_, parent]) => parent === companyId)
    .map(([id]) => id);

  const depts = children.filter(id => id.startsWith('dept-'));
  const feats = children.filter(id => id.startsWith('feat-'));

  const result: Record<string, [number, number, number]> = {};
  const [cx, cy, cz] = companyPos;

  // Departments in inner ring (radius 10)
  const deptR = 10;
  depts.forEach((id, i) => {
    const angle = (i / depts.length) * Math.PI * 2 - Math.PI / 2;
    result[id] = [
      cx + Math.cos(angle) * deptR,
      cy,
      cz + Math.sin(angle) * deptR,
    ];
  });

  // Features in outer ring (radius 18)
  const featR = 18;
  feats.forEach((id, i) => {
    const angle = (i / feats.length) * Math.PI * 2 - Math.PI / 4;
    result[id] = [
      cx + Math.cos(angle) * featR,
      cy,
      cz + Math.sin(angle) * featR,
    ];
  });

  return result;
}

// Precompute flat 2D layout positions for every company that has children
const FLAT_POS: Record<string, [number, number, number]> = {};
for (const compId of [...new Set(Object.values(EMERGE_PARENT))]) {
  const pos = POS3D[compId];
  if (!pos) continue;
  Object.assign(FLAT_POS, computeFlatLayout(compId, pos));
}

// Precompute which children belong to each company
const COMPANY_CHILDREN: Record<string, string[]> = {};
for (const [childId, parentId] of Object.entries(EMERGE_PARENT)) {
  if (!COMPANY_CHILDREN[parentId]) COMPANY_CHILDREN[parentId] = [];
  COMPANY_CHILDREN[parentId].push(childId);
}

/* ------------------------------------------------------------------ */
/*  Company relationship map (for cluster filter)                      */
/* ------------------------------------------------------------------ */

const COMPANY_RELATION: Record<string, 'you' | 'competitor' | 'ally'> = {
  'comp-you':    'you',
  'comp-rival1': 'competitor',
  'comp-rival2': 'competitor',
  'comp-rival3': 'competitor',
  'comp-saas4':  'competitor',
  'comp-saas5':  'ally',
  'comp-saas6':  'ally',
  'comp-saas7':  'ally',
};

function passesClusterFilter(companyId: string, filter: ClusterFilter): boolean {
  if (filter === 'all') return true;
  const rel = COMPANY_RELATION[companyId];
  if (!rel) return true;          // companies not in map (other clusters) always pass
  if (rel === 'you') return true; // your company always visible
  if (filter === 'competitors') return rel === 'competitor';
  if (filter === 'allies') return rel === 'ally';
  return true;
}

const SCALE: Record<string, number> = {
  industry: 3.0, company: 1.6, department: 0.9, signal: 1.2, kpi: 0.5, feature: 1.1,
};
const COLORS: Record<string, string> = {
  industry: '#0ea5e9', company: '#38bdf8', department: '#2dd4bf',
  you: '#22d3ee', 'sig-ok': '#34d399', 'sig-warn': '#fbbf24',
  kpi: '#f472b6', feature: '#64748b',
};

function nodeColor(n: TwinNode): string {
  if (n.id === 'comp-you') return COLORS.you;
  if (n.type === 'signal') return n.status === 'warning' ? COLORS['sig-warn'] : COLORS['sig-ok'];
  if (n.type === 'kpi') return n.status === 'warning' ? '#fbbf24' : COLORS.kpi;
  if (n.type === 'feature') return COLORS.feature;
  return COLORS[n.type] ?? '#6b7280';
}

/* ------------------------------------------------------------------ */
/*  Scope result — per-node visibility                                 */
/* ------------------------------------------------------------------ */

interface ScopeResult {
  opacity: number;
  scaleMult: number;
  emergeFactor: number;
  revealFactor: number;
}

function getNodeScope(
  camToNode: number, nodeType: string, nodeId: string, st: ScopeState,
): ScopeResult {
  const ZERO: ScopeResult = { opacity: 0, scaleMult: 0, emergeFactor: 0, revealFactor: 0 };
  const { focusedCluster: fCl, clusterFocus: clF,
          focusedCompany: fc, companyFocus: cf } = st;
  const inCluster = fCl !== null && clF > 0.15;
  const inCompany = fc !== null && cf > 0.15;

  switch (nodeType) {

    case 'industry': {
      if (inCluster) {
        if (nodeId === fCl) return { opacity: Math.max(0, 1 - clF * 2), scaleMult: 1, emergeFactor: 1, revealFactor: 1 };
        return { opacity: Math.max(0, 1 - clF * 4), scaleMult: 1, emergeFactor: 1, revealFactor: 1 };
      }
      return { opacity: 1, scaleMult: 1, emergeFactor: 1, revealFactor: 1 };
    }

    case 'company': {
      const belongsToCluster = COMPANY_INDUSTRY[nodeId] === fCl;

      if (inCompany) {
        if (nodeId === fc) {
          // Focused company: stay visible as center of flat layout
          return { opacity: 1, scaleMult: 1, emergeFactor: 1, revealFactor: 1 };
        }
        return { opacity: Math.max(0, 1 - cf * 4), scaleMult: Math.max(0, 1 - cf * 4), emergeFactor: 1, revealFactor: 0 };
      }

      if (inCluster) {
        if (!belongsToCluster) return ZERO;
        if (!passesClusterFilter(nodeId, st.clusterFilter)) return ZERO;
        const isYou = nodeId === 'comp-you';
        return {
          opacity: clF,
          scaleMult: clF,
          emergeFactor: 1,
          revealFactor: isYou ? 1 : clF,
        };
      }

      if (nodeId === 'comp-you') {
        return { opacity: 0.6, scaleMult: 0.35, emergeFactor: 1, revealFactor: 1 };
      }
      return ZERO;
    }

    case 'department':
    case 'feature': {
      if (!inCompany || EMERGE_PARENT[nodeId] !== fc) return ZERO;
      const emerge = smoothstep(0.1, 0.5, cf);
      return { opacity: emerge, scaleMult: Math.max(0.3, emerge), emergeFactor: emerge, revealFactor: 1 };
    }

    case 'kpi':
      return ZERO;

    case 'signal': {
      if (inCompany) return ZERO;
      if (inCluster) return { opacity: Math.max(0, 1 - clF * 2.5), scaleMult: Math.max(0.3, 1 - clF), emergeFactor: 1, revealFactor: 1 };
      return { opacity: smoothstep(30, 60, camToNode), scaleMult: 1, emergeFactor: 1, revealFactor: 1 };
    }

    default:
      return { opacity: 1, scaleMult: 1, emergeFactor: 1, revealFactor: 1 };
  }
}

/* pre-computed company vectors for CameraWatcher */
const COMPANY_VECS = Object.entries(POS3D)
  .filter(([id]) => id.startsWith('comp-'))
  .map(([id, pos]) => ({ id, vec: new THREE.Vector3(...pos) }));

const CLUSTER_VECS = Object.entries(CLUSTER_CENTER)
  .map(([id, pos]) => ({ id, vec: new THREE.Vector3(...pos) }));

/* shared temp objects */
const _v3 = new THREE.Vector3();
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();


/* ------------------------------------------------------------------ */
/*  CameraWatcher — drives scope state each frame                      */
/* ------------------------------------------------------------------ */

function CameraWatcher({
  scopeRef, onScopeChange, controlsRef,
}: {
  scopeRef: React.RefObject<ScopeState>;
  onScopeChange: (s: ScopeLevel) => void;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const last = useRef<ScopeLevel>('galaxy');

  /* animation state */
  const animating = useRef(false);
  const animProgress = useRef(0);
  const animStartPos = useRef(new THREE.Vector3());
  const animGoalPos = useRef(new THREE.Vector3());
  const animStartTarget = useRef(new THREE.Vector3());
  const animGoalTarget = useRef(new THREE.Vector3());
  const _tmpTarget = useRef(new THREE.Vector3());

  /* company view lock */
  const lockedCompany = useRef<string | null>(null);

  useFrame(() => {
    if (!scopeRef.current) return;
    const controls = controlsRef.current;
    const dist = camera.position.length();
    scopeRef.current.distance = dist;
    scopeRef.current.cameraPos.copy(camera.position);

    /* nearest cluster */
    let nearClId: string | null = null;
    let nearClDist = Infinity;
    for (const { id, vec } of CLUSTER_VECS) {
      const d = camera.position.distanceTo(vec);
      if (d < nearClDist) { nearClDist = d; nearClId = id; }
    }
    scopeRef.current.focusedCluster = nearClDist < 55 ? nearClId : null;
    scopeRef.current.clusterFocus = 1 - smoothstep(18, 55, nearClDist);

    /* nearest company — use camera look direction so the user lands on
       the company they're actually aiming at, not just the closest one */
    let nearCoId: string | null = null;
    let nearCoDist = Infinity;
    _v3.set(0, 0, -1).applyQuaternion(camera.quaternion); // camera forward
    let bestAimScore = Infinity;
    for (const { id, vec } of COMPANY_VECS) {
      const dx = vec.x - camera.position.x;
      const dy = vec.y - camera.position.y;
      const dz = vec.z - camera.position.z;
      const actualDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const proj = dx * _v3.x + dy * _v3.y + dz * _v3.z;
      if (proj <= 0) {
        // behind camera — fallback only if nothing in front
        if (bestAimScore === Infinity && actualDist < nearCoDist) {
          nearCoDist = actualDist; nearCoId = id;
        }
        continue;
      }
      // perpendicular distance² from the look ray
      const perpSq = dx * dx + dy * dy + dz * dz - proj * proj;
      // score: strongly prefer companies on the aim line
      const score = perpSq * 5 + actualDist;
      if (score < bestAimScore) {
        bestAimScore = score; nearCoId = id; nearCoDist = actualDist;
      }
    }

    /* natural scope values */
    scopeRef.current.focusedCompany = nearCoDist < 14 ? nearCoId : null;
    scopeRef.current.companyFocus = 1 - smoothstep(4, 14, nearCoDist);

    /* ── Locked company view override ── */
    if (lockedCompany.current) {
      const compVec = COMPANY_VECS.find(c => c.id === lockedCompany.current)?.vec;
      if (compVec) {
        const d = camera.position.distanceTo(compVec);
        if (d > 35 && !animating.current) {
          /* user scrolled far enough — release lock, restore constraints */
          lockedCompany.current = null;
          if (controls) {
            controls.minPolarAngle = Math.PI * 0.15;
            controls.maxPolarAngle = Math.PI * 0.85;
          }
        } else {
          /* force company scope — always 1 when locked.
             Node emergence is already smoothed by lerps in NodeSphere,
             so there's no visual pop. This prevents the flicker loop where
             a low ramping value drops lvl back to 'cluster' mid-animation. */
          scopeRef.current.focusedCompany = lockedCompany.current;
          scopeRef.current.companyFocus = 1;
        }
      }
    }

    /* auto-rotate */
    if (controls && !animating.current) {
      controls.autoRotateSpeed = lockedCompany.current ? 0 : dist > 80 ? 0.1 : dist > 40 ? 0.03 : 0;
    }

    const lvl = getScopeLevel(scopeRef.current.clusterFocus, scopeRef.current.companyFocus);

    /* ── Trigger camera transition on scope change ── */
    if (lvl !== last.current) {
      if (lvl === 'company' && nearCoId && POS3D[nearCoId] && controls) {
        const compPos = new THREE.Vector3(...POS3D[nearCoId]);

        /* save current positions */
        animStartPos.current.copy(camera.position);
        animStartTarget.current.copy(controls.target);

        /* goal: angled top-down view of the wider flat layout */
        animGoalTarget.current.copy(compPos);
        animGoalPos.current.copy(compPos).add(new THREE.Vector3(0, 28, 20));

        animProgress.current = 0;
        animating.current = true;
        lockedCompany.current = nearCoId;

        /* disable controls so they don't fight the animation */
        controls.enabled = false;
        controls.autoRotate = false;

        /* relax polar constraints for top-down-ish view */
        controls.minPolarAngle = 0.05;
        controls.maxPolarAngle = Math.PI * 0.95;
      }
      last.current = lvl;
      onScopeChange(lvl);
    }

    /* ── Deterministic camera animation ── */
    if (animating.current && controls) {
      animProgress.current = Math.min(1, animProgress.current + 0.025);
      const t = smoothstep(0, 1, animProgress.current);

      /* direct interpolation — no incremental drift */
      camera.position.lerpVectors(animStartPos.current, animGoalPos.current, t);
      _tmpTarget.current.lerpVectors(animStartTarget.current, animGoalTarget.current, t);
      controls.target.copy(_tmpTarget.current);
      controls.update();

      if (animProgress.current >= 1) {
        animating.current = false;
        controls.enabled = true;
        controls.autoRotate = false;
        controls.update();
      }
    }
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  IndustryBubble — large transparent sphere per cluster               */
/* ------------------------------------------------------------------ */

function IndustryBubble({
  node, position, radius,
}: {
  node: TwinNode; position: [number, number, number]; radius: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const solidMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const wireMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const scopeRef = useScope();
  const color = INDUSTRY_CLR[node.id] || '#0ea5e9';

  useFrame((state) => {
    if (!groupRef.current || !solidMatRef.current || !wireMatRef.current) return;
    const t = state.clock.elapsedTime;
    const s = scopeRef.current;
    if (!s?.cameraPos) return;

    const clF = s.clusterFocus;
    const isFocusedCluster = s.focusedCluster === node.id;

    let alpha: number;
    if (s.companyFocus > 0.1) {
      alpha = Math.max(0, 1 - s.companyFocus * 4);
    } else if (clF > 0.1) {
      alpha = isFocusedCluster ? Math.max(0, 1 - clF * 1.8) : Math.max(0, 1 - clF * 4);
    } else {
      alpha = 1;
    }

    solidMatRef.current.opacity = alpha * 0.07;
    wireMatRef.current.opacity = alpha * 0.1;
    groupRef.current.visible = alpha > 0.008;

    groupRef.current.rotation.y = t * 0.018;
    groupRef.current.rotation.x = Math.sin(t * 0.012) * 0.06;
    const pulse = 1 + Math.sin(t * 0.25 + position[0] * 0.08) * 0.015;
    groupRef.current.scale.setScalar(pulse);

    if (labelRef.current) labelRef.current.style.opacity = String(alpha);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <icosahedronGeometry args={[radius, 2]} />
        <meshStandardMaterial
          ref={solidMatRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.08}
          transparent
          opacity={0.07}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[radius * 1.01, 1]} />
        <meshBasicMaterial
          ref={wireMatRef}
          color={color}
          wireframe
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>
      <Html center distanceFactor={80} style={{ pointerEvents: 'none', userSelect: 'none' }} zIndexRange={[10, 0]}>
        <div ref={labelRef} className="text-center whitespace-nowrap">
          <div className="text-sm font-semibold tracking-wide" style={{ color, textShadow: `0 0 12px ${color}40` }}>
            {node.label}
          </div>
          {node.description && <div className="text-[9px] text-gray-500 mt-0.5">{node.description}</div>}
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  NodeSphere — companies, departments, features                      */
/* ------------------------------------------------------------------ */

function NodeSphere({
  node, position, parentPosition, isSelected, isHovered, onClick, onPointerEnter, onPointerLeave,
}: {
  node: TwinNode;
  position: [number, number, number];
  parentPosition: [number, number, number] | null;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const wireMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const statusRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const baseScale = SCALE[node.type] ?? 1;
  const color = nodeColor(node);
  const isYou = node.id === 'comp-you';
  const isCompany = node.type === 'company';
  const isFeature = node.type === 'feature';
  const isDept = node.type === 'department';
  const hasEmergence = parentPosition !== null;
  const scopeRef = useScope();

  const animOp = useRef(0);
  const animEmerge = useRef(0);
  const animReveal = useRef(isCompany ? 0 : 1);
  const animScale = useRef(0.01);

  const posVec = useMemo(() => new THREE.Vector3(...position), [position]);
  const parentVec = useMemo(
    () => parentPosition ? new THREE.Vector3(...parentPosition) : null,
    [parentPosition],
  );
  const flatPos = FLAT_POS[node.id];
  const flatVec = useMemo(
    () => flatPos ? new THREE.Vector3(...flatPos) : null,
    [flatPos],
  );

  useFrame((state) => {
    if (!meshRef.current || !matRef.current || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    const s = scopeRef.current;
    if (!s?.cameraPos) return;

    const camToNode = _v3.copy(s.cameraPos).distanceTo(posVec);
    const scope = getNodeScope(camToNode, node.type, node.id, s);

    /* smooth animated values */
    animOp.current = THREE.MathUtils.lerp(animOp.current, scope.opacity, 0.25);
    animEmerge.current = THREE.MathUtils.lerp(animEmerge.current, scope.emergeFactor, 0.18);
    if (isCompany) {
      animReveal.current = THREE.MathUtils.lerp(animReveal.current, scope.revealFactor, 0.18);
    }

    const op = animOp.current;
    const emerge = animEmerge.current;
    const reveal = animReveal.current;

    const isVisible = op > 0.01;
    groupRef.current.visible = isVisible;
    if (!isVisible) {
      if (labelRef.current) labelRef.current.style.opacity = '0';
      return;
    }

    /* emergence animation: parent → 3D pos → flat 2D pos */
    if (hasEmergence && parentVec) {
      groupRef.current.position.lerpVectors(parentVec, posVec, emerge);
    } else {
      groupRef.current.position.set(...position);
    }

    /* flat 2D layout transition in company view */
    if (flatVec && s.focusedCompany && EMERGE_PARENT[node.id] === s.focusedCompany && s.companyFocus > 0.2) {
      const flatT = smoothstep(0.2, 0.7, s.companyFocus);
      groupRef.current.position.lerp(flatVec, flatT);
    }

    /* material */
    matRef.current.transparent = true;
    matRef.current.opacity = op;
    matRef.current.depthWrite = op > 0.5;

    /* company: dark-to-coloured transition */
    if (isCompany && !isYou) {
      _c1.set(0x12121f);
      _c2.set(color);
      matRef.current.color.copy(_c1).lerp(_c2, reveal);
      matRef.current.emissive.copy(_c1).lerp(_c2, reveal * 0.4);
      matRef.current.emissiveIntensity = THREE.MathUtils.lerp(0.02, 0.3, reveal);
      matRef.current.metalness = THREE.MathUtils.lerp(0.9, 0.6, reveal);
      matRef.current.roughness = THREE.MathUtils.lerp(0.6, 0.25, reveal);
    } else if (isYou) {
      matRef.current.emissiveIntensity = 0.4;
      matRef.current.metalness = 0.5;
      matRef.current.roughness = 0.2;
    } else {
      matRef.current.emissiveIntensity = (isSelected ? 1.0 : isHovered ? 0.55 : 0.25) * op;
    }

    /* company wireframe — only in cluster view (not in flat company view) */
    if (isCompany && wireRef.current && wireMatRef.current) {
      const isFocused = s.focusedCompany === node.id;
      if (isFocused && s.companyFocus < 0.5) {
        const dissolve = 1 - smoothstep(10, 22, camToNode);
        wireRef.current.visible = dissolve > 0.05;
        wireMatRef.current.opacity = dissolve * 0.4;
        wireRef.current.scale.setScalar(meshRef.current.scale.x * 1.02);
      } else {
        wireRef.current.visible = false;
      }
    }

    /* floating (reduced in company view for stability) */
    const floatAmp = s.companyFocus > 0.5 && (isDept || isFeature) ? 0.05 : 0.2;
    meshRef.current.position.y = Math.sin(t * 0.5 + position[0] * 0.3) * floatAmp;

    /* feature rotation */
    if (isFeature) {
      meshRef.current.rotation.y = t * 0.3;
      meshRef.current.rotation.x = t * 0.15;
    }

    /* scale — departments and features scale up in company view */
    const companyViewBoost = (isDept || isFeature) && s.companyFocus > 0.3
      ? THREE.MathUtils.lerp(1, 1.5, smoothstep(0.3, 0.8, s.companyFocus))
      : 1;
    const interactMult = isSelected ? 1.35 : isHovered ? 1.18 : 1;
    const targetScale = baseScale * scope.scaleMult * interactMult * companyViewBoost;
    animScale.current = THREE.MathUtils.lerp(animScale.current, Math.max(0.01, targetScale), 0.18);
    meshRef.current.scale.setScalar(animScale.current);

    if (isYou) meshRef.current.rotation.y = t * 0.15;

    /* glow */
    if (glowRef.current && glowMatRef.current) {
      const gs = animScale.current * (1.7 + Math.sin(t * 1.5) * 0.12);
      glowRef.current.scale.setScalar(gs);
      glowMatRef.current.opacity = (isSelected ? 0.14 : isHovered ? 0.09 : isYou ? 0.06 : 0.03) * op;
    }

    if (ringMatRef.current) ringMatRef.current.opacity = isYou ? Math.max(0.12, 0.25 * op * reveal) : 0.25 * op * reveal;
    if (statusRef.current) statusRef.current.visible = op > 0.3 && reveal > 0.5;

    /* label */
    if (labelRef.current) {
      const labelOp = isYou
        ? op
        : isCompany
          ? Math.max(0, reveal - 0.3) * 1.5 * op
          : op;
      labelRef.current.style.opacity = String(Math.max(0, labelOp - 0.05));
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial ref={glowMatRef} color={color} transparent opacity={0.03} depthWrite={false} />
      </mesh>

      {/* core shape */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={(e) => { e.stopPropagation(); onPointerEnter(); }}
        onPointerLeave={(e) => { e.stopPropagation(); onPointerLeave(); }}
      >
        {isFeature
          ? <boxGeometry args={[1.4, 1.4, 1.4]} />
          : <sphereGeometry args={[1, 32, 32]} />
        }
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          roughness={isFeature ? 0.15 : 0.25}
          metalness={isFeature ? 0.8 : 0.6}
          transparent
        />
      </mesh>

      {/* wireframe overlay for company dissolution */}
      {isCompany && (
        <mesh ref={wireRef} visible={false}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            ref={wireMatRef}
            color={color}
            wireframe
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ring for your company */}
      {isYou && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseScale * 1.6, baseScale * 1.75, 64]} />
          <meshBasicMaterial ref={ringMatRef} color="#22d3ee" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* status dot */}
      {node.status && node.type !== 'signal' && node.type !== 'feature' && (
        <mesh ref={statusRef} position={[baseScale * 0.65, baseScale * 0.65, baseScale * 0.4]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshBasicMaterial
            color={node.status === 'healthy' ? '#10b981' : node.status === 'warning' ? '#f59e0b' : '#ef4444'}
          />
        </mesh>
      )}

      {/* label */}
      <Html
        center
        distanceFactor={48}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        zIndexRange={[10, 0]}
      >
        <div
          ref={labelRef}
          className="whitespace-nowrap text-center"
          style={{
            transform: 'translateY(22px)',
            transition: 'opacity 0.15s',
            pointerEvents: isFeature ? 'auto' : 'none',
            cursor: isFeature ? 'pointer' : 'default',
          }}
          onClick={isFeature ? (e) => { e.stopPropagation(); onClick(); } : undefined}
        >
          <span
            className={`px-1.5 py-0.5 rounded ${
              isFeature
                ? 'text-[10px] text-sky-300 bg-sky-950/70 border border-sky-500/20'
                : isDept
                  ? 'text-[10px] text-teal-300 bg-teal-950/70 border border-teal-500/20'
                  : node.type === 'kpi'
                    ? 'text-[9px] text-pink-300 bg-pink-950/50'
                    : isYou
                      ? 'text-[11px] text-cyan-300 font-bold bg-cyan-950/60 ring-1 ring-cyan-400/40'
                      : isSelected || isHovered
                        ? 'text-[11px] text-white bg-white/10'
                        : 'text-[11px] text-gray-500'
            }`}
          >
            {isFeature
              ? node.label
              : isYou
                ? <>{'★ '}{node.label}</>
                : node.label}
          </span>
          {isFeature && node.description && (
            <div className="text-[8px] text-gray-500 mt-0.5">{node.description}</div>
          )}
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  ScopedEdgeLine                                                     */
/* ------------------------------------------------------------------ */

function ScopedEdgeLine({
  fromId, toId, fromPos, toPos, isActive, isCompetitor, isSignal, isKpi, isFeatureEdge, strength,
  fromType, toType,
}: {
  fromId: string; toId: string;
  fromPos: [number, number, number]; toPos: [number, number, number];
  isActive: boolean; isCompetitor: boolean; isSignal: boolean;
  isKpi: boolean; isFeatureEdge: boolean;
  strength: number; fromType: string; toType: string;
}) {
  const lineRef = useRef<any>(null);
  const scopeRef = useScope();
  const fromVec = useMemo(() => new THREE.Vector3(...fromPos), [fromPos]);
  const toVec = useMemo(() => new THREE.Vector3(...toPos), [toPos]);

  useFrame(() => {
    if (!lineRef.current) return;
    const s = scopeRef.current;
    if (!s?.cameraPos) return;

    const camToFrom = s.cameraPos.distanceTo(fromVec);
    const camToTo = s.cameraPos.distanceTo(toVec);
    const fromScope = getNodeScope(camToFrom, fromType, fromId, s);
    const toScope = getNodeScope(camToTo, toType, toId, s);
    let edgeOp = Math.min(fromScope.opacity, toScope.opacity);

    /* Hide edges whose endpoints are internal to the focused company —
       the CompanyViewLinks component renders correct flat-layout connections */
    if (s.focusedCompany && s.companyFocus > 0.3) {
      const fromInternal = fromId === s.focusedCompany || EMERGE_PARENT[fromId] === s.focusedCompany;
      const toInternal = toId === s.focusedCompany || EMERGE_PARENT[toId] === s.focusedCompany;
      if (fromInternal && toInternal) {
        edgeOp *= Math.max(0, 1 - smoothstep(0.3, 0.6, s.companyFocus));
      }
    }

    const mat = lineRef.current.material as any;
    const baseOp = isActive ? 0.55 : strength * 0.18;
    mat.opacity = baseOp * edgeOp;
    lineRef.current.visible = edgeOp > 0.02;
  });

  const color = isFeatureEdge ? '#64748b' : isKpi ? '#f472b6' : isCompetitor ? '#ef4444' : isSignal ? '#f59e0b' : '#0ea5e9';

  return (
    <Line
      ref={lineRef as never}
      points={[fromPos, toPos]}
      color={color}
      lineWidth={isFeatureEdge ? 0.8 : isKpi ? 0.5 : isActive ? 2.5 : 0.7}
      transparent
      opacity={isActive ? 0.55 : strength * 0.18}
      dashed={isCompetitor || isSignal || isFeatureEdge}
      dashSize={isFeatureEdge ? 0.4 : isCompetitor ? 0.5 : 0.8}
      gapSize={0.3}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  CompanyViewLink — connecting line for flat 2D layout                */
/* ------------------------------------------------------------------ */

function CompanyViewLink({
  from, to, companyId, color, lineWidth, dashed,
}: {
  from: [number, number, number];
  to: [number, number, number];
  companyId: string;
  color: string;
  lineWidth: number;
  dashed?: boolean;
}) {
  const lineRef = useRef<any>(null);
  const scopeRef = useScope();

  useFrame(() => {
    if (!lineRef.current) return;
    const s = scopeRef.current;
    if (!s) return;
    const visible = s.focusedCompany === companyId && s.companyFocus > 0.3;
    lineRef.current.visible = visible;
    if (visible && lineRef.current.material) {
      lineRef.current.material.opacity = smoothstep(0.4, 0.8, s.companyFocus) * 0.5;
    }
  });

  return (
    <Line
      ref={lineRef as never}
      points={[from, to]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={0}
      dashed={dashed}
      dashSize={0.4}
      gapSize={0.25}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  CompanyViewLinks — all connections for the flat company view        */
/* ------------------------------------------------------------------ */

function CompanyViewLinks() {
  const links = useMemo(() => {
    const result: Array<{
      key: string;
      from: [number, number, number];
      to: [number, number, number];
      companyId: string;
      color: string;
      lineWidth: number;
      dashed?: boolean;
    }> = [];

    for (const compId of Object.keys(COMPANY_CHILDREN)) {
      const compPos = POS3D[compId];
      if (!compPos) continue;
      const children = COMPANY_CHILDREN[compId];

      for (const childId of children) {
        const flatPos = FLAT_POS[childId];
        if (!flatPos) continue;
        const isDept = childId.startsWith('dept-');
        const isFeat = childId.startsWith('feat-');
        if (!isDept && !isFeat) continue;

        // Line from company center to child
        result.push({
          key: `cv-${compId}-${childId}`,
          from: compPos,
          to: flatPos,
          companyId: compId,
          color: isDept ? '#2dd4bf' : '#64748b',
          lineWidth: isDept ? 1.5 : 1,
          dashed: isFeat,
        });
      }
    }

    return result;
  }, []);

  return (
    <>
      {links.map(({ key, ...rest }) => <CompanyViewLink key={key} {...rest} />)}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

function Scene({
  nodes, edges, selectedNode, hoveredNode, onSelect, onHover, onScopeChange, onNavigate, clusterFilter,
}: Graph3DProps & { onScopeChange: (s: ScopeLevel) => void; clusterFilter: ClusterFilter }) {
  const scopeRef = useRef<ScopeState>({
    distance: 120,
    cameraPos: new THREE.Vector3(0, 20, 120),
    focusedCluster: null,
    clusterFocus: 0,
    focusedCompany: null,
    companyFocus: 0,
    clusterFilter: 'all',
  });
  // Sync filter from React state into the scope ref (read by useFrame callbacks)
  scopeRef.current.clusterFilter = clusterFilter;
  const controlsRef = useRef<any>(null);

  const industryNodes = useMemo(() => nodes.filter(n => n.type === 'industry'), [nodes]);
  const otherNodes = useMemo(() => nodes.filter(n => n.type !== 'industry' && n.type !== 'kpi'), [nodes]);

  const processed = useMemo(() => {
    return edges
      .map((e) => {
        const fn = nodes.find((n) => n.id === e.from);
        const tn = nodes.find((n) => n.id === e.to);
        if (!fn || !tn || !POS3D[e.from] || !POS3D[e.to]) return null;
        if (fn.type === 'kpi' || tn.type === 'kpi') return null;
        return {
          fromId: e.from, toId: e.to,
          fromPos: POS3D[e.from], toPos: POS3D[e.to],
          fromType: fn.type, toType: tn.type,
          isActive: selectedNode === e.from || selectedNode === e.to ||
                    hoveredNode === e.from || hoveredNode === e.to,
          isCompetitor: !!e.label?.includes('competitor'),
          isSignal: e.from.startsWith('sig-'),
          isKpi: false,
          isFeatureEdge: fn.type === 'feature' || tn.type === 'feature',
          strength: e.strength,
        };
      })
      .filter(Boolean) as Array<{
        fromId: string; toId: string;
        fromPos: [number, number, number]; toPos: [number, number, number];
        fromType: string; toType: string;
        isActive: boolean; isCompetitor: boolean; isSignal: boolean;
        isKpi: boolean; isFeatureEdge: boolean; strength: number;
      }>;
  }, [edges, nodes, selectedNode, hoveredNode]);

  const handleNodeClick = useCallback((node: TwinNode) => {
    if (node.type === 'feature' && node.route && onNavigate) {
      onNavigate(node.route);
      return;
    }
    onSelect(selectedNode === node.id ? null : node.id);
  }, [selectedNode, onSelect, onNavigate]);

  return (
    <ScopeCtx.Provider value={scopeRef}>
      <CameraWatcher scopeRef={scopeRef} onScopeChange={onScopeChange} controlsRef={controlsRef} />

      <ambientLight intensity={0.1} />
      <pointLight position={[40, 25, 50]} intensity={0.8} color="#0ea5e9" />
      <pointLight position={[-30, -20, 40]} intensity={0.5} color="#22d3ee" />
      <pointLight position={[0, 30, -40]} intensity={0.3} color="#ec4899" />

      <Stars radius={400} depth={150} count={8000} factor={6} saturation={0.15} fade speed={0.3} />
      <fog attach="fog" args={['#06061a', 130, 300]} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.04}
        maxDistance={200}
        minDistance={8}
        autoRotate
        autoRotateSpeed={0.1}
        enablePan
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.15}
      />

      {/* industry bubbles */}
      {industryNodes.map((node) => {
        const pos = CLUSTER_CENTER[node.id];
        if (!pos) return null;
        return (
          <IndustryBubble
            key={node.id}
            node={node}
            position={pos}
            radius={BUBBLE_RADIUS[node.id] ?? 10}
          />
        );
      })}

      {/* edges */}
      {processed.map((e, i) => <ScopedEdgeLine key={i} {...e} />)}

      {/* flat layout connections for company view */}
      <CompanyViewLinks />

      {/* nodes (non-industry) */}
      {otherNodes.map((node) => {
        const pos = POS3D[node.id];
        if (!pos) return null;
        const parentId = EMERGE_PARENT[node.id];
        const parentPos = parentId ? POS3D[parentId] ?? null : null;
        return (
          <NodeSphere
            key={node.id}
            node={node}
            position={pos}
            parentPosition={parentPos}
            isSelected={selectedNode === node.id}
            isHovered={hoveredNode === node.id}
            onClick={() => handleNodeClick(node)}
            onPointerEnter={() => onHover(node.id)}
            onPointerLeave={() => onHover(null)}
          />
        );
      })}
    </ScopeCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Scope HUD                                                          */
/* ------------------------------------------------------------------ */

const SCOPE_HUD: Record<ScopeLevel, { label: string; desc: string; color: string }> = {
  galaxy:  { label: 'Galaxy View',  desc: 'Industry constellations', color: '#64748b' },
  cluster: { label: 'Cluster View', desc: 'Companies & competitors', color: '#818cf8' },
  company: { label: 'Company View', desc: 'Departments & modules',   color: '#2dd4bf' },
};

/* ------------------------------------------------------------------ */
/*  Exported wrapper                                                   */
/* ------------------------------------------------------------------ */

const FILTER_OPTIONS: { value: ClusterFilter; label: string; color: string }[] = [
  { value: 'all',         label: 'All',         color: '#818cf8' },
  { value: 'competitors', label: 'Competitors',  color: '#ef4444' },
  { value: 'allies',      label: 'Allies',       color: '#34d399' },
];

export default function Graph3D(props: Graph3DProps) {
  const [scope, setScope] = useState<ScopeLevel>('galaxy');
  const [clusterFilter, setClusterFilter] = useState<ClusterFilter>('all');
  const handleScopeChange = useCallback((s: ScopeLevel) => {
    setScope(s);
    if (s !== 'cluster') setClusterFilter('all'); // reset on scope change
  }, []);
  const hud = SCOPE_HUD[scope];

  return (
    <div className="w-full h-full overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 20, 120], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene {...props} onScopeChange={handleScopeChange} clusterFilter={clusterFilter} />
      </Canvas>

      {/* Scope HUD */}
      <div
        className="absolute top-[4.5rem] left-4 px-3 py-2 rounded-lg border backdrop-blur-md transition-all duration-500"
        style={{
          background: 'rgba(6, 6, 26, 0.7)',
          borderColor: `${hud.color}33`,
          boxShadow: `0 0 20px ${hud.color}15`,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hud.color, boxShadow: `0 0 6px ${hud.color}` }} />
          <span className="text-xs font-medium" style={{ color: hud.color }}>{hud.label}</span>
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5 ml-4">{hud.desc}</p>
      </div>

      {/* Cluster filter toggle — visible only in cluster view */}
      {scope === 'cluster' && (
        <div
          className="absolute top-[4.5rem] right-4 flex gap-1 p-1 rounded-lg border backdrop-blur-md transition-all duration-300"
          style={{ background: 'rgba(6, 6, 26, 0.8)', borderColor: 'rgba(129, 140, 248, 0.2)' }}
        >
          {FILTER_OPTIONS.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setClusterFilter(value)}
              className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200"
              style={{
                background: clusterFilter === value ? `${color}20` : 'transparent',
                color: clusterFilter === value ? color : '#6b7280',
                boxShadow: clusterFilter === value ? `0 0 8px ${color}15` : 'none',
                border: clusterFilter === value ? `1px solid ${color}40` : '1px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Zoom hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 flex items-center gap-3">
        <span>Scroll to explore</span>
        <span className="text-gray-700">|</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500/50" /> Galaxy
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500/50" /> Cluster
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500/50" /> Company
        </span>
      </div>
    </div>
  );
}
