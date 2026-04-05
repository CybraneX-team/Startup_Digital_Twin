-- ================================================================
-- Seed industries from static DB
-- ================================================================
INSERT INTO industries (id, label, description, color, position_3d, bubble_radius, tags) VALUES
('ind-saas',       'SaaS',          'Software as a Service — subscription cloud products',        '#C1AEFF', '{"x":0,"y":0,"z":0}',        14, ARRAY['b2b','global','india','high-margin']),
('ind-fintech',    'FinTech',        'Payments, lending, neo-banking, wealth management',          '#22d3ee', '{"x":-70,"y":-10,"z":-55}',  12, ARRAY['b2c','india','global','regulated']),
('ind-healthtech', 'HealthTech',     'Digital health, pharma, diagnostics, fitness',               '#34d399', '{"x":70,"y":-10,"z":-55}',   11, ARRAY['b2c','india','regulated','ai-driven']),
('ind-edtech',     'EdTech',         'Online learning, upskilling, K-12, higher education',        '#fb923c', '{"x":-60,"y":20,"z":60}',    11, ARRAY['b2c','india','global','consumer']),
('ind-ecommerce',  'E-Commerce',     'Marketplace, D2C, quick commerce, social commerce',          '#f472b6', '{"x":60,"y":20,"z":60}',     12, ARRAY['b2c','india','global','logistics-heavy']),
('ind-aiml',       'AI / ML',        'Foundation models, AI infra, LLMs, MLOps',                  '#F9C6FF', '{"x":0,"y":-35,"z":-75}',    12, ARRAY['b2b','global','india','deep-tech']),
('ind-cleantech',  'CleanTech',      'Solar, wind, EVs, green hydrogen, carbon markets',           '#4ade80', '{"x":0,"y":35,"z":75}',      11, ARRAY['india','global','impact','capital-intensive']),
('ind-logistics',  'Logistics',      '3PL, last-mile delivery, supply chain tech',                 '#fbbf24', '{"x":-80,"y":5,"z":0}',      10, ARRAY['b2b','india','operations-heavy']),
('ind-gaming',     'Gaming',         'Mobile gaming, fantasy sports, esports, casual games',       '#a78bfa', '{"x":80,"y":-5,"z":0}',      10, ARRAY['b2c','india','consumer','high-engagement']),
('ind-mobility',   'Mobility',       'Ride-hailing, EV fleets, micro-mobility, autonomous',        '#38bdf8', '{"x":0,"y":80,"z":0}',       10, ARRAY['b2c','india','global','unit-economics-hard']),
('ind-media',      'Media',          'Short video, news, content platforms, OTT',                  '#f87171', '{"x":0,"y":-80,"z":0}',      10, ARRAY['b2c','india','ad-driven','vernacular']),
('ind-agritech',   'AgriTech',       'Farm-to-fork, precision agri, agri-input supply chains',    '#86efac', '{"x":-50,"y":-55,"z":40}',   9,  ARRAY['b2b','india','impact','rural']),
('ind-cyber',      'Cybersecurity',  'Threat intelligence, endpoint, SOC-as-a-Service, VAPT',     '#94a3b8', '{"x":50,"y":55,"z":-40}',    9,  ARRAY['b2b','india','global','compliance-driven']),
('ind-space',      'SpaceTech',      'Micro-launchers, earth observation, satellite comms',        '#e2e8f0', '{"x":-45,"y":50,"z":-55}',   9,  ARRAY['deep-tech','india','global','govt-adjacent']),
('ind-proptech',   'PropTech',       'Real estate discovery, rental, fractional ownership',        '#fdba74', '{"x":45,"y":-50,"z":55}',    9,  ARRAY['b2c','india','high-ticket','marketplace'])
ON CONFLICT (id) DO NOTHING;
