export interface WorkspaceCanvasCard {
  id: string;
  title: string;
  subtitle?: string;
  accent: string;
  /** all geometry is a % of the canvas stage */
  x: number;
  y: number;
  w: number;
  h: number;
  variant: 'hero' | 'chart-bars' | 'list-radar' | 'avatars' | 'gauge' | 'line';
  icon?: 'trend' | 'target' | 'shield' | 'price';
  tags?: string[];
  items?: string[];
  checks?: string[];
  metric?: string;
  extra?: string;
}

export interface WorkspaceLiveSignal {
  id: string;
  title: string;
  time: string;
  tag: string;
  tagColor: string;
  trend: 'up' | 'down';
}

export interface WorkspaceFocusTask {
  id: string;
  label: string;
  done: boolean;
}

export const WORKSPACE_CANVAS_CARDS: WorkspaceCanvasCard[] = [
  {
    id: 'openai',
    title: 'OpenAI',
    subtitle: 'Company',
    accent: '#60a5fa',
    x: 35,
    y: 0,
    w: 30,
    h: 48,
    variant: 'hero',
    tags: ['AI Models', 'APIs', 'Research'],
    metric: '+12.4%',
  },
  {
    id: 'market',
    title: 'Market Opportunity',
    subtitle: 'AI productivity tools for SMBs',
    accent: '#2dd4bf',
    x: 0.5,
    y: 4,
    w: 27,
    h: 42,
    variant: 'chart-bars',
    icon: 'trend',
  },
  {
    id: 'competitors',
    title: 'Competitors',
    accent: '#fbbf24',
    x: 72.5,
    y: 4,
    w: 27,
    h: 42,
    variant: 'list-radar',
    icon: 'target',
    items: ['Anthropic', 'Google', 'Meta', 'Mistral AI'],
    extra: '+5 more',
  },
  {
    id: 'customers',
    title: 'Customers',
    accent: '#f87171',
    x: 0.5,
    y: 56,
    w: 27,
    h: 40,
    variant: 'avatars',
    items: ['SMBs', 'Founders', 'Small Teams'],
    metric: '+230',
  },
  {
    id: 'advantage',
    title: 'Our Advantage',
    accent: '#34d399',
    x: 35,
    y: 54,
    w: 30,
    h: 42,
    variant: 'gauge',
    icon: 'shield',
    checks: ['Faster onboarding', 'SMB focused', 'Affordable pricing'],
    metric: '78%',
  },
  {
    id: 'pricing',
    title: 'Pricing Strategy',
    accent: '#a78bfa',
    x: 72.5,
    y: 56,
    w: 27,
    h: 40,
    variant: 'line',
    icon: 'price',
    checks: ['Freemium Model', '$0 / $19 / $49'],
  },
];

export const WORKSPACE_CANVAS_CONNECTIONS: [string, string][] = [
  ['market', 'openai'],
  ['competitors', 'openai'],
  ['customers', 'openai'],
  ['advantage', 'openai'],
  ['pricing', 'openai'],
];

export const WORKSPACE_LIVE_SIGNALS: WorkspaceLiveSignal[] = [
  {
    id: 's1',
    title: 'OpenAI launches GPT-4o with real-time voice',
    time: '2m ago',
    tag: 'AI',
    tagColor: '#818cf8',
    trend: 'up',
  },
  {
    id: 's2',
    title: 'Anthropic raises Series E at $18B valuation',
    time: '18m ago',
    tag: 'Funding',
    tagColor: '#22d3ee',
    trend: 'up',
  },
  {
    id: 's3',
    title: 'EU AI Act compliance deadline Q3 2026',
    time: '1h ago',
    tag: 'Regulatory',
    tagColor: '#fbbf24',
    trend: 'down',
  },
  {
    id: 's4',
    title: 'Enterprise AI spend up 34% YoY in NA',
    time: '3h ago',
    tag: 'Market',
    tagColor: '#34d399',
    trend: 'up',
  },
];

export const WORKSPACE_FOCUS_VISIBLE_COUNT = 3;

export const WORKSPACE_FOCUS_TASKS: WorkspaceFocusTask[] = [
  { id: 't1', label: 'Review competitor pricing', done: true },
  { id: 't2', label: 'Customer interview – Fintech', done: true },
  { id: 't3', label: 'Build auth module', done: false },
  { id: 't4', label: 'Draft investor update section', done: false },
  { id: 't5', label: 'Validate ICP with 3 design partners', done: false },
  { id: 't6', label: 'Ship workspace canvas v2', done: false },
];

export const WORKSPACE_TOOLBAR_ITEMS = [
  'Note',
  'Task',
  'File',
  'Link',
  'Table',
  'Chart',
  'Code',
  'AI Assistant',
] as const;
