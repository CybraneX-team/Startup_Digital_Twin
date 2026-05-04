-- ================================================================
-- 010_seed_industries_full.sql
-- Full upsert of all 12 Work OS Universe industries.
-- Idempotent: safe to re-run (ON CONFLICT DO UPDATE).
-- ================================================================

INSERT INTO industries (id, label, description, color, position_3d, bubble_radius, tags)
VALUES
  ('ind-technology', 'Technology', 'AI, cloud, cybersecurity, hardware, Web3, enterprise software', '#818cf8', '{"x":0,"y":0,"z":0}'::jsonb, 14, '{"b2b","global","deep-tech","high-margin"}'),
  ('ind-finance', 'Finance', 'Fintech, banking, insurance, trading, investing, lending', '#22d3ee', '{"x":-70,"y":-10,"z":-55}'::jsonb, 13, '{"b2c","global","regulated","capital-markets"}'),
  ('ind-manufacturing', 'Manufacturing', 'Automotive, electronics, industrial machinery, consumer goods', '#fb923c', '{"x":70,"y":10,"z":-50}'::jsonb, 12, '{"b2b","global","capital-intensive","operations-heavy"}'),
  ('ind-healthcare', 'Healthcare', 'Pharma, hospitals, biotech, diagnostics, medical devices', '#34d399', '{"x":-60,"y":15,"z":60}'::jsonb, 13, '{"b2c","global","regulated","ai-driven"}'),
  ('ind-education', 'Education', 'Universities, schools, edtech, publishing, skill platforms', '#a78bfa', '{"x":60,"y":15,"z":60}'::jsonb, 11, '{"b2c","global","consumer","impact"}'),
  ('ind-media', 'Media & Entertainment', 'Film, TV, streaming, music, gaming, creator economy', '#f43f5e', '{"x":0,"y":-40,"z":-70}'::jsonb, 12, '{"b2c","global","ad-driven","content"}'),
  ('ind-commerce', 'Commerce', 'Retail, e-commerce, D2C brands, marketplaces, wholesale', '#f472b6', '{"x":0,"y":40,"z":70}'::jsonb, 12, '{"b2c","global","logistics-heavy","consumer"}'),
  ('ind-energy', 'Energy & Sustainability', 'Solar, wind, storage, EV infrastructure, climate tech', '#4ade80', '{"x":-80,"y":5,"z":0}'::jsonb, 11, '{"global","impact","capital-intensive","climate"}'),
  ('ind-government', 'Government & Public Systems', 'Governance, defense, public policy, civic tech, social welfare', '#64748b', '{"x":80,"y":-5,"z":0}'::jsonb, 10, '{"b2g","global","compliance-driven","impact"}'),
  ('ind-mobility', 'Mobility & Transportation', 'Aviation, rail, shipping, automotive mobility, delivery systems, logistics', '#38bdf8', '{"x":0,"y":80,"z":0}'::jsonb, 13, '{"b2c","global","unit-economics-hard","operations-heavy"}'),
  ('ind-realestate', 'Real Estate & Infrastructure', 'Commercial, construction, smart buildings, proptech, facility management', '#fdba74', '{"x":50,"y":55,"z":-40}'::jsonb, 11, '{"b2c","global","high-ticket","marketplace"}'),
  ('ind-agriculture', 'Agriculture & Food', 'Farming, agri-tech, food processing, fisheries, nutrition', '#86efac', '{"x":-50,"y":-55,"z":40}'::jsonb, 10, '{"b2b","global","impact","rural"}')
ON CONFLICT (id) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  color         = EXCLUDED.color,
  position_3d   = EXCLUDED.position_3d,
  bubble_radius = EXCLUDED.bubble_radius,
  tags          = EXCLUDED.tags;
