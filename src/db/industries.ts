import type { IndustryRecord } from './schema';

/* ================================================================
   15 global industries — each has a 3D cluster center, color, and radius.
   All company positions are stored as offsets relative to these centers.
================================================================ */

export const INDUSTRIES: IndustryRecord[] = [
  {
    id: 'ind-saas',
    label: 'SaaS',
    description: 'Software as a Service — subscription cloud products',
    color: '#C1AEFF',          // CTA lavender — your home industry
    position3D: [0, 0, 0],
    bubbleRadius: 14,
    tags: ['b2b', 'global', 'india', 'high-margin'],
  },
  {
    id: 'ind-fintech',
    label: 'FinTech',
    description: 'Payments, lending, neo-banking, wealth management',
    color: '#22d3ee',
    position3D: [-70, -10, -55],
    bubbleRadius: 12,
    tags: ['b2c', 'india', 'global', 'regulated'],
  },
  {
    id: 'ind-healthtech',
    label: 'HealthTech',
    description: 'Digital health, pharma, diagnostics, fitness',
    color: '#34d399',
    position3D: [70, -10, -55],
    bubbleRadius: 11,
    tags: ['b2c', 'india', 'regulated', 'ai-driven'],
  },
  {
    id: 'ind-edtech',
    label: 'EdTech',
    description: 'Online learning, upskilling, K-12, higher education',
    color: '#fb923c',
    position3D: [-60, 20, 60],
    bubbleRadius: 11,
    tags: ['b2c', 'india', 'global', 'consumer'],
  },
  {
    id: 'ind-ecommerce',
    label: 'E-Commerce',
    description: 'Marketplace, D2C, quick commerce, social commerce',
    color: '#f472b6',
    position3D: [60, 20, 60],
    bubbleRadius: 12,
    tags: ['b2c', 'india', 'global', 'logistics-heavy'],
  },
  {
    id: 'ind-aiml',
    label: 'AI / ML',
    description: 'Foundation models, AI infra, LLMs, MLOps',
    color: '#F9C6FF',
    position3D: [0, -35, -75],
    bubbleRadius: 12,
    tags: ['b2b', 'global', 'india', 'deep-tech'],
  },
  {
    id: 'ind-cleantech',
    label: 'CleanTech',
    description: 'Solar, wind, EVs, green hydrogen, carbon markets',
    color: '#4ade80',
    position3D: [0, 35, 75],
    bubbleRadius: 11,
    tags: ['india', 'global', 'impact', 'capital-intensive'],
  },
  {
    id: 'ind-logistics',
    label: 'Logistics',
    description: '3PL, last-mile delivery, supply chain tech',
    color: '#fbbf24',
    position3D: [-80, 5, 0],
    bubbleRadius: 10,
    tags: ['b2b', 'india', 'operations-heavy'],
  },
  {
    id: 'ind-gaming',
    label: 'Gaming',
    description: 'Mobile gaming, fantasy sports, esports, casual games',
    color: '#a78bfa',
    position3D: [80, -5, 0],
    bubbleRadius: 10,
    tags: ['b2c', 'india', 'consumer', 'high-engagement'],
  },
  {
    id: 'ind-mobility',
    label: 'Mobility',
    description: 'Ride-hailing, EV fleets, micro-mobility, autonomous',
    color: '#38bdf8',
    position3D: [0, 80, 0],
    bubbleRadius: 10,
    tags: ['b2c', 'india', 'global', 'unit-economics-hard'],
  },
  {
    id: 'ind-media',
    label: 'Media',
    description: 'Short video, news, content platforms, OTT',
    color: '#f87171',
    position3D: [0, -80, 0],
    bubbleRadius: 10,
    tags: ['b2c', 'india', 'ad-driven', 'vernacular'],
  },
  {
    id: 'ind-agritech',
    label: 'AgriTech',
    description: 'Farm-to-fork, precision agri, agri-input supply chains',
    color: '#86efac',
    position3D: [-50, -55, 40],
    bubbleRadius: 9,
    tags: ['b2b', 'india', 'impact', 'rural'],
  },
  {
    id: 'ind-cyber',
    label: 'Cybersecurity',
    description: 'Threat intelligence, endpoint, SOC-as-a-Service, VAPT',
    color: '#94a3b8',
    position3D: [50, 55, -40],
    bubbleRadius: 9,
    tags: ['b2b', 'india', 'global', 'compliance-driven'],
  },
  {
    id: 'ind-space',
    label: 'SpaceTech',
    description: 'Micro-launchers, earth observation, satellite comms',
    color: '#e2e8f0',
    position3D: [-45, 50, -55],
    bubbleRadius: 9,
    tags: ['deep-tech', 'india', 'global', 'govt-adjacent'],
  },
  {
    id: 'ind-proptech',
    label: 'PropTech',
    description: 'Real estate discovery, rental, fractional ownership',
    color: '#fdba74',
    position3D: [45, -50, 55],
    bubbleRadius: 9,
    tags: ['b2c', 'india', 'high-ticket', 'marketplace'],
  },
];

export const INDUSTRY_MAP = new Map<string, IndustryRecord>(
  INDUSTRIES.map(i => [i.id, i])
);
