-- ================================================================
-- 008_seed_subdomains.sql
-- Seeds ~96 subdomain rows across the 15 FounderOS industries.
-- Re-buckets the startup-twin universe's 96 subdomains under the
-- FounderOS naming. Each (industry, orbit_index) pair drives the
-- planet's orbit ring in the 3D view.
-- ================================================================

INSERT INTO subdomains (id, industry_id, label, description, orbit_index, color) VALUES

-- ── SaaS (6) ─────────────────────────────────────────────────────
('sd-saas-crm',         'ind-saas', 'CRM & Sales',           'Customer relationship management, sales engagement, revenue ops',     0, '#C1AEFF'),
('sd-saas-devtools',    'ind-saas', 'Developer Tools',       'IDEs, code intelligence, CI/CD, observability, DX platforms',         1, '#A78BFA'),
('sd-saas-cloud',       'ind-saas', 'Cloud Infrastructure',  'IaaS, PaaS, container orchestration, edge compute',                   2, '#8B5CF6'),
('sd-saas-enterprise',  'ind-saas', 'Enterprise Software',   'ERP, HRMS, finance suites, business process platforms',              3, '#7C3AED'),
('sd-saas-collab',      'ind-saas', 'Collaboration',         'Productivity, team chat, docs, project management',                   4, '#DDD6FE'),
('sd-saas-web3',        'ind-saas', 'Web3 / Blockchain',     'Decentralised infra, wallets, on-chain SaaS',                          5, '#9F7AEA'),

-- ── FinTech (8) ──────────────────────────────────────────────────
('sd-fin-banking',      'ind-fintech', 'Banking & Neo-Banks', 'Digital banking, account infra, embedded finance',                   0, '#22D3EE'),
('sd-fin-payments',     'ind-fintech', 'Payments',            'Card networks, UPI, gateways, B2B payments',                          1, '#06B6D4'),
('sd-fin-lending',      'ind-fintech', 'Lending',             'Consumer credit, BNPL, SME loans, lending infra',                     2, '#0891B2'),
('sd-fin-investing',    'ind-fintech', 'Investing',           'Brokerage, retail trading apps, robo-advisors',                       3, '#67E8F9'),
('sd-fin-asset',        'ind-fintech', 'Asset Management',    'Wealth platforms, mutual funds, alt investments',                     4, '#A5F3FC'),
('sd-fin-trading',      'ind-fintech', 'Trading Infra',       'Market data, execution, brokerage tech',                              5, '#0E7490'),
('sd-fin-insurance',    'ind-fintech', 'Insurance',           'InsurTech, distribution, underwriting platforms',                     6, '#155E75'),
('sd-fin-fintech',      'ind-fintech', 'Embedded Finance',    'Vertical fintech, treasury APIs, Banking-as-a-Service',               7, '#164E63'),

-- ── HealthTech (8) ───────────────────────────────────────────────
('sd-health-hospitals',  'ind-healthtech', 'Hospitals',         'Hospital chains, OPD networks, hospital IT',                        0, '#34D399'),
('sd-health-pharma',     'ind-healthtech', 'Pharma',            'Drug discovery, generics, contract manufacturing',                  1, '#10B981'),
('sd-health-biotech',    'ind-healthtech', 'Biotech',           'Genomics, cell therapy, biologics',                                 2, '#059669'),
('sd-health-diagnostics','ind-healthtech', 'Diagnostics',       'Path labs, imaging, point-of-care testing',                         3, '#6EE7B7'),
('sd-health-devices',    'ind-healthtech', 'Medical Devices',   'Wearables, surgical robotics, medical hardware',                    4, '#A7F3D0'),
('sd-health-digital',    'ind-healthtech', 'Digital Health',    'Telehealth, EHR, hospital SaaS, patient apps',                      5, '#047857'),
('sd-health-mental',     'ind-healthtech', 'Mental Health',     'Therapy platforms, mental wellness, psychiatry',                    6, '#065F46'),
('sd-health-preventive', 'ind-healthtech', 'Preventive Care',   'Fitness, nutrition, lifestyle medicine',                            7, '#064E3B'),

