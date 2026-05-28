import * as THREE from 'three';

// ── Symmetric Polytope Vertex Directions ─────────────────────────────────────

/** Icosahedron (12 vertices) — most uniform packing possible for 12 pts */
export function icosahedronDirs(): THREE.Vector3[] {
  const t = (1 + Math.sqrt(5)) / 2;
  const v: [number, number, number][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  return v.map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
}

/** Dodecahedron (20 vertices) — dual of icosahedron, perfect 5-fold symmetry */
export function dodecahedronDirs(): THREE.Vector3[] {
  const p = (1 + Math.sqrt(5)) / 2;
  const q = 1 / p;
  const v: [number, number, number][] = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    [0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p],
    [q, p, 0], [q, -p, 0], [-q, p, 0], [-q, -p, 0],
    [p, 0, q], [p, 0, -q], [-p, 0, q], [-p, 0, -q],
  ];
  return v.map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
}

/** Icosidodecahedron (30 vertices) — edge-midpoints of icosahedron */
export function icosidodecahedronDirs(): THREE.Vector3[] {
  const p = (1 + Math.sqrt(5)) / 2;
  const v: [number, number, number][] = [
    [0, 1, p], [0, -1, p], [0, 1, -p], [0, -1, -p],
    [1, p, 0], [-1, p, 0], [1, -p, 0], [-1, -p, 0],
    [p, 0, 1], [p, 0, -1], [-p, 0, 1], [-p, 0, -1],
    [1, p, 0], [-1, p, 0], [1, -p, 0], [-1, -p, 0],
    [0.5, p / 2, (p * p) / 2], [0.5, p / 2, -(p * p) / 2],
    [0.5, -p / 2, (p * p) / 2], [0.5, -p / 2, -(p * p) / 2],
    [-0.5, p / 2, (p * p) / 2], [-0.5, p / 2, -(p * p) / 2],
    [-0.5, -p / 2, (p * p) / 2], [-0.5, -p / 2, -(p * p) / 2],
    [p / 2, (p * p) / 2, 0.5], [p / 2, -(p * p) / 2, 0.5],
    [-p / 2, (p * p) / 2, 0.5], [-p / 2, -(p * p) / 2, 0.5],
    [(p * p) / 2, 0.5, p / 2], [-(p * p) / 2, 0.5, p / 2],
  ];
  return v.slice(0, 30).map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
}

/** Geodesic fallback — greedy farthest-point sampling from icosahedron midpoints */
export function geodesicDirs(n: number): THREE.Vector3[] {
  const base = icosahedronDirs();
  const pool: THREE.Vector3[] = [...base];
  for (let a = 0; a < base.length; a++)
    for (let b = a + 1; b < base.length; b++)
      pool.push(base[a].clone().add(base[b]).normalize());

  const chosen: THREE.Vector3[] = [pool[0]];
  while (chosen.length < n) {
    let bestIdx = 0, bestDist = -1;
    for (let i = 0; i < pool.length; i++) {
      const d = Math.min(...chosen.map(c => pool[i].distanceTo(c)));
      if (d > bestDist) { bestDist = d; bestIdx = i; }
    }
    chosen.push(pool[bestIdx]);
  }
  return chosen;
}

/** Select the most symmetric layout for the exact node count */
export function symmetricDirs(n: number): THREE.Vector3[] {
  if (n === 12) return icosahedronDirs();
  if (n === 20) return dodecahedronDirs();
  if (n === 30) return icosidodecahedronDirs();
  return geodesicDirs(n);
}

/** Seeded Fisher-Yates shuffle — deterministic, so node positions are stable across renders */
export function seededShuffle<T>(arr: T[], seed = 42): T[] {
  const a = [...arr];
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
