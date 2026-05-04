-- ================================================================
-- 009_replace_universe.sql
-- Replace 15-industry universe with 12 Work OS Universe industries
-- + ~80 subdomains. Catalog companies seeded in 010.
-- NOTE: Only deletes catalog/public seed data, not user companies.
-- ================================================================

-- ── 1. Clear old catalog subdomains & industries ──────────────────
-- User companies get industry_id / subdomain_id SET NULL (FK behavior)
DELETE FROM subdomains;
DELETE FROM industries WHERE id IN (
  'ind-saas','ind-fintech','ind-healthtech','ind-edtech','ind-ecommerce',
  'ind-aiml','ind-cleantech','ind-logistics','ind-gaming','ind-mobility',
  'ind-media','ind-agritech','ind-cyber','ind-space','ind-proptech'
);

-- ── 2. Insert 12 new industries ───────────────────────────────────
INSERT INTO industries (id, label, description, color, position_3d, bubble_radius, tags) VALUES
('ind-technology',   'Technology',              'AI, cloud, cybersecurity, hardware, Web3, enterprise software',         '#C1AEFF', '{"x":0,"y":0,"z":0}',          14, ARRAY['b2b','global','deep-tech','high-margin']),
('ind-finance',      'Finance',                 'Fintech, banking, insurance, trading, investing, lending',               '#22d3ee', '{"x":-70,"y":-10,"z":-55}',    13, ARRAY['b2c','global','regulated','capital-markets']),
('ind-manufacturing','Manufacturing',           'Automotive, electronics, industrial machinery, consumer goods',          '#94a3b8', '{"x":70,"y":10,"z":-50}',       12, ARRAY['b2b','global','capital-intensive','operations-heavy']),
('ind-healthcare',   'Healthcare',              'Pharma, hospitals, biotech, diagnostics, medical devices',               '#34d399', '{"x":-60,"y":15,"z":60}',       13, ARRAY['b2c','global','regulated','ai-driven']),
('ind-education',    'Education',               'Universities, schools, edtech, publishing, skill platforms',             '#fb923c', '{"x":60,"y":15,"z":60}',        11, ARRAY['b2c','global','consumer','impact']),
('ind-media',        'Media & Entertainment',   'Film, TV, streaming, music, gaming, creator economy',                   '#f87171', '{"x":0,"y":-40,"z":-70}',       12, ARRAY['b2c','global','ad-driven','content']),
('ind-commerce',     'Commerce',                'Retail, e-commerce, D2C brands, marketplaces, wholesale',               '#f472b6', '{"x":0,"y":40,"z":70}',         12, ARRAY['b2c','global','logistics-heavy','consumer']),
('ind-energy',       'Energy & Sustainability', 'Solar, wind, storage, EV infrastructure, climate tech',                 '#4ade80', '{"x":-80,"y":5,"z":0}',         11, ARRAY['global','impact','capital-intensive','climate']),
('ind-government',   'Government & Public',     'Governance, defense, public policy, civic tech, social welfare',        '#64748b', '{"x":80,"y":-5,"z":0}',         10, ARRAY['b2g','global','compliance-driven','impact']),
('ind-mobility',     'Mobility & Transport',    'Aviation, rail, shipping, automotive mobility, delivery systems',        '#38bdf8', '{"x":0,"y":80,"z":0}',          12, ARRAY['b2c','global','unit-economics-hard','operations-heavy']),
('ind-realestate',   'Real Estate & Infra',     'Commercial, construction, smart buildings, proptech, facility mgmt',    '#fdba74', '{"x":50,"y":55,"z":-40}',       11, ARRAY['b2c','global','high-ticket','marketplace']),
('ind-agriculture',  'Agriculture & Food',      'Farming, agri-tech, food processing, fisheries, nutrition',             '#86efac', '{"x":-50,"y":-55,"z":40}',      10, ARRAY['b2b','global','impact','rural'])
ON CONFLICT (id) DO UPDATE SET
  label        = EXCLUDED.label,
  description  = EXCLUDED.description,
  color        = EXCLUDED.color,
  position_3d  = EXCLUDED.position_3d,
  bubble_radius= EXCLUDED.bubble_radius,
  tags         = EXCLUDED.tags;

-- ── 3. Insert subdomains ──────────────────────────────────────────
INSERT INTO subdomains (id, industry_id, label, description, orbit_index, color) VALUES

