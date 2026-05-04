-- ================================================================
-- 013_cleanup_and_fulldb.sql
-- 1. Remove the 13 legacy industries (and their subdomains/catalog companies
--    cascade via FK ON DELETE CASCADE).
-- 2. Ensure the 12 canonical Work OS Universe industries are present
--    with the exact color + position used by the 3D engine.
-- 3. Re-seed subdomains so only the 12-industry subdomains remain.
-- 4. No changes to catalog_companies — they already reference the
--    correct industry IDs.
-- ================================================================

-- ── 1. Delete the 13 legacy industries ───────────────────────────
-- subdomains.industry_id has ON DELETE CASCADE, so their rows go too.
-- catalog_companies.industry_id also has ON DELETE CASCADE.
DELETE FROM industries WHERE id IN (
  'ind-saas', 'ind-fintech', 'ind-healthtech', 'ind-edtech',
  'ind-ecommerce', 'ind-aiml', 'ind-cleantech', 'ind-logistics',
  'ind-gaming', 'ind-proptech', 'ind-agritech', 'ind-cyber', 'ind-space'
);

-- ── 2. Upsert the 12 canonical industries ────────────────────────
INSERT INTO industries (id, label, description, color, position_3d, bubble_radius, tags) VALUES
('ind-technology',   'Technology',                    'AI, cloud, cybersecurity, hardware, Web3, enterprise software',        '#818cf8', '{"x":0,"y":0,"z":0}',           14, ARRAY['b2b','global','deep-tech','high-margin']),
('ind-finance',      'Finance',                       'Fintech, banking, insurance, trading, investing, lending',              '#22d3ee', '{"x":-70,"y":-10,"z":-55}',      13, ARRAY['b2c','global','regulated','capital-markets']),
('ind-manufacturing','Manufacturing',                 'Automotive, electronics, industrial machinery, consumer goods',         '#fb923c', '{"x":70,"y":10,"z":-50}',        12, ARRAY['b2b','global','capital-intensive','operations-heavy']),
('ind-healthcare',   'Healthcare',                    'Pharma, hospitals, biotech, diagnostics, medical devices',              '#34d399', '{"x":-60,"y":15,"z":60}',         13, ARRAY['b2c','global','regulated','ai-driven']),
('ind-education',    'Education',                     'Universities, schools, edtech, publishing, skill platforms',            '#a78bfa', '{"x":60,"y":15,"z":60}',          11, ARRAY['b2c','global','consumer','impact']),
('ind-media',        'Media & Entertainment',         'Film, TV, streaming, music, gaming, creator economy',                  '#f43f5e', '{"x":0,"y":-40,"z":-70}',         12, ARRAY['b2c','global','ad-driven','content']),
('ind-commerce',     'Commerce',                      'Retail, e-commerce, D2C brands, marketplaces, wholesale',              '#f472b6', '{"x":0,"y":40,"z":70}',            12, ARRAY['b2c','global','logistics-heavy','consumer']),
('ind-energy',       'Energy & Sustainability',       'Solar, wind, storage, EV infrastructure, climate tech',                '#4ade80', '{"x":-80,"y":5,"z":0}',           11, ARRAY['global','impact','capital-intensive','climate']),
('ind-government',   'Government & Public Systems',   'Governance, defense, public policy, civic tech, social welfare',       '#64748b', '{"x":80,"y":-5,"z":0}',           10, ARRAY['b2g','global','compliance-driven','impact']),
('ind-mobility',     'Mobility & Transportation',     'Aviation, rail, shipping, automotive mobility, delivery systems',       '#38bdf8', '{"x":0,"y":80,"z":0}',            13, ARRAY['b2c','global','unit-economics-hard','operations-heavy']),
('ind-realestate',   'Real Estate & Infrastructure',  'Commercial, construction, smart buildings, proptech, facility mgmt',   '#fdba74', '{"x":50,"y":55,"z":-40}',         11, ARRAY['b2c','global','high-ticket','marketplace']),
('ind-agriculture',  'Agriculture & Food',            'Farming, agri-tech, food processing, fisheries, nutrition',            '#86efac', '{"x":-50,"y":-55,"z":40}',        10, ARRAY['b2b','global','impact','rural'])
ON CONFLICT (id) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  color         = EXCLUDED.color,
  position_3d   = EXCLUDED.position_3d,
  bubble_radius = EXCLUDED.bubble_radius,
  tags          = EXCLUDED.tags;

