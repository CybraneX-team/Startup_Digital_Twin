/* ================================================================
   FounderOS — Migration 004: VC Connect
   Tables: vc_firms (reference), investor_pipeline (per-company CRM),
           investor_updates (monthly updates), vc_mentors, mentor_sessions
================================================================ */

/* ── vc_firms — Reference table seeded with real India + global VCs ── */
CREATE TABLE IF NOT EXISTS public.vc_firms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  short_name  text,
  region      text NOT NULL DEFAULT 'India',   -- 'India' | 'Global' | 'US' | 'SEA'
  hq_city     text,
  website     text,
  focus_stage text[],                           -- ['Pre-seed','Seed','Series A', ...]
  sectors     text[],                           -- ['SaaS','Fintech','Edtech', ...]
  avg_ticket  text,                             -- e.g. '$500K–$2M'
  total_fund  text,                             -- e.g. '$200M Fund IV'
  linkedin    text,
  logo_url    text,
  notable_investments text[],
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.vc_firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vc_firms public read" ON public.vc_firms FOR SELECT USING (true);

/* ── investor_pipeline — per-company investor CRM ── */
CREATE TABLE IF NOT EXISTS public.investor_pipeline (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vc_firm_id      uuid REFERENCES public.vc_firms(id) ON DELETE SET NULL,
  -- Allow custom (not-in-reference) investors too
  custom_name     text,
  custom_firm     text,
  partner_name    text,
  status          text NOT NULL DEFAULT 'prospect'
                  CHECK (status IN ('prospect','contacted','in-discussion','term-sheet','committed','passed')),
  last_contact    date,
  next_followup   date,
  ask_amount      text,                         -- e.g. '$500K'
  notes           text,
  warm_intro      boolean DEFAULT false,
  intro_by        text,
  shared_metrics  text[],
  tags            text[],
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.investor_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline company members" ON public.investor_pipeline
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = investor_pipeline.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

/* ── investor_updates — monthly/periodic investor updates ── */
CREATE TABLE IF NOT EXISTS public.investor_updates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title           text NOT NULL,
  period          text NOT NULL,               -- e.g. 'March 2025'
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent')),
  highlights      text[],
  asks            text[],
  metrics         jsonb DEFAULT '{}',          -- { mrr, arr, customers, burn, runway }
  sent_to         uuid[],                      -- array of investor_pipeline ids
  sent_at         timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.investor_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "updates company members" ON public.investor_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = investor_updates.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

/* ── vc_mentors — mentor registry (company-specific) ── */
CREATE TABLE IF NOT EXISTS public.vc_mentors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  role        text,
  company     text,
  linkedin    text,
  expertise   text[],
  availability text DEFAULT 'monthly',         -- 'weekly' | 'biweekly' | 'monthly'
  notes       text,
  added_by    uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.vc_mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentors company members" ON public.vc_mentors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = vc_mentors.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

/* ── mentor_sessions — session log per mentor ── */
CREATE TABLE IF NOT EXISTS public.mentor_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id   uuid NOT NULL REFERENCES public.vc_mentors(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  status      text NOT NULL DEFAULT 'scheduled'
              CHECK (status IN ('scheduled','completed','cancelled')),
  agenda      text[],
  actions     text[],
  follow_ups  text[],
  notes       text,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions company members" ON public.mentor_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = mentor_sessions.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

/* ================================================================
   SEED DATA — vc_firms
   Sources: public websites, Tracxn, Crunchbase (approximate 2024)
================================================================ */

INSERT INTO public.vc_firms (name, short_name, region, hq_city, website, focus_stage, sectors, avg_ticket, total_fund, notable_investments) VALUES

-- ── India VCs ────────────────────────────────────────────────────
('Peak XV Partners', 'Peak XV', 'India', 'Bengaluru', 'https://peakxv.com',
  ARRAY['Series A','Series B','Series C'],
  ARRAY['SaaS','Fintech','Consumer','Edtech','Healthtech'],
  '$2M–$20M', '$2.85B Fund IX',
  ARRAY['Razorpay','BYJU''s','Meesho','Khatabook','Groww']),

('Accel India', 'Accel', 'India', 'Bengaluru', 'https://accel.com',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['SaaS','Fintech','Consumer','Deeptech'],
  '$500K–$10M', '$650M Fund VIII',
  ARRAY['Flipkart','Freshworks','Swiggy','Zenoti','BrowserStack']),

('Nexus Venture Partners', 'Nexus', 'India', 'Mumbai', 'https://nexusvp.com',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['SaaS','Enterprise','Fintech','Agritech'],
  '$500K–$5M', '$700M',
  ARRAY['Delhivery','Unacademy','Rapido','Turtlemint']),

('Blume Ventures', 'Blume', 'India', 'Mumbai', 'https://blume.vc',
  ARRAY['Pre-seed','Seed','Series A'],
  ARRAY['SaaS','Consumer','Deeptech','Climate'],
  '$200K–$3M', '$250M Fund IV',
  ARRAY['Slice','Unacademy','Dunzo','Cashify','Servify']),

('Kalaari Capital', 'Kalaari', 'India', 'Bengaluru', 'https://kalaari.com',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['Consumer','Edtech','Healthtech','SaaS','D2C'],
  '$500K–$5M', '$290M Fund III',
  ARRAY['Myntra','Urban Ladder','Dream11','Cure.fit','Snapdeal']),

('Matrix Partners India', 'Matrix', 'India', 'Mumbai', 'https://matrixpartners.in',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['SaaS','Fintech','Consumer','B2B'],
  '$500K–$8M', '$550M Fund V',
  ARRAY['Ola','Practo','Mswipe','Dailyhunt','5paisa']),

('Elevation Capital', 'Elevation', 'India', 'Gurugram', 'https://elevationcapital.com',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['Fintech','SaaS','Consumer','Edtech'],
  '$1M–$15M', '$670M Fund VIII',
  ARRAY['Paytm','Sharechat','Unacademy','Urban Company','Spinny']),

('3one4 Capital', '3one4', 'India', 'Bengaluru', 'https://3one4capital.com',
  ARRAY['Pre-seed','Seed','Series A'],
  ARRAY['SaaS','Deeptech','Consumer','B2B'],
  '$200K–$4M', '$200M Fund IV',
  ARRAY['Locus','Darwinbox','Open Financial','BetterPlace','Setu']),

('India Quotient', 'IQ', 'India', 'Mumbai', 'https://indiaquotient.in',
  ARRAY['Pre-seed','Seed'],
  ARRAY['Consumer','Rural','Social','B2B'],
  '$100K–$1M', '$50M Fund III',
  ARRAY['ShareChat','Khatabook','Slice','Supr Daily']),

('Chiratae Ventures', 'Chiratae', 'India', 'Bengaluru', 'https://chiratae.com',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['SaaS','Consumer','Healthtech','Edtech','Fintech'],
  '$500K–$5M', '$335M Fund V',
  ARRAY['PolicyBazaar','Myntra','Lenskart','FirstCry','Cure.fit']),

('Prime Venture Partners', 'Prime VP', 'India', 'Bengaluru', 'https://primevp.in',
  ARRAY['Seed','Series A'],
  ARRAY['Fintech','SaaS','Consumer'],
  '$500K–$3M', '$120M Fund IV',
  ARRAY['Happay','Niyo','Ezetap','MFine','Freo']),

('Stellaris Venture Partners', 'Stellaris', 'India', 'Bengaluru', 'https://stellarisvp.com',
  ARRAY['Seed','Series A'],
  ARRAY['SaaS','Fintech','Consumer','Deeptech'],
  '$500K–$4M', '$225M Fund III',
  ARRAY['Mamaearth','Whatfix','Jar','Leap Finance','Recko']),

('Better Capital', 'Better', 'India', 'Delhi', 'https://bettercap.in',
  ARRAY['Pre-seed','Seed'],
  ARRAY['SaaS','Consumer','Fintech','D2C','Healthtech'],
  '$100K–$500K', 'Evergreen',
  ARRAY['Teachmint','Superpeer','Zarget','Squadstack']),

('Titan Capital', 'Titan', 'India', 'Delhi', 'https://titancap.in',
  ARRAY['Pre-seed','Seed'],
  ARRAY['Consumer','SaaS','D2C','Fintech'],
  '$100K–$1M', 'Rolling fund',
  ARRAY['Ola','Snapdeal','Urban Ladder','Wow! Momo']),

-- ── Global / US VCs ────────────────────────────────────────────
('Y Combinator', 'YC', 'Global', 'San Francisco', 'https://ycombinator.com',
  ARRAY['Pre-seed','Seed'],
  ARRAY['SaaS','Fintech','Deeptech','Consumer','Crypto','Biotech'],
  '$500K', 'Rolling batches',
  ARRAY['Airbnb','Stripe','Dropbox','Reddit','Brex','Razorpay']),

('Andreessen Horowitz', 'a16z', 'US', 'Menlo Park', 'https://a16z.com',
  ARRAY['Seed','Series A','Series B','Growth'],
  ARRAY['SaaS','Crypto','Biotech','Consumer','Fintech','AI'],
  '$5M–$100M', '$35B AUM',
  ARRAY['GitHub','Airbnb','Lyft','Stripe','Coinbase','OpenAI']),

('Sequoia Capital', 'Sequoia', 'US', 'Menlo Park', 'https://sequoiacap.com',
  ARRAY['Seed','Series A','Series B','Growth'],
  ARRAY['SaaS','Fintech','Consumer','Deeptech','AI'],
  '$1M–$100M', '$85B AUM',
  ARRAY['Apple','Google','WhatsApp','Stripe','Zoom']),

('Lightspeed Venture Partners', 'Lightspeed', 'US', 'Menlo Park', 'https://lsvp.com',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['SaaS','Consumer','Deeptech','Fintech'],
  '$1M–$30M', '$7.1B Fund XV',
  ARRAY['Snapchat','Affirm','Nutanix','AppDynamics','MuleSoft']),

('Bessemer Venture Partners', 'Bessemer', 'US', 'San Francisco', 'https://bvp.com',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['SaaS','Fintech','Consumer','Healthcare'],
  '$1M–$20M', '$4.6B Fund XII',
  ARRAY['LinkedIn','Shopify','Twitch','Wix','Intercom']),

('Tiger Global Management', 'Tiger Global', 'US', 'New York', 'https://tigerglobal.com',
  ARRAY['Series B','Series C','Growth'],
  ARRAY['SaaS','Consumer','Fintech','Ecommerce'],
  '$20M–$500M', '$58B AUM',
  ARRAY['Stripe','Databricks','Nubank','Flipkart','Ola']),

('SoftBank Vision Fund', 'SoftBank', 'Global', 'Tokyo', 'https://visionfund.com',
  ARRAY['Series C','Growth','Pre-IPO'],
  ARRAY['AI','Consumer','Fintech','Logistics','Proptech'],
  '$100M–$2B', '$100B SVF2',
  ARRAY['WeWork','Uber','ByteDance','Ola','Paytm','Meesho']),

('General Atlantic', 'GA', 'US', 'New York', 'https://generalatlantic.com',
  ARRAY['Growth','Pre-IPO'],
  ARRAY['SaaS','Consumer','Fintech','Healthcare'],
  '$50M–$500M', '$73B AUM',
  ARRAY['Airbnb','Alibaba','Freshworks','Clevertap','Slice']),

('GGV Capital', 'GGV', 'US', 'Menlo Park', 'https://ggvc.com',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['SaaS','Consumer','Fintech','B2B'],
  '$1M–$30M', '$9.2B AUM',
  ARRAY['Airbnb','Alibaba','Grab','HashiCorp','Slack']),

-- ── SEA VCs with India interest ─────────────────────────────────
('Jungle Ventures', 'Jungle', 'SEA', 'Singapore', 'https://jungle.vc',
  ARRAY['Series A','Series B'],
  ARRAY['SaaS','Fintech','Consumer','Healthtech'],
  '$3M–$15M', '$600M Fund IV',
  ARRAY['Kredivo','Moglix','iPrice','Coda Payments']),

('Vertex Ventures SEA & India', 'Vertex', 'SEA', 'Singapore', 'https://vertexventures.com',
  ARRAY['Seed','Series A','Series B'],
  ARRAY['Fintech','Consumer','Healthtech','SaaS'],
  '$1M–$10M', '$305M Fund V',
  ARRAY['Grab','Nium','PatSnap','Coda','Validus'])

ON CONFLICT DO NOTHING;

/* ── Indexes ── */
CREATE INDEX IF NOT EXISTS idx_investor_pipeline_company ON public.investor_pipeline(company_id);
CREATE INDEX IF NOT EXISTS idx_investor_pipeline_status  ON public.investor_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_investor_updates_company  ON public.investor_updates(company_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor    ON public.mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_company   ON public.mentor_sessions(company_id);