-- ── EdTech (8) ───────────────────────────────────────────────────
('sd-edu-k12',           'ind-edtech', 'K-12',                  'Schools, K-12 learning platforms, parental engagement',             0, '#FB923C'),
('sd-edu-higher',        'ind-edtech', 'Higher Education',      'Universities, online degrees, MOOC platforms',                     1, '#F97316'),
('sd-edu-edtech',        'ind-edtech', 'EdTech Platforms',      'Cross-cutting learning tech, LMS, content tooling',                2, '#EA580C'),
('sd-edu-testprep',      'ind-edtech', 'Test Prep',             'Competitive exams, tutoring, gamified prep',                       3, '#FED7AA'),
('sd-edu-corporate',     'ind-edtech', 'Corporate Training',    'L&D, upskilling, enterprise learning',                              4, '#FFEDD5'),
('sd-edu-skills',        'ind-edtech', 'Skill Platforms',       'Bootcamps, certifications, vocational programs',                   5, '#C2410C'),
('sd-edu-research',      'ind-edtech', 'Research',              'Research institutions, lab infra, academic tooling',               6, '#9A3412'),
('sd-edu-publishing',    'ind-edtech', 'Knowledge Publishing',  'Journals, publishing platforms, content libraries',                7, '#7C2D12'),

-- ── E-Commerce (6) ───────────────────────────────────────────────
('sd-ecom-marketplace',  'ind-ecommerce', 'Marketplaces',       'Horizontal & niche marketplaces',                                   0, '#F472B6'),
('sd-ecom-d2c',          'ind-ecommerce', 'D2C Brands',         'Direct-to-consumer brands, vertical commerce',                      1, '#EC4899'),
('sd-ecom-retail',       'ind-ecommerce', 'Retail',             'Omnichannel retail, retail tech',                                   2, '#DB2777'),
('sd-ecom-quick',        'ind-ecommerce', 'Quick Commerce',     'Q-commerce, dark stores, social commerce',                          3, '#FBCFE8'),
('sd-ecom-wholesale',    'ind-ecommerce', 'Wholesale & B2B',    'B2B commerce, distribution platforms',                              4, '#F9A8D4'),
('sd-ecom-cx',           'ind-ecommerce', 'CX & Storefronts',   'Storefront platforms, conversion tooling, post-purchase',           5, '#BE185D'),

-- ── AI / ML (6) ──────────────────────────────────────────────────
('sd-ai-foundation',     'ind-aiml', 'Foundation Models',      'LLMs, multimodal foundation models, training labs',                 0, '#F9C6FF'),
('sd-ai-infra',          'ind-aiml', 'AI Infrastructure',      'GPU cloud, inference, vector DBs, model serving',                   1, '#E9D5FF'),
('sd-ai-llm-apps',       'ind-aiml', 'LLM Apps',               'Vertical LLM products, copilots, agents',                           2, '#D8B4FE'),
('sd-ai-mlops',          'ind-aiml', 'MLOps',                  'Experiment tracking, feature stores, deployment',                   3, '#C084FC'),
('sd-ai-vision',         'ind-aiml', 'Vision AI',              'Computer vision, medical imaging, surveillance',                    4, '#A855F7'),
('sd-ai-data',           'ind-aiml', 'Data Science',           'Data labeling, synthetic data, dataset platforms',                  5, '#9333EA'),

-- ── CleanTech (7) ────────────────────────────────────────────────
('sd-clean-solar',       'ind-cleantech', 'Solar',              'Rooftop solar, solar farms, solar manufacturing',                  0, '#4ADE80'),
('sd-clean-wind',        'ind-cleantech', 'Wind',               'Onshore/offshore wind, wind components',                            1, '#22C55E'),
('sd-clean-storage',     'ind-cleantech', 'Energy Storage',     'Battery tech, grid storage, BESS',                                  2, '#16A34A'),
('sd-clean-ev',          'ind-cleantech', 'EV Infrastructure',  'Charging networks, swap stations, EV components',                   3, '#86EFAC'),
('sd-clean-carbon',      'ind-cleantech', 'Carbon Markets',     'Carbon credits, MRV, carbon removal',                               4, '#BBF7D0'),
('sd-clean-climate',     'ind-cleantech', 'Climate Tech',       'Climate modeling, adaptation, ESG platforms',                       5, '#15803D'),
('sd-clean-waste',       'ind-cleantech', 'Waste Management',   'Recycling, circular economy, waste-to-energy',                      6, '#166534'),