-- ── 3. Re-seed all subdomains (idempotent) ───────────────────────
-- Delete any that might be stale (orphaned by cascade already gone,
-- but re-inserting all to ensure orbit_index and color are current).
DELETE FROM subdomains WHERE industry_id IN (
  'ind-technology','ind-finance','ind-manufacturing','ind-healthcare',
  'ind-education','ind-media','ind-commerce','ind-energy',
  'ind-government','ind-mobility','ind-realestate','ind-agriculture'
);

INSERT INTO subdomains (id, industry_id, label, description, orbit_index, color) VALUES

-- ── Technology (7) ───────────────────────────────────────────────
('sd-tech-ai',         'ind-technology', 'AI',                  'Foundation models, LLMs, AI infra, MLOps, inference',                0, '#818cf8'),
('sd-tech-cloud',      'ind-technology', 'Cloud',               'IaaS, PaaS, cloud platforms, edge compute, CDN',                     1, '#818cf8'),
('sd-tech-cyber',      'ind-technology', 'Cybersecurity',       'Threat intel, endpoint security, SOC, identity, network security',   2, '#818cf8'),
('sd-tech-hardware',   'ind-technology', 'Hardware',            'Semiconductors, chips, consumer electronics, IoT hardware',          3, '#818cf8'),
('sd-tech-web3',       'ind-technology', 'Web3',                'Blockchain, DeFi, NFTs, wallets, on-chain infrastructure',           4, '#818cf8'),
('sd-tech-enterprise', 'ind-technology', 'Enterprise Software', 'ERP, CRM, HRMS, collaboration, business process platforms',          5, '#818cf8'),
('sd-tech-software',   'ind-technology', 'Software',            'Productivity, design, dev tools, general software platforms',        6, '#818cf8'),

-- ── Finance (7) ──────────────────────────────────────────────────
('sd-fin-fintech',  'ind-finance', 'Fintech',          'Payments, gateways, UPI, B2B payments, embedded finance',             0, '#22d3ee'),
('sd-fin-banking',  'ind-finance', 'Banking',          'Digital banking, neo-banks, account infra, open banking',             1, '#22d3ee'),
('sd-fin-insurance','ind-finance', 'Insurance',        'InsurTech, distribution, underwriting, claims automation',            2, '#22d3ee'),
('sd-fin-trading',  'ind-finance', 'Trading',          'Brokerage tech, market data, execution, retail trading',              3, '#22d3ee'),
('sd-fin-investing','ind-finance', 'Investing',        'Robo-advisors, wealth platforms, mutual funds, alt assets',           4, '#22d3ee'),
('sd-fin-asset',    'ind-finance', 'Asset Management', 'Asset managers, fund platforms, institutional wealth',                5, '#22d3ee'),
('sd-fin-lending',  'ind-finance', 'Lending',          'Consumer credit, BNPL, SME loans, mortgage tech',                    6, '#22d3ee'),