-- ── Technology (6) ───────────────────────────────────────────────
('sd-tech-ai',         'ind-technology', 'AI',                  'Foundation models, LLMs, AI infra, MLOps, inference',                0, '#C1AEFF'),
('sd-tech-cloud',      'ind-technology', 'Cloud',               'IaaS, PaaS, cloud platforms, edge compute, CDN',                     1, '#A78BFA'),
('sd-tech-cyber',      'ind-technology', 'Cybersecurity',       'Threat intel, endpoint security, SOC, identity, network security',   2, '#8B5CF6'),
('sd-tech-hardware',   'ind-technology', 'Hardware',            'Semiconductors, chips, consumer electronics, IoT hardware',          3, '#7C3AED'),
('sd-tech-web3',       'ind-technology', 'Web3',                'Blockchain, DeFi, NFTs, wallets, on-chain infrastructure',           4, '#DDD6FE'),
('sd-tech-enterprise', 'ind-technology', 'Enterprise Software', 'ERP, CRM, HRMS, collaboration, business process platforms',          5, '#9F7AEA'),

-- ── Finance (7) ──────────────────────────────────────────────────
('sd-fin-fintech',  'ind-finance', 'Fintech',          'Payments, gateways, UPI, B2B payments, embedded finance',             0, '#22D3EE'),
('sd-fin-banking',  'ind-finance', 'Banking',          'Digital banking, neo-banks, account infra, open banking',             1, '#06B6D4'),
('sd-fin-insurance','ind-finance', 'Insurance',        'InsurTech, distribution, underwriting, claims automation',            2, '#0891B2'),
('sd-fin-trading',  'ind-finance', 'Trading',          'Brokerage tech, market data, execution, retail trading',              3, '#67E8F9'),
('sd-fin-investing','ind-finance', 'Investing',        'Robo-advisors, wealth platforms, mutual funds, alt assets',           4, '#A5F3FC'),
('sd-fin-asset',    'ind-finance', 'Asset Management', 'Asset managers, fund platforms, institutional wealth',                5, '#0E7490'),
('sd-fin-lending',  'ind-finance', 'Lending',          'Consumer credit, BNPL, SME loans, mortgage tech',                    6, '#155E75'),

-- ── Manufacturing (7) ────────────────────────────────────────────
('sd-mfg-automotive', 'ind-manufacturing', 'Automotive',           'Car OEMs, EV makers, auto components, ADAS',                    0, '#94A3B8'),
('sd-mfg-electronics','ind-manufacturing', 'Electronics',          'Consumer electronics, contract manufacturing, PCBs',            1, '#64748B'),
('sd-mfg-industrial', 'ind-manufacturing', 'Industrial Machinery', 'Automation, robotics, CNC, factory equipment',                  2, '#475569'),
('sd-mfg-consumer',   'ind-manufacturing', 'Consumer Goods',       'FMCG, packaged goods, household products',                      3, '#CBD5E1'),
('sd-mfg-textiles',   'ind-manufacturing', 'Textiles',             'Apparel manufacturing, technical textiles, fashion supply chain',4, '#E2E8F0'),
('sd-mfg-supply',     'ind-manufacturing', 'Supply Chain Systems', 'Supply chain SaaS, procurement, demand planning',               5, '#334155'),
('sd-mfg-heavy',      'ind-manufacturing', 'Heavy Industry',       'Construction equipment, mining machinery, aerospace components', 6, '#1E293B'),

-- ── Healthcare (8) ───────────────────────────────────────────────
('sd-health-pharma',    'ind-healthcare', 'Pharma',          'Drug discovery, generics, contract manufacturing',                0, '#34D399'),
('sd-health-hospitals', 'ind-healthcare', 'Hospitals',       'Hospital chains, OPD networks, hospital IT',                      1, '#10B981'),
('sd-health-biotech',   'ind-healthcare', 'Biotech',         'Genomics, cell therapy, biologics, CRISPR',                       2, '#059669'),
('sd-health-diag',      'ind-healthcare', 'Diagnostics',     'Path labs, imaging, point-of-care, liquid biopsy',                3, '#6EE7B7'),
('sd-health-devices',   'ind-healthcare', 'Medical Devices', 'Wearables, surgical robotics, implants, medical hardware',        4, '#A7F3D0'),
('sd-health-digital',   'ind-healthcare', 'Healthtech',      'Telehealth, EHR, hospital SaaS, patient apps',                   5, '#047857'),
('sd-health-preventive','ind-healthcare', 'Preventive Care', 'Fitness, nutrition, lifestyle medicine, chronic care',            6, '#065F46'),
('sd-health-mental',    'ind-healthcare', 'Mental Health',   'Therapy platforms, mental wellness, psychiatry tech',             7, '#064E3B'),

