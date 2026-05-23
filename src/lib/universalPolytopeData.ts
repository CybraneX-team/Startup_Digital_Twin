// Add 'inactive' domain for the 20 non-department nodes
export type UDomain = 'direction' | 'build' | 'delivery' | 'market' | 'control' | 'people' | 'inactive';

export const U_DOMAIN_COLOR: Record<UDomain, string> = {
  direction: '#fde047',
  build:     '#8b5cf6',
  delivery:  '#06b6d4',
  market:    '#f97316',
  control:   '#10b981',
  people:    '#0ea5e9',
  inactive:  '#ef4444', // Red for non-department nodes
};

export interface UInternalNode {
  id: string;
  label: string;
  type: 'team' | 'process' | 'project' | 'resource' | 'decision' | 'risk' | 'metric';
  score: number;
  children?: UInternalNode[];
}

export interface UExternalNode {
  id: string;
  label: string;
  domain: UDomain;
  cluster: string;
  score: number;
  metrics: {
    performance: number;
    efficiency: number;
    capacity: number;
    alignment: number;
    risk: number;
  };
  internalNodes: UInternalNode[];
}

// Generate 25 nodes: 13 working departments, 12 inactive/non-department
const activeDomains: UDomain[] = ['direction', 'build', 'delivery', 'market', 'control', 'people'];
const activeClusters = ['Direction', 'Build', 'Delivery', 'Market', 'Control', 'People'];

function generateChildren(parentId: string, level: number, maxLevel: number): UInternalNode[] {
  if (level > maxLevel) return [];
  // Number of children drops as level increases (4 -> 3 -> 2 -> 1)
  const numChildren = Math.max(1, 5 - level);
  const types: ('team' | 'process' | 'project' | 'resource' | 'decision' | 'risk' | 'metric')[] = ['process', 'team', 'project', 'risk', 'metric', 'resource', 'decision'];
  
  return Array.from({ length: numChildren }).map((_, i) => ({
    id: `${parentId}_${level}_${i}`,
    label: level === 1 ? ['Process Alpha', 'Core Team', 'Data Pipeline', 'Security Risk', 'Key Metrics'][i] || `Level ${level}-${i+1}` : `Sub-Level ${level}-${i+1}`,
    type: types[i % types.length],
    score: 60 + Math.random() * 40,
    children: generateChildren(`${parentId}_${level}_${i}`, level + 1, maxLevel)
  }));
}

export const U_NODES: UExternalNode[] = Array.from({ length: 25 }).map((_, i) => {
  // Alternate active/inactive to evenly distribute them across the fibonacci sphere
  // Since length is 25, i % 2 === 0 gives exactly 13 active and 12 inactive
  const isActive = i % 2 === 0;
  
  if (isActive) {
    const domainIdx = i % activeDomains.length;
    return {
      id: `dept_${i}`,
      label: `Department ${i + 1}`,
      domain: activeDomains[domainIdx],
      cluster: activeClusters[domainIdx],
      score: 70 + Math.random() * 25,
      metrics: {
        performance: 80 + Math.random() * 15,
        efficiency: 75 + Math.random() * 20,
        capacity: 80 + Math.random() * 20,
        alignment: 85 + Math.random() * 15,
        risk: 10 + Math.random() * 20,
      },
      internalNodes: generateChildren(`int_${i}`, 1, 4)
    };
  } else {
    // 12 inactive nodes
    return {
      id: `node_${i}`,
      label: `Unallocated Node ${i + 1}`,
      domain: 'inactive',
      cluster: 'None',
      score: 0,
      metrics: { performance: 0, efficiency: 0, capacity: 0, alignment: 0, risk: 0 },
      internalNodes: [] 
    };
  }
});