-- ── Manufacturing (7) ────────────────────────────────────────────
('sd-mfg-automotive', 'ind-manufacturing', 'Automotive',           'Car OEMs, EV makers, auto components, ADAS',                    0, '#fb923c'),
('sd-mfg-electronics','ind-manufacturing', 'Electronics',          'Consumer electronics, contract manufacturing, PCBs',            1, '#fb923c'),
('sd-mfg-industrial', 'ind-manufacturing', 'Industrial Machinery', 'Automation, robotics, CNC, factory equipment',                  2, '#fb923c'),
('sd-mfg-consumer',   'ind-manufacturing', 'Consumer Goods',       'FMCG, packaged goods, household products',                      3, '#fb923c'),
('sd-mfg-textiles',   'ind-manufacturing', 'Textiles',             'Apparel manufacturing, technical textiles, fashion supply chain',4, '#fb923c'),
('sd-mfg-supply',     'ind-manufacturing', 'Supply Chain Systems', 'Supply chain SaaS, procurement, demand planning',               5, '#fb923c'),
('sd-mfg-heavy',      'ind-manufacturing', 'Heavy Industry',       'Construction equipment, mining machinery, aerospace components', 6, '#fb923c'),

-- ── Healthcare (8) ───────────────────────────────────────────────
('sd-health-pharma',    'ind-healthcare', 'Pharma',          'Drug discovery, generics, contract manufacturing',                0, '#34d399'),
('sd-health-hospitals', 'ind-healthcare', 'Hospitals',       'Hospital chains, OPD networks, hospital IT',                      1, '#34d399'),
('sd-health-biotech',   'ind-healthcare', 'Biotech',         'Genomics, cell therapy, biologics, CRISPR',                       2, '#34d399'),
('sd-health-diag',      'ind-healthcare', 'Diagnostics',     'Path labs, imaging, point-of-care, liquid biopsy',                3, '#34d399'),
('sd-health-devices',   'ind-healthcare', 'Medical Devices', 'Wearables, surgical robotics, implants, medical hardware',        4, '#34d399'),
('sd-health-digital',   'ind-healthcare', 'Healthtech',      'Telehealth, EHR, hospital SaaS, patient apps',                   5, '#34d399'),
('sd-health-preventive','ind-healthcare', 'Preventive Care', 'Fitness, nutrition, lifestyle medicine, chronic care',            6, '#34d399'),
('sd-health-mental',    'ind-healthcare', 'Mental Health',   'Therapy platforms, mental wellness, psychiatry tech',             7, '#34d399'),

-- ── Education (8) ────────────────────────────────────────────────
('sd-edu-universities','ind-education', 'Universities',         'Higher ed institutions, online degrees, MOOCs',                 0, '#a78bfa'),
('sd-edu-schools',     'ind-education', 'Schools',              'K-12 learning platforms, school management, parental apps',     1, '#a78bfa'),
('sd-edu-edtech',      'ind-education', 'Edtech',               'Learning tech, LMS, AI tutors, content tools',                  2, '#a78bfa'),
('sd-edu-publishing',  'ind-education', 'Knowledge Publishing', 'Academic publishers, digital textbooks, content libraries',     3, '#a78bfa'),
('sd-edu-testprep',    'ind-education', 'Test Prep',            'Competitive exam prep, tutoring, gamified assessment',          4, '#a78bfa'),
('sd-edu-research',    'ind-education', 'Research Institutions','Research labs, think tanks, academic tooling',                  5, '#a78bfa'),
('sd-edu-corporate',   'ind-education', 'Corporate Training',   'L&D platforms, enterprise upskilling, compliance training',     6, '#a78bfa'),
('sd-edu-skills',      'ind-education', 'Skill Platforms',      'Bootcamps, certifications, vocational programs',                7, '#a78bfa'),