-- ── Logistics (5) ────────────────────────────────────────────────
('sd-log-3pl',           'ind-logistics', 'Third-Party Logistics','3PL, contract logistics, warehousing',                            0, '#FBBF24'),
('sd-log-lastmile',      'ind-logistics', 'Last-Mile Delivery', 'Last-mile networks, hyperlocal delivery',                           1, '#F59E0B'),
('sd-log-supply',        'ind-logistics', 'Supply Chain Tech',  'Visibility, planning, supply chain SaaS',                           2, '#D97706'),
('sd-log-fleet',         'ind-logistics', 'Fleet Management',   'Fleet ops, telematics, freight matching',                           3, '#FDE68A'),
('sd-log-shipping',      'ind-logistics', 'Shipping & Freight', 'Ocean/air freight, freight forwarding, ports',                      4, '#FEF3C7'),

-- ── Gaming (5) ───────────────────────────────────────────────────
('sd-game-mobile',       'ind-gaming', 'Mobile Gaming',         'Mobile-first games, casual & midcore',                              0, '#A78BFA'),
('sd-game-console',      'ind-gaming', 'Console & PC',          'AAA, indie console & PC titles',                                    1, '#8B5CF6'),
('sd-game-fantasy',      'ind-gaming', 'Fantasy Sports',        'Fantasy leagues, real-money gaming',                                2, '#7C3AED'),
('sd-game-esports',      'ind-gaming', 'Esports',               'Esports leagues, teams, broadcasting',                              3, '#C4B5FD'),
('sd-game-casual',       'ind-gaming', 'Casual & Hyper-Casual', 'Hyper-casual studios, social games',                                4, '#DDD6FE'),

-- ── Mobility (5) ─────────────────────────────────────────────────
('sd-mob-ridehail',      'ind-mobility', 'Ride-Hailing',        'Ride-share, taxi platforms, autonomous mobility',                  0, '#38BDF8'),
('sd-mob-aviation',      'ind-mobility', 'Aviation',            'Airlines, eVTOL, drones',                                           1, '#0EA5E9'),
('sd-mob-rail',          'ind-mobility', 'Rail',                'Rail tech, ticketing, freight rail',                                2, '#0284C7'),
('sd-mob-travel',        'ind-mobility', 'Travel Infra',        'OTAs, travel booking, hospitality tech',                            3, '#7DD3FC'),
('sd-mob-micro',         'ind-mobility', 'Micro-Mobility',      'E-bikes, scooters, shared mobility',                                4, '#BAE6FD'),

-- ── Media (7) ────────────────────────────────────────────────────
('sd-med-streaming',     'ind-media', 'Streaming',              'OTT, video streaming, audio streaming',                             0, '#F87171'),
('sd-med-creator',       'ind-media', 'Creator Economy',        'Creator tools, monetisation, fan platforms',                        1, '#EF4444'),
('sd-med-news',          'ind-media', 'News & Content',         'Digital news, vernacular content, newsletters',                     2, '#DC2626'),
('sd-med-music',         'ind-media', 'Music',                  'Music streaming, music tech, labels',                               3, '#FCA5A5'),
('sd-med-film',          'ind-media', 'Film',                   'Production, distribution, film tech',                               4, '#FECACA'),
('sd-med-tv',            'ind-media', 'Television',             'Linear TV, broadcast, CTV',                                         5, '#B91C1C'),
('sd-med-sports',        'ind-media', 'Sports Media',           'Sports broadcasting, analytics, fan engagement',                    6, '#991B1B'),

