/**
 * actionWorkspaceData.ts
 * Static data, templates, and configurations for the Action Node Workspace task panels.
 * Each panel variant is keyed by a matcher function or label tuple.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspacePanelVariant =
  | 'role-shortlist'
  | 'app-plan'
  | 'learning-plan'
  | 'portfolio-project'
  | 'outreach'
  | 'interview-prep'
  | 'pricing-compare'
  | 'feature-matrix'
  | 'customer-interview'
  | 'intro-request'
  | 'growth-tracker'
  | 'moat-analysis'
  | 'mitigation-plan'
  | 'benchmark'
  | 'data-room'
  | 'contact-map'
  | 'gtm-launch'
  | 'market-gap'
  | 'portfolio-health'
  | 'exit-analysis'
  | 'generic';

export interface PanelVariantConfig {
  variant: WorkspacePanelVariant;
  label: string;
  description: string;
  icon: string;
  accentKey: 'career' | 'founder' | 'investor';
}

// ─── Panel Resolver ───────────────────────────────────────────────────────────

const MATCHERS: Array<{
  rootLabel: string;
  branchLabel?: string;
  actionLabel?: string;
  variant: WorkspacePanelVariant;
}> = [
  // Industry OS company planet — fixed roots
  { rootLabel: 'Market Position', branchLabel: 'Pricing Model', actionLabel: 'Create pricing benchmark', variant: 'pricing-compare' },
  { rootLabel: 'Product & Tech', branchLabel: 'Core Offering Map', actionLabel: 'Capture differentiators', variant: 'feature-matrix' },
  { rootLabel: 'Product Delta', branchLabel: 'Feature Comparison', actionLabel: 'Create battlecard', variant: 'feature-matrix' },
  { rootLabel: 'Product Delta', branchLabel: 'Pricing Delta', actionLabel: 'Build pricing benchmark', variant: 'pricing-compare' },
  { rootLabel: 'Buyer Map', branchLabel: 'Stakeholder Map', actionLabel: 'Build stakeholder map', variant: 'contact-map' },
  { rootLabel: 'Buyer Map', branchLabel: 'Economic Buyer', actionLabel: 'Identify economic buyer', variant: 'contact-map' },
  { rootLabel: 'Pain & Trigger', branchLabel: 'Validated Pain', actionLabel: 'Run discovery call', variant: 'customer-interview' },
  { rootLabel: 'People & Access', branchLabel: 'Warm Intro Paths', actionLabel: 'Request intro', variant: 'intro-request' },
  { rootLabel: 'GTM & Win/Loss', branchLabel: 'Messaging Gap', actionLabel: 'Revise pitch deck', variant: 'gtm-launch' },
  { rootLabel: 'Commercial Signals', branchLabel: 'Hiring Velocity', actionLabel: 'Track hiring spike', variant: 'growth-tracker' },
  { rootLabel: 'Velocity & Threat', branchLabel: 'Headcount Growth', actionLabel: 'Add hiring alert', variant: 'growth-tracker' },
  { rootLabel: 'Stack Intel / Deal Urgency', branchLabel: 'Next Step', actionLabel: 'Schedule next meeting', variant: 'customer-interview' },
  { rootLabel: 'Integration Fit', branchLabel: 'POC Scope', actionLabel: 'Create integration POC', variant: 'gtm-launch' },
  { rootLabel: 'Value Split', branchLabel: 'Partner Proposal', actionLabel: 'Send partnership proposal', variant: 'intro-request' },
  // Career — Roles
  { rootLabel: 'Roles', branchLabel: 'Target roles', actionLabel: 'Shortlist 5 roles', variant: 'role-shortlist' },
  { rootLabel: 'Roles', branchLabel: 'Target roles', actionLabel: 'Application plan', variant: 'app-plan' },
  { rootLabel: 'Roles', branchLabel: 'Role families', actionLabel: 'Compare ladders', variant: 'role-shortlist' },
  // Career — Skill Gap
  { rootLabel: 'Skill Gap', actionLabel: 'Learning plan', variant: 'learning-plan' },
  { rootLabel: 'Skill Gap', actionLabel: 'Portfolio project', variant: 'portfolio-project' },
  // Career — People / Network
  { rootLabel: 'People / Network', actionLabel: '10 outreach messages', variant: 'outreach' },
  { rootLabel: 'People / Network', actionLabel: 'Referral ask', variant: 'intro-request' },
  // Career — Hiring Process
  { rootLabel: 'Hiring Process', actionLabel: 'Practice case', variant: 'interview-prep' },
  { rootLabel: 'Hiring Process', actionLabel: 'Culture fit notes', variant: 'generic' },
  // Career — Compensation
  { rootLabel: 'Compensation', actionLabel: 'Prepare negotiation', variant: 'benchmark' },
  // Founder — Competitors
  { rootLabel: 'Competitors', actionLabel: 'Compare pricing', variant: 'pricing-compare' },
  { rootLabel: 'Competitors', actionLabel: 'Feature matrix', variant: 'feature-matrix' },
  { rootLabel: 'Competitors', actionLabel: 'Legacy workarounds', variant: 'market-gap' },
  { rootLabel: 'Competitors', actionLabel: 'Open-source tools', variant: 'market-gap' },
  // Founder — Potential Customers
  { rootLabel: 'Potential Customers', actionLabel: 'Interview 10 operators', variant: 'customer-interview' },
  { rootLabel: 'Potential Customers', actionLabel: 'Pilot proposal', variant: 'gtm-launch' },
  { rootLabel: 'Potential Customers', actionLabel: 'Map buying committee', variant: 'contact-map' },
  { rootLabel: 'Potential Customers', actionLabel: 'Procurement signals', variant: 'growth-tracker' },
  // Founder — People to Contact
  { rootLabel: 'People to Contact', actionLabel: 'Request intro', variant: 'intro-request' },
  { rootLabel: 'People to Contact', actionLabel: 'Integration pitch', variant: 'gtm-launch' },
  { rootLabel: 'People to Contact', actionLabel: 'Discovery call', variant: 'customer-interview' },
  { rootLabel: 'People to Contact', actionLabel: 'Feedback loop', variant: 'generic' },
  // Founder — Market Gap
  { rootLabel: 'Market Gap', actionLabel: 'Choose wedge', variant: 'market-gap' },
  { rootLabel: 'Market Gap', actionLabel: 'Landing test', variant: 'gtm-launch' },
  // Founder — GTM
  { rootLabel: 'GTM / Distribution', actionLabel: 'Launch pilot', variant: 'gtm-launch' },
  { rootLabel: 'GTM / Distribution', actionLabel: 'Partner marketplace', variant: 'intro-request' },
  // Investor — Growth
  { rootLabel: 'Growth', actionLabel: 'Track quarterly logos', variant: 'growth-tracker' },
  { rootLabel: 'Growth', actionLabel: 'Cohort retention', variant: 'portfolio-health' },
  // Investor — Moat
  { rootLabel: 'Moat', actionLabel: 'Compare platform risk', variant: 'moat-analysis' },
  { rootLabel: 'Moat', actionLabel: 'Distribution moat', variant: 'moat-analysis' },
  // Investor — Risk
  { rootLabel: 'Risk', actionLabel: 'Mitigation plan', variant: 'mitigation-plan' },
  { rootLabel: 'Risk', actionLabel: 'Incumbent response', variant: 'moat-analysis' },
  // Investor — Financial
  { rootLabel: 'Financial', actionLabel: 'Benchmark margins', variant: 'benchmark' },
  { rootLabel: 'Financial', actionLabel: 'Runway stress', variant: 'benchmark' },
  // Investor — Deal
  { rootLabel: 'Deal', actionLabel: 'Request data room', variant: 'data-room' },
  { rootLabel: 'Deal', actionLabel: 'Co-investor map', variant: 'contact-map' },
];

export function resolveVariant(
  rootLabel: string,
  branchLabel: string,
  actionLabel: string,
): WorkspacePanelVariant {
  for (const m of MATCHERS) {
    const rootMatch = m.rootLabel.toLowerCase() === rootLabel.toLowerCase();
    const branchMatch = !m.branchLabel || m.branchLabel.toLowerCase() === branchLabel.toLowerCase();
    const actionMatch = !m.actionLabel || m.actionLabel.toLowerCase() === actionLabel.toLowerCase();
    if (rootMatch && branchMatch && actionMatch) return m.variant;
  }
  return 'generic';
}

// ─── Role Shortlist Data ──────────────────────────────────────────────────────

export const ROLE_FAMILIES = [
  { id: 'eng', label: 'Engineering', icon: '⚙️', roles: ['Software Engineer', 'Staff Engineer', 'Platform Engineer', 'ML Engineer'] },
  { id: 'pm', label: 'Product', icon: '📐', roles: ['Product Manager', 'Senior PM', 'Group PM', 'VP Product'] },
  { id: 'ds', label: 'Data / AI', icon: '🧠', roles: ['Data Scientist', 'ML Researcher', 'Analytics Engineer', 'AI Lead'] },
  { id: 'mkt', label: 'Marketing', icon: '📢', roles: ['Growth Marketer', 'Content Lead', 'Demand Gen', 'CMO'] },
  { id: 'sales', label: 'Sales', icon: '🤝', roles: ['Account Executive', 'SDR', 'Sales Lead', 'VP Sales'] },
  { id: 'design', label: 'Design', icon: '✏️', roles: ['Product Designer', 'UX Researcher', 'Brand Designer', 'Design Lead'] },
  { id: 'ops', label: 'Operations', icon: '🏗️', roles: ['Operations Manager', 'Chief of Staff', 'RevOps', 'BizOps'] },
  { id: 'finance', label: 'Finance', icon: '💰', roles: ['Financial Analyst', 'Controller', 'FP&A Lead', 'CFO'] },
];

export const SENIORITY_LEVELS = ['IC1', 'IC2', 'IC3', 'Staff', 'Principal', 'Director', 'VP', 'C-Suite'];

// ─── Learning Plan Data ───────────────────────────────────────────────────────

export const SKILL_CATEGORIES = [
  { id: 'technical', label: 'Technical', color: '#60a5fa', skills: ['TypeScript', 'React', 'Python', 'SQL', 'AWS', 'System Design', 'APIs', 'Testing'] },
  { id: 'product', label: 'Product', color: '#a78bfa', skills: ['User Research', 'Roadmapping', 'A/B Testing', 'Analytics', 'Storytelling', 'Metrics', 'OKRs'] },
  { id: 'domain', label: 'Domain', color: '#34d399', skills: ['SaaS Metrics', 'GTM', 'Pricing', 'Competition', 'Fundraising', 'Finance Basics'] },
  { id: 'leadership', label: 'Leadership', color: '#fbbf24', skills: ['Team Building', 'Communication', 'Stakeholder Mgmt', 'Negotiation', 'Vision Setting'] },
];

export const LEARNING_RESOURCES = [
  { type: 'Course', platform: 'Coursera', time: '4–6 weeks' },
  { type: 'Book', platform: 'O\'Reilly', time: '2–3 weeks' },
  { type: 'Project', platform: 'GitHub', time: '1–2 weeks' },
  { type: 'Mentor', platform: 'ADPList', time: 'Ongoing' },
  { type: 'Community', platform: 'Discord', time: 'Ongoing' },
];

// ─── Outreach Templates ───────────────────────────────────────────────────────

export const OUTREACH_PERSONAS = ['Recruiter', 'Hiring Manager', 'Alumni', 'LinkedIn Connection', 'Warm Intro', 'Cold Outreach'];

export const OUTREACH_TEMPLATES = [
  {
    persona: 'Recruiter',
    subject: 'Exploring {{role}} opportunities at {{company}}',
    body: `Hi {{name}},

I came across {{company}} in my research and was genuinely excited by the work your team is doing in {{domain}}.

I'm a {{title}} with experience in {{skill1}} and {{skill2}}, and I believe I could add real value to your {{department}} team.

Would you be open to a 15-minute conversation to explore if there's a fit?

Best,
{{your_name}}`,
  },
  {
    persona: 'Alumni',
    subject: 'Fellow {{school}} alum — curious about {{company}}',
    body: `Hi {{name}},

I noticed we both attended {{school}} — small world! I've been following {{company}}'s growth and would love to hear about your experience there.

I'm currently exploring opportunities in {{domain}} and would value your perspective.

Open to a quick coffee chat?

{{your_name}}`,
  },
  {
    persona: 'Hiring Manager',
    subject: 'Admired your work on {{project}} — exploring opportunities',
    body: `Hi {{name}},

I've been following your work on {{project}} — the approach to {{topic}} was exactly the kind of problem-solving I aspire to.

I'm a {{title}} who's been deep in {{domain}} for the past few years. I'd love to explore if there's a role where I could contribute to your team's mission.

Happy to share more about my background — would you have 20 minutes this week?

{{your_name}}`,
  },
];

// ─── Interview Prep Data ──────────────────────────────────────────────────────

export const INTERVIEW_QUESTION_BANKS: Record<string, string[]> = {
  behavioral: [
    'Tell me about a time you disagreed with your manager.',
    'Describe a project where you had to learn something new very quickly.',
    'Give an example of a time you failed and what you learned.',
    'Tell me about your most impactful project and what made it successful.',
    'How do you prioritize when everything feels urgent?',
    'Describe a time you influenced without authority.',
    'Tell me about a time you had to make a decision with incomplete information.',
  ],
  technical: [
    'Design a URL shortener at scale.',
    'How would you debug a sudden increase in latency?',
    'Walk me through your approach to system design.',
    'Explain a complex concept to a non-technical audience.',
    'How do you ensure code quality in a fast-moving team?',
    'What\'s your approach to technical debt?',
  ],
  product: [
    'How would you improve our onboarding flow?',
    'Walk me through a product decision you\'re proud of.',
    'How do you decide what to build next?',
    'Tell me how you set and measure product metrics.',
    'How do you balance user needs vs. business needs?',
  ],
  culture: [
    'What type of environment do you thrive in?',
    'How do you handle feedback?',
    'What motivates you beyond compensation?',
    'Why are you leaving your current role?',
    'Where do you see yourself in 3 years?',
  ],
};

// ─── Pricing Compare Data ─────────────────────────────────────────────────────

export const SAMPLE_COMPETITORS = [
  { name: 'Competitor A', tier: 'Enterprise', monthlyPrice: 499, annualDiscount: 20, users: 'Unlimited', features: ['API Access', 'SSO', 'Custom Reports', 'Priority Support'] },
  { name: 'Competitor B', tier: 'Mid-Market', monthlyPrice: 199, annualDiscount: 15, users: 'Up to 50', features: ['API Access', 'Basic Reports', 'Email Support'] },
  { name: 'Competitor C', tier: 'SMB', monthlyPrice: 79, annualDiscount: 10, users: 'Up to 10', features: ['Basic Reports', 'Community Support'] },
  { name: 'Your Product', tier: 'All Segments', monthlyPrice: 299, annualDiscount: 17, users: 'Unlimited', features: ['API Access', 'SSO', 'AI Reports', '24/7 Support', 'Custom Integrations'] },
];

export const FEATURE_LIST = [
  'API Access', 'SSO / SAML', 'Custom Reports', 'AI-powered Analytics',
  'Priority Support', 'Custom Integrations', 'White-label', 'SLA Guarantee',
  'Data Export', 'Multi-region', 'Audit Logs', 'Role-based Access',
];

// ─── Growth Tracker Data ──────────────────────────────────────────────────────

export const SAMPLE_LOGO_PIPELINE = [
  { name: 'Acme Corp', stage: 'Pilot', arr: '$48K', since: 'Q1 2025', health: 92 },
  { name: 'NovaTech', stage: 'Expansion', arr: '$120K', since: 'Q3 2024', health: 87 },
  { name: 'Meridian Co', stage: 'Renewal', arr: '$75K', since: 'Q2 2024', health: 74 },
  { name: 'Apex Systems', stage: 'Evaluation', arr: 'TBD', since: 'Q1 2025', health: 61 },
  { name: 'Vertex Labs', stage: 'Onboarding', arr: '$32K', since: 'Q1 2025', health: 88 },
];

// ─── Data Room Checklist ──────────────────────────────────────────────────────

export const DATA_ROOM_SECTIONS = [
  {
    section: 'Company Overview',
    items: ['Pitch deck (latest)', 'Executive summary', 'Company history & milestones', 'Org chart'],
  },
  {
    section: 'Financials',
    items: ['P&L (last 3 years)', 'Balance sheet', 'Cash flow statements', 'Cap table', 'Financial projections (3–5 years)'],
  },
  {
    section: 'Product & Technology',
    items: ['Product demo / walkthrough', 'Technical architecture', 'IP / patent list', 'Security audit'],
  },
  {
    section: 'Market & Competition',
    items: ['Market size analysis (TAM/SAM/SOM)', 'Competitor analysis', 'GTM strategy', 'Customer references'],
  },
  {
    section: 'Legal & Compliance',
    items: ['Articles of incorporation', 'Shareholder agreements', 'Key contracts', 'Regulatory licenses', 'Litigation history'],
  },
  {
    section: 'People',
    items: ['Leadership bios & LinkedIn', 'Key employee agreements', 'Option pool breakdown', 'Org structure'],
  },
];

// ─── Contact Map Data ─────────────────────────────────────────────────────────

export const CONTACT_ROLES = [
  { role: 'Decision Maker', purpose: 'Partnerships', priority: 'High', color: '#f97316' },
  { role: 'Economic Buyer', purpose: 'Sales', priority: 'High', color: '#22d3ee' },
  { role: 'Product Owner', purpose: 'Integrations', priority: 'Medium', color: '#a78bfa' },
  { role: 'Technical Evaluator', purpose: 'Diligence', priority: 'Medium', color: '#60a5fa' },
  { role: 'Recruiter', purpose: 'Hiring', priority: 'Low', color: '#34d399' },
  { role: 'Advisor', purpose: 'Introductions', priority: 'Medium', color: '#fbbf24' },
];

// ─── Mitigation Plan Data ─────────────────────────────────────────────────────

export const RISK_CATEGORIES = [
  { id: 'platform', label: 'Platform Dependency', severity: 'High', probability: 'Medium', color: '#f87171' },
  { id: 'regulatory', label: 'Regulatory / Compliance', severity: 'High', probability: 'Low', color: '#fb923c' },
  { id: 'competition', label: 'Competitive Pressure', severity: 'Medium', probability: 'High', color: '#fbbf24' },
  { id: 'talent', label: 'Key Person Risk', severity: 'Medium', probability: 'Medium', color: '#a78bfa' },
  { id: 'market', label: 'Market Timing', severity: 'High', probability: 'Low', color: '#60a5fa' },
  { id: 'execution', label: 'Execution Risk', severity: 'Medium', probability: 'High', color: '#34d399' },
];

// ─── GTM Launch Data ──────────────────────────────────────────────────────────

export const GTM_CHANNELS = [
  { id: 'inbound', label: 'Inbound / SEO', icon: '🔍', effort: 'Medium', timeline: '3–6 mo', fit: 85 },
  { id: 'outbound', label: 'Outbound Sales', icon: '📧', effort: 'High', timeline: '1–3 mo', fit: 78 },
  { id: 'partner', label: 'Partner / Co-Sell', icon: '🤝', effort: 'Medium', timeline: '2–4 mo', fit: 90 },
  { id: 'community', label: 'Community Led', icon: '💬', effort: 'Low', timeline: '6–12 mo', fit: 72 },
  { id: 'product', label: 'Product Led (PLG)', icon: '🚀', effort: 'Low', timeline: '3–9 mo', fit: 88 },
  { id: 'events', label: 'Events / Conferences', icon: '🎪', effort: 'High', timeline: '1–2 mo', fit: 65 },
];

// ─── Portfolio Health Data ────────────────────────────────────────────────────

export const PORTFOLIO_METRICS = [
  { label: 'MRR Growth', value: '+18%', trend: 'up', color: '#34d399' },
  { label: 'Churn Rate', value: '2.4%', trend: 'down', color: '#f87171' },
  { label: 'NPS Score', value: '67', trend: 'up', color: '#60a5fa' },
  { label: 'Burn Multiple', value: '1.8x', trend: 'neutral', color: '#fbbf24' },
  { label: 'DAU / MAU', value: '38%', trend: 'up', color: '#a78bfa' },
  { label: 'CAC Payback', value: '11 mo', trend: 'neutral', color: '#22d3ee' },
];

// ─── Market Gap Data ──────────────────────────────────────────────────────────

export const MARKET_SEGMENTS = [
  { name: 'Enterprise (>1000 emp)', addressable: '$2.4B', penetration: 12, color: '#f97316' },
  { name: 'Mid-Market (100–999)', addressable: '$890M', penetration: 8, color: '#fbbf24' },
  { name: 'SMB (10–99)', addressable: '$340M', penetration: 22, color: '#34d399' },
  { name: 'Micro (<10)', addressable: '$110M', penetration: 5, color: '#60a5fa' },
];