-- ── Media & Entertainment (8) ────────────────────────────────────
('sd-med-film',       'ind-media', 'Film',            'Production studios, distribution, film tech',                           0, '#f43f5e'),
('sd-med-tv',         'ind-media', 'Television',      'Linear TV, broadcast networks, CTV',                                    1, '#f43f5e'),
('sd-med-streaming',  'ind-media', 'Streaming',       'OTT platforms, video & audio streaming',                                2, '#f43f5e'),
('sd-med-music',      'ind-media', 'Music',           'Music streaming, distribution, labels, music tech',                     3, '#f43f5e'),
('sd-med-gaming',     'ind-media', 'Gaming',          'Mobile gaming, console & PC, esports, fantasy sports',                  4, '#f43f5e'),
('sd-med-creator',    'ind-media', 'Creator Economy', 'Creator tools, monetisation platforms, fan economy',                    5, '#f43f5e'),
('sd-med-sports-econ','ind-media', 'Sports Economy',  'Sports brands, merchandise, athlete platforms',                         6, '#f43f5e'),
('sd-med-sports-med', 'ind-media', 'Sports Media',    'Sports broadcasting, analytics, fan engagement',                        7, '#f43f5e'),

-- ── Commerce (7) ─────────────────────────────────────────────────
('sd-com-retail',      'ind-commerce', 'Retail',             'Omnichannel retail, retail tech, POS, store ops',                 0, '#f472b6'),
('sd-com-ecommerce',   'ind-commerce', 'E-commerce',         'Ecommerce platforms, storefronts, headless commerce',             1, '#f472b6'),
('sd-com-d2c',         'ind-commerce', 'D2C Brands',         'Direct-to-consumer brands, vertical commerce',                    2, '#f472b6'),
('sd-com-marketplaces','ind-commerce', 'Marketplaces',       'Horizontal & niche marketplaces, resale platforms',               3, '#f472b6'),
('sd-com-wholesale',   'ind-commerce', 'Wholesale',          'B2B commerce, wholesale platforms, distribution',                 4, '#f472b6'),
('sd-com-consumer',    'ind-commerce', 'Consumer Platforms', 'Grocery delivery, q-commerce, social commerce',                   5, '#f472b6'),
('sd-com-cx',          'ind-commerce', 'CX Systems',         'Storefront SaaS, conversion tools, customer support',             6, '#f472b6'),

-- ── Energy & Sustainability (8) ──────────────────────────────────
('sd-en-solar',    'ind-energy', 'Solar',             'Rooftop solar, solar farms, solar manufacturing',                         0, '#4ade80'),
('sd-en-wind',     'ind-energy', 'Wind',              'Onshore/offshore wind, turbine components',                               1, '#4ade80'),
('sd-en-storage',  'ind-energy', 'Storage',           'Battery tech, grid storage, BESS, long-duration storage',                 2, '#4ade80'),
('sd-en-ev',       'ind-energy', 'EV Infrastructure', 'Charging networks, swap stations, EV fleet management',                   3, '#4ade80'),
('sd-en-carbon',   'ind-energy', 'Carbon Management', 'Carbon credits, MRV platforms, offset verification',                      4, '#4ade80'),
('sd-en-waste',    'ind-energy', 'Waste Management',  'Recycling, circular economy, waste-to-energy',                            5, '#4ade80'),
('sd-en-waste-sys','ind-energy', 'Waste Systems',     'Waste collection ops, smart bins, sanitation infrastructure',             6, '#4ade80'),
('sd-en-climate',  'ind-energy', 'Climate Tech',      'Carbon removal, climate modeling, ESG platforms',                         7, '#4ade80'),

-- ── Government & Public Systems (6) ──────────────────────────────
('sd-gov-governance','ind-government', 'Governance',           'GovTech, digital government, e-services, public data',          0, '#64748b'),
('sd-gov-defense',   'ind-government', 'Defense',              'Defense tech, aerospace defense, intelligence systems',          1, '#64748b'),
('sd-gov-policy',    'ind-government', 'Public Policy',        'Policy research, think tanks, government advisory',              2, '#64748b'),
('sd-gov-civic',     'ind-government', 'Civic Tech',           'Citizen engagement, open data, civic platforms',                 3, '#64748b'),
('sd-gov-welfare',   'ind-government', 'Social Welfare',       'Benefits navigation, social services, community platforms',      4, '#64748b'),
('sd-gov-pubhealth', 'ind-government', 'Public Health Systems','Public health infra, disease surveillance, health policy tech',  5, '#64748b'),
('sd-gov-social',    'ind-government', 'Social Systems',       'Social security tech, pension platforms, welfare SaaS',          6, '#64748b'),
('sd-gov-sust',      'ind-government', 'Sust Tech',            'Sustainability-driven public infrastructure and policy tools',    7, '#64748b'),