-- ── Education (8) ────────────────────────────────────────────────
('sd-edu-universities','ind-education', 'Universities',         'Higher ed institutions, online degrees, MOOCs',                 0, '#FB923C'),
('sd-edu-schools',     'ind-education', 'Schools',              'K-12 learning platforms, school management, parental apps',     1, '#F97316'),
('sd-edu-edtech',      'ind-education', 'Edtech',               'Learning tech, LMS, AI tutors, content tools',                  2, '#EA580C'),
('sd-edu-publishing',  'ind-education', 'Knowledge Publishing', 'Academic publishers, digital textbooks, content libraries',     3, '#FED7AA'),
('sd-edu-testprep',    'ind-education', 'Test Prep',            'Competitive exam prep, tutoring, gamified assessment',          4, '#FFEDD5'),
('sd-edu-research',    'ind-education', 'Research Institutions','Research labs, think tanks, academic tooling',                  5, '#C2410C'),
('sd-edu-corporate',   'ind-education', 'Corporate Training',   'L&D platforms, enterprise upskilling, compliance training',     6, '#9A3412'),
('sd-edu-skills',      'ind-education', 'Skill Platforms',      'Bootcamps, certifications, vocational programs',                7, '#7C2D12'),

-- ── Media & Entertainment (8) ────────────────────────────────────
('sd-med-film',       'ind-media', 'Film',            'Production studios, distribution, film tech',                           0, '#F87171'),
('sd-med-tv',         'ind-media', 'Television',      'Linear TV, broadcast networks, CTV',                                    1, '#EF4444'),
('sd-med-streaming',  'ind-media', 'Streaming',       'OTT platforms, video & audio streaming',                                2, '#DC2626'),
('sd-med-music',      'ind-media', 'Music',           'Music streaming, distribution, labels, music tech',                     3, '#FCA5A5'),
('sd-med-gaming',     'ind-media', 'Gaming',          'Mobile gaming, console & PC, esports, fantasy sports',                  4, '#FECACA'),
('sd-med-creator',    'ind-media', 'Creator Economy', 'Creator tools, monetisation platforms, fan economy',                    5, '#B91C1C'),
('sd-med-sports-econ','ind-media', 'Sports Economy',  'Sports brands, merchandise, athlete platforms',                         6, '#991B1B'),
('sd-med-sports-med', 'ind-media', 'Sports Media',    'Sports broadcasting, analytics, fan engagement',                        7, '#7F1D1D'),

-- ── Commerce (7) ─────────────────────────────────────────────────
('sd-com-retail',      'ind-commerce', 'Retail',             'Omnichannel retail, retail tech, POS, store ops',                 0, '#F472B6'),
('sd-com-ecommerce',   'ind-commerce', 'E-commerce',         'Ecommerce platforms, storefronts, headless commerce',             1, '#EC4899'),
('sd-com-d2c',         'ind-commerce', 'D2C Brands',         'Direct-to-consumer brands, vertical commerce',                    2, '#DB2777'),
('sd-com-marketplaces','ind-commerce', 'Marketplaces',       'Horizontal & niche marketplaces, resale platforms',               3, '#FBCFE8'),
('sd-com-wholesale',   'ind-commerce', 'Wholesale',          'B2B commerce, wholesale platforms, distribution',                 4, '#F9A8D4'),
('sd-com-consumer',    'ind-commerce', 'Consumer Platforms', 'Grocery delivery, q-commerce, social commerce',                   5, '#BE185D'),
('sd-com-cx',          'ind-commerce', 'CX Systems',         'Storefront SaaS, conversion tools, customer support',             6, '#9D174D'),

-- ── Energy & Sustainability (7) ──────────────────────────────────
('sd-en-solar',  'ind-energy', 'Solar',             'Rooftop solar, solar farms, solar manufacturing',                         0, '#4ADE80'),
('sd-en-wind',   'ind-energy', 'Wind',              'Onshore/offshore wind, turbine components',                               1, '#22C55E'),
('sd-en-storage','ind-energy', 'Storage',           'Battery tech, grid storage, BESS, long-duration storage',                 2, '#16A34A'),
('sd-en-ev',     'ind-energy', 'EV Infrastructure', 'Charging networks, swap stations, EV fleet management',                   3, '#86EFAC'),
('sd-en-climate','ind-energy', 'Climate Tech',      'Carbon removal, climate modeling, ESG platforms',                         4, '#BBF7D0'),
('sd-en-waste',  'ind-energy', 'Waste Management',  'Recycling, circular economy, waste-to-energy',                            5, '#15803D'),
('sd-en-carbon', 'ind-energy', 'Carbon Management', 'Carbon credits, MRV platforms, offset verification',                     6, '#166534'),

