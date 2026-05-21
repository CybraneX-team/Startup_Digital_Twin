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

// Generate 100 nodes: 80 working departments, 20 inactive/non-department
const activeDomains: UDomain[] = ['direction', 'build', 'delivery', 'market', 'control', 'people'];
const activeClusters = ['Direction', 'Build', 'Delivery', 'Market', 'Control', 'People'];

export const U_NODES: UExternalNode[] = Array.from({ length: 100 }).map((_, i) => {
  const isActive = i < 80;
  
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
      internalNodes: [
        { id: `int_${i}_1`, label: 'Process Alpha', type: 'process', score: 85 },
        { id: `int_${i}_2`, label: 'Core Team', type: 'team', score: 90 },
        { id: `int_${i}_3`, label: 'Data Pipeline', type: 'project', score: 78 },
        { id: `int_${i}_4`, label: 'Security Risk', type: 'risk', score: 45 },
        { id: `int_${i}_5`, label: 'Key Metrics', type: 'metric', score: 92 },
      ]
    };
  } else {
    // 20 inactive nodes
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
