import * as THREE from 'three';

/** World position for an internal node ring slot (must match ExternalNode layout). */
export function computeInternalNodePosition(
  deptPos: THREE.Vector3,
  nodeIndex: number,
  totalNodeCount: number,
): THREE.Vector3 {
  if (totalNodeCount <= 0) return deptPos.clone();

  const angle = (nodeIndex / totalNodeCount) * Math.PI * 2;
  const dir = deptPos.clone().normalize();
  let localUp = new THREE.Vector3(0, 1, 0);
  if (Math.abs(dir.dot(localUp)) > 0.99) localUp.set(1, 0, 0);
  const right = new THREE.Vector3().crossVectors(dir, localUp).normalize();
  const up = new THREE.Vector3().crossVectors(right, dir).normalize();
  const depthStep = 3.0;
  const childCenter = deptPos.clone().add(dir.clone().multiplyScalar(depthStep));
  const depthOffset = nodeIndex % 2 === 0 ? 0.8 : -0.8;

  return childCenter
    .clone()
    .add(dir.clone().multiplyScalar(depthOffset))
    .add(right.clone().multiplyScalar(Math.cos(angle) * 1.8))
    .add(up.clone().multiplyScalar(Math.sin(angle) * 1.8));
}

/** Position for a draft node that will be appended (index = existingCount, total = existing + 1). */
export function computeDraftInternalNodePosition(
  deptPos: THREE.Vector3,
  existingInternalCount: number,
): THREE.Vector3 {
  const total = existingInternalCount + 1;
  return computeInternalNodePosition(deptPos, existingInternalCount, total);
}