-- ── Mobility & Transportation (7) ────────────────────────────────
('sd-mob-aviation', 'ind-mobility', 'Aviation',            'Airlines, eVTOL, drones, airport tech, MRO',                        0, '#38bdf8'),
('sd-mob-rail',     'ind-mobility', 'Rail',                'Rail operators, rail tech, ticketing, freight rail',                 1, '#38bdf8'),
('sd-mob-shipping', 'ind-mobility', 'Shipping',            'Ocean freight, container lines, port tech, maritime',                2, '#38bdf8'),
('sd-mob-auto',     'ind-mobility', 'Automotive Mobility', 'Ride-hailing, car-sharing, autonomous mobility',                     3, '#38bdf8'),
('sd-mob-delivery', 'ind-mobility', 'Delivery Systems',    'Last-mile, express delivery, courier networks',                      4, '#38bdf8'),
('sd-mob-travel',   'ind-mobility', 'Travel Infrastructure','OTAs, hospitality, hotels, travel booking',                         5, '#38bdf8'),
('sd-mob-logistics','ind-mobility', 'Logistics',           '3PL, contract logistics, freight brokerage',                         6, '#38bdf8'),

-- ── Real Estate & Infrastructure (7) ─────────────────────────────
('sd-re-residential','ind-realestate', 'Residential',         'Home buying, rental, residential brokerage, iBuying',             0, '#fdba74'),
('sd-re-commercial', 'ind-realestate', 'Commercial',          'Office, retail, co-working, commercial leasing',                  1, '#fdba74'),
('sd-re-construction','ind-realestate','Construction',        'Construction tech, BIM, project management, GCs',                 2, '#fdba74'),
('sd-re-facility',   'ind-realestate', 'Facility Management', 'Facility ops, maintenance, integrated services',                  3, '#fdba74'),
('sd-re-smart',      'ind-realestate', 'Smart Buildings',     'IoT for buildings, energy management, automation',                4, '#fdba74'),
('sd-re-proptech',   'ind-realestate', 'PropTech',            'Proptech platforms, marketplaces, fractional ownership',          5, '#fdba74'),
('sd-re-infra',      'ind-realestate', 'Infrastructure',      'Civil engineering, utilities, roads, bridges, smart cities',      6, '#fdba74'),

-- ── Agriculture & Food (6) ───────────────────────────────────────
('sd-agri-farming',   'ind-agriculture', 'Farming',            'Smart farming, precision agriculture, farmer networks',          0, '#86efac'),
('sd-agri-agritech',  'ind-agriculture', 'Agri-tech',          'AgriTech platforms, agri-SaaS, input marketplaces',              1, '#86efac'),
('sd-agri-food',      'ind-agriculture', 'Food Processing',    'Packaged foods, food processing tech, FMCG manufacturing',       2, '#86efac'),
('sd-agri-fisheries', 'ind-agriculture', 'Fisheries',          'Aquaculture, fisheries tech, sustainable seafood',               3, '#86efac'),
('sd-agri-supply',    'ind-agriculture', 'Supply Chain',       'Cold chain, agri logistics, FPO platforms, traceability',        4, '#86efac'),
('sd-agri-nutrition', 'ind-agriculture', 'Nutrition & Delivery','Nutraceuticals, meal kits, alt-protein, food delivery',         5, '#86efac')

ON CONFLICT (id) DO UPDATE SET
  label       = EXCLUDED.label,
  description = EXCLUDED.description,
  orbit_index = EXCLUDED.orbit_index,
  color       = EXCLUDED.color;