-- ── Government & Public Systems (6) ──────────────────────────────
('sd-gov-governance','ind-government', 'Governance',           'GovTech, digital government, e-services, public data',          0, '#64748B'),
('sd-gov-defense',   'ind-government', 'Defense',              'Defense tech, aerospace defense, intelligence systems',          1, '#475569'),
('sd-gov-policy',    'ind-government', 'Public Policy',        'Policy research, think tanks, government advisory',              2, '#334155'),
('sd-gov-civic',     'ind-government', 'Civic Tech',           'Citizen engagement, open data, civic platforms',                 3, '#CBD5E1'),
('sd-gov-welfare',   'ind-government', 'Social Welfare',       'Benefits navigation, social services, community platforms',      4, '#94A3B8'),
('sd-gov-pubhealth', 'ind-government', 'Public Health Systems','Public health infra, disease surveillance, health policy tech',  5, '#1E293B'),

-- ── Mobility & Transportation (7) ────────────────────────────────
('sd-mob-aviation', 'ind-mobility', 'Aviation',            'Airlines, eVTOL, drones, airport tech, MRO',                        0, '#38BDF8'),
('sd-mob-rail',     'ind-mobility', 'Rail',                'Rail operators, rail tech, ticketing, freight rail',                 1, '#0EA5E9'),
('sd-mob-shipping', 'ind-mobility', 'Shipping',            'Ocean freight, container lines, port tech, maritime',                2, '#0284C7'),
('sd-mob-auto',     'ind-mobility', 'Automotive Mobility', 'Ride-hailing, car-sharing, autonomous mobility',                     3, '#7DD3FC'),
('sd-mob-delivery', 'ind-mobility', 'Delivery Systems',    'Last-mile, express delivery, courier networks',                      4, '#BAE6FD'),
('sd-mob-travel',   'ind-mobility', 'Travel Infrastructure','OTAs, hospitality, hotels, travel booking',                         5, '#0369A1'),
('sd-mob-logistics','ind-mobility', 'Logistics',           '3PL, contract logistics, freight brokerage',                         6, '#075985'),

-- ── Real Estate & Infrastructure (7) ─────────────────────────────
('sd-re-commercial', 'ind-realestate', 'Commercial',          'Office, retail, co-working, commercial leasing',                  0, '#FDBA74'),
('sd-re-construction','ind-realestate','Construction',        'Construction tech, BIM, project management, GCs',                 1, '#FB923C'),
('sd-re-smart',      'ind-realestate', 'Smart Buildings',     'IoT for buildings, energy management, automation',                2, '#F97316'),
('sd-re-facility',   'ind-realestate', 'Facility Management', 'Facility ops, maintenance, integrated services',                  3, '#FED7AA'),
('sd-re-residential','ind-realestate', 'Residential',         'Home buying, rental, residential brokerage, iBuying',             4, '#FFEDD5'),
('sd-re-proptech',   'ind-realestate', 'PropTech',            'Proptech platforms, marketplaces, fractional ownership',          5, '#EA580C'),
('sd-re-infra',      'ind-realestate', 'Infrastructure',      'Civil engineering, utilities, roads, bridges, smart cities',      6, '#C2410C'),

-- ── Agriculture & Food (6) ───────────────────────────────────────
('sd-agri-farming',   'ind-agriculture', 'Farming',            'Smart farming, precision agriculture, farmer networks',          0, '#86EFAC'),
('sd-agri-agritech',  'ind-agriculture', 'Agri-tech',          'AgriTech platforms, agri-SaaS, input marketplaces',              1, '#4ADE80'),
('sd-agri-food',      'ind-agriculture', 'Food Processing',    'Packaged foods, food processing tech, FMCG manufacturing',       2, '#22C55E'),
('sd-agri-fisheries', 'ind-agriculture', 'Fisheries',          'Aquaculture, fisheries tech, sustainable seafood',               3, '#BBF7D0'),
('sd-agri-supply',    'ind-agriculture', 'Supply Chain',       'Cold chain, agri logistics, FPO platforms, traceability',        4, '#DCFCE7'),
('sd-agri-nutrition', 'ind-agriculture', 'Nutrition & Delivery','Nutraceuticals, meal kits, alt-protein, food delivery',         5, '#16A34A')

ON CONFLICT (id) DO NOTHING;