-- ── AgriTech (7) ─────────────────────────────────────────────────
('sd-agri-farming',      'ind-agritech', 'Farming',             'Smart farming, precision agriculture, farmer networks',             0, '#86EFAC'),
('sd-agri-agritech',     'ind-agritech', 'AgriTech Platforms',  'Cross-cutting agri SaaS, marketplace for inputs',                   1, '#4ADE80'),
('sd-agri-food',         'ind-agritech', 'Food Processing',     'Packaged foods, food processing tech',                              2, '#22C55E'),
('sd-agri-nutrition',    'ind-agritech', 'Nutrition',           'Nutraceuticals, alt-protein, sustainable food',                     3, '#BBF7D0'),
('sd-agri-supply',       'ind-agritech', 'Agri Supply Chain',   'Cold chain, agri logistics, FPO platforms',                         4, '#DCFCE7'),
('sd-agri-fisheries',    'ind-agritech', 'Fisheries',           'Aquaculture, fisheries tech',                                       5, '#16A34A'),
('sd-agri-forestry',     'ind-agritech', 'Forestry',            'Sustainable forestry, agroforestry',                                6, '#15803D'),

-- ── Cybersecurity (6) ────────────────────────────────────────────
('sd-cyber-threat',      'ind-cyber', 'Threat Intelligence',    'TI platforms, dark-web monitoring',                                 0, '#94A3B8'),
('sd-cyber-endpoint',    'ind-cyber', 'Endpoint Security',      'EDR, XDR, endpoint protection',                                     1, '#64748B'),
('sd-cyber-soc',         'ind-cyber', 'SOC-as-a-Service',       'Managed detection, SIEM, SOAR',                                     2, '#475569'),
('sd-cyber-vapt',        'ind-cyber', 'VAPT & Pentest',         'Pentesting, vulnerability management',                              3, '#CBD5E1'),
('sd-cyber-identity',    'ind-cyber', 'Identity & Access',      'IAM, zero trust, passwordless',                                     4, '#E2E8F0'),
('sd-cyber-network',     'ind-cyber', 'Network Security',       'Firewalls, ZTNA, secure access edge',                               5, '#334155'),

-- ── SpaceTech (5) ────────────────────────────────────────────────
('sd-space-launch',      'ind-space', 'Launchers',              'Micro-launchers, reusable rockets',                                 0, '#E2E8F0'),
('sd-space-eo',          'ind-space', 'Earth Observation',      'Satellite imagery, geospatial analytics',                           1, '#CBD5E1'),
('sd-space-comms',       'ind-space', 'Satellite Comms',        'Satcom, IoT-from-space, broadband sats',                            2, '#94A3B8'),
('sd-space-mining',      'ind-space', 'In-Space & Mining',      'In-space servicing, asteroid mining',                               3, '#F1F5F9'),
('sd-space-lunar',       'ind-space', 'Lunar & Deep Space',     'Lunar tech, deep space exploration',                                4, '#F8FAFC'),

-- ── PropTech (7) ─────────────────────────────────────────────────
('sd-prop-residential',  'ind-proptech', 'Residential',         'Residential discovery, rental, brokerage',                          0, '#FDBA74'),
('sd-prop-commercial',   'ind-proptech', 'Commercial',          'Co-working, commercial leasing, flex spaces',                       1, '#FB923C'),
('sd-prop-construction', 'ind-proptech', 'Construction',        'Construction tech, BIM, project management',                        2, '#F97316'),
('sd-prop-proptech',     'ind-proptech', 'PropTech Platforms',  'Cross-cutting proptech, marketplaces',                              3, '#FED7AA'),
('sd-prop-smart',        'ind-proptech', 'Smart Buildings',     'IoT for buildings, energy management, automation',                  4, '#FFEDD5'),
('sd-prop-facility',     'ind-proptech', 'Facility Management', 'Facility ops, maintenance platforms',                               5, '#EA580C'),
('sd-prop-fractional',   'ind-proptech', 'Fractional Ownership','Fractional real estate, REITs, alt-property',                       6, '#C2410C')

ON CONFLICT (id) DO NOTHING;
