-- =============================================================================
-- GrowthOS AutoRepair — Service Jobs Catalog + estimate_items upgrade
-- Paste into Supabase SQL Editor and click Run.
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE throughout).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. service_categories  — shared catalog, no tenant_id
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_categories (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text    NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_categories_name
  ON service_categories (name);

-- Readable by any authenticated user; write via Supabase dashboard only.
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_categories_read" ON service_categories;
CREATE POLICY "service_categories_read" ON service_categories
  FOR SELECT USING (auth.role() = 'authenticated');


-- ---------------------------------------------------------------------------
-- 2. service_jobs  — shared catalog, no tenant_id
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_jobs (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         uuid    NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  name                text    NOT NULL,
  description         text,
  default_labor_hours numeric(6,2),   -- typical hours for this job
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_jobs_category
  ON service_jobs (category_id);

ALTER TABLE service_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_jobs_read" ON service_jobs;
CREATE POLICY "service_jobs_read" ON service_jobs
  FOR SELECT USING (auth.role() = 'authenticated');


-- ---------------------------------------------------------------------------
-- 3. estimate_items upgrades  — add job-based columns
--    All new columns are nullable so existing manual items are unaffected.
-- ---------------------------------------------------------------------------

ALTER TABLE estimate_items
  ADD COLUMN IF NOT EXISTS service_job_id uuid REFERENCES service_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS labor_hours    numeric(8,3),
  ADD COLUMN IF NOT EXISTS labor_rate     numeric(10,2),
  ADD COLUMN IF NOT EXISTS labor_total    numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parts_total    numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes         text;

CREATE INDEX IF NOT EXISTS idx_estimate_items_service_job
  ON estimate_items (service_job_id)
  WHERE service_job_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 4. Seed data — service categories
-- ---------------------------------------------------------------------------

INSERT INTO service_categories (name, sort_order) VALUES
  ('Maintenance',   10),
  ('Brakes',        20),
  ('Engine',        30),
  ('Suspension',    40),
  ('Transmission',  50),
  ('Electrical',    60),
  ('AC & Heating',  70),
  ('Tires & Wheels',80),
  ('Diagnostics',   90)
ON CONFLICT (name) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 5. Seed data — service jobs
--    default_labor_hours are typical book-time estimates.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  cat_maintenance   uuid;
  cat_brakes        uuid;
  cat_engine        uuid;
  cat_suspension    uuid;
  cat_transmission  uuid;
  cat_electrical    uuid;
  cat_ac            uuid;
  cat_tires         uuid;
  cat_diagnostics   uuid;
BEGIN
  SELECT id INTO cat_maintenance   FROM service_categories WHERE name = 'Maintenance';
  SELECT id INTO cat_brakes        FROM service_categories WHERE name = 'Brakes';
  SELECT id INTO cat_engine        FROM service_categories WHERE name = 'Engine';
  SELECT id INTO cat_suspension    FROM service_categories WHERE name = 'Suspension';
  SELECT id INTO cat_transmission  FROM service_categories WHERE name = 'Transmission';
  SELECT id INTO cat_electrical    FROM service_categories WHERE name = 'Electrical';
  SELECT id INTO cat_ac            FROM service_categories WHERE name = 'AC & Heating';
  SELECT id INTO cat_tires         FROM service_categories WHERE name = 'Tires & Wheels';
  SELECT id INTO cat_diagnostics   FROM service_categories WHERE name = 'Diagnostics';

  -- Maintenance
  INSERT INTO service_jobs (category_id, name, description, default_labor_hours) VALUES
    (cat_maintenance, 'Oil & Filter Change',              'Drain and replace engine oil and filter',                          0.50),
    (cat_maintenance, 'Tire Rotation',                    'Rotate all four tires to even wear',                               0.50),
    (cat_maintenance, 'Multi-Point Inspection',           'Comprehensive vehicle safety inspection',                          0.75),
    (cat_maintenance, 'Cabin Air Filter Replacement',     'Replace cabin air filter element',                                 0.25),
    (cat_maintenance, 'Engine Air Filter Replacement',    'Replace engine intake air filter',                                 0.25),
    (cat_maintenance, 'Wiper Blade Replacement',          'Replace front and/or rear wiper blades',                           0.25),
    (cat_maintenance, 'Coolant Flush',                    'Flush and refill cooling system',                                  1.00),
    (cat_maintenance, 'Transmission Fluid Service',       'Drain and refill transmission fluid',                              1.00),
    (cat_maintenance, 'Differential Fluid Service',       'Drain and replace front/rear differential fluid',                  0.75),
    (cat_maintenance, 'Power Steering Fluid Flush',       'Flush and replace power steering fluid',                           0.50),
    (cat_maintenance, 'Fuel Filter Replacement',          'Replace inline or in-tank fuel filter',                            1.00),
    (cat_maintenance, 'Spark Plug Replacement',           'Replace all spark plugs',                                          1.50),
    (cat_maintenance, 'Serpentine Belt Replacement',      'Replace main drive belt',                                          1.00),
    (cat_maintenance, 'Timing Belt Replacement',          'Replace timing belt and related components',                       4.00),
    (cat_maintenance, 'Battery Replacement',              'Test and replace vehicle battery',                                  0.50)
  ON CONFLICT DO NOTHING;

  -- Brakes
  INSERT INTO service_jobs (category_id, name, description, default_labor_hours) VALUES
    (cat_brakes, 'Brake Pad Replacement – Front',         'Replace front brake pads',                                         1.00),
    (cat_brakes, 'Brake Pad Replacement – Rear',          'Replace rear brake pads',                                          1.00),
    (cat_brakes, 'Brake Pads & Rotors – Front',           'Replace front pads and resurface/replace rotors',                  1.50),
    (cat_brakes, 'Brake Pads & Rotors – Rear',            'Replace rear pads and resurface/replace rotors',                   1.50),
    (cat_brakes, 'Brake Fluid Flush',                     'Flush and replace brake fluid',                                    0.75),
    (cat_brakes, 'Brake Caliper Replacement (per axle)',  'Replace one or both brake calipers on an axle',                    2.00),
    (cat_brakes, 'Brake Master Cylinder Replacement',     'Replace brake master cylinder',                                    2.00),
    (cat_brakes, 'Brake Line Repair',                     'Repair or replace damaged brake line',                             2.50)
  ON CONFLICT DO NOTHING;

  -- Engine
  INSERT INTO service_jobs (category_id, name, description, default_labor_hours) VALUES
    (cat_engine, 'Oil Leak Repair',                       'Diagnose and repair engine oil leak',                              2.00),
    (cat_engine, 'Valve Cover Gasket Replacement',        'Replace valve cover gasket(s)',                                    2.00),
    (cat_engine, 'Head Gasket Replacement',               'Remove cylinder head and replace head gasket',                     8.00),
    (cat_engine, 'Timing Chain Replacement',              'Replace timing chain and related components',                      6.00),
    (cat_engine, 'Water Pump Replacement',                'Replace engine water pump',                                        3.00),
    (cat_engine, 'Thermostat Replacement',                'Replace engine thermostat',                                        1.50),
    (cat_engine, 'Radiator Replacement',                  'Remove and replace radiator',                                      2.00),
    (cat_engine, 'Fuel Injector Service',                 'Clean or replace fuel injectors',                                  1.00),
    (cat_engine, 'Fuel Pump Replacement',                 'Replace fuel pump assembly',                                       2.50),
    (cat_engine, 'Catalytic Converter Replacement',       'Replace catalytic converter',                                      2.00),
    (cat_engine, 'Oxygen Sensor Replacement',             'Replace one or more oxygen/O2 sensors',                            1.00)
  ON CONFLICT DO NOTHING;

  -- Suspension
  INSERT INTO service_jobs (category_id, name, description, default_labor_hours) VALUES
    (cat_suspension, 'Strut / Shock Replacement (per axle)', 'Replace struts or shocks on one axle',                         2.50),
    (cat_suspension, 'Control Arm Replacement',           'Replace upper or lower control arm',                               2.00),
    (cat_suspension, 'Tie Rod Replacement',               'Replace inner and/or outer tie rod',                               2.00),
    (cat_suspension, 'Ball Joint Replacement',            'Replace one or more ball joints',                                  2.50),
    (cat_suspension, 'Wheel Bearing Replacement',         'Replace front or rear wheel bearing/hub',                          2.50),
    (cat_suspension, 'Sway Bar Link Replacement',         'Replace sway bar end links',                                       1.00),
    (cat_suspension, 'Wheel Alignment',                   '4-wheel computerized alignment',                                   1.00),
    (cat_suspension, 'CV Axle Replacement',               'Replace CV axle shaft',                                            2.50)
  ON CONFLICT DO NOTHING;

  -- Transmission
  INSERT INTO service_jobs (category_id, name, description, default_labor_hours) VALUES
    (cat_transmission, 'Transmission Service (Drain & Fill)', 'Drain and refill transmission fluid and replace filter',      1.00),
    (cat_transmission, 'Transmission Flush',               'Full flush of transmission fluid',                               1.50),
    (cat_transmission, 'Transmission Replacement',         'Remove and replace transmission assembly',                       8.00),
    (cat_transmission, 'Clutch Replacement',               'Replace clutch disc, pressure plate, and release bearing',       6.00)
  ON CONFLICT DO NOTHING;

  -- Electrical
  INSERT INTO service_jobs (category_id, name, description, default_labor_hours) VALUES
    (cat_electrical, 'Alternator Replacement',             'Replace alternator and related hardware',                        2.00),
    (cat_electrical, 'Starter Replacement',                'Replace starter motor',                                          2.00),
    (cat_electrical, 'Window Regulator Replacement',       'Replace power window regulator and/or motor',                    1.50),
    (cat_electrical, 'Headlight Bulb Replacement',         'Replace one or both headlight bulbs',                            0.50)
  ON CONFLICT DO NOTHING;

  -- AC & Heating
  INSERT INTO service_jobs (category_id, name, description, default_labor_hours) VALUES
    (cat_ac, 'AC Recharge',                               'Evacuate and recharge AC refrigerant',                            1.00),
    (cat_ac, 'AC Compressor Replacement',                 'Replace AC compressor',                                           3.00),
    (cat_ac, 'Heater Core Replacement',                   'Remove dash and replace heater core',                             6.00),
    (cat_ac, 'Condenser Replacement',                     'Replace AC condenser',                                            2.00),
    (cat_ac, 'Evaporator Replacement',                    'Remove dash and replace AC evaporator',                           5.00)
  ON CONFLICT DO NOTHING;

  -- Tires & Wheels
  INSERT INTO service_jobs (category_id, name, description, default_labor_hours) VALUES
    (cat_tires, 'Tire Mount & Balance (per tire)',         'Dismount, mount new tire, and balance wheel',                     0.50),
    (cat_tires, 'TPMS Sensor Replacement (per sensor)',   'Replace tire pressure monitoring sensor',                         0.50)
  ON CONFLICT DO NOTHING;

  -- Diagnostics
  INSERT INTO service_jobs (category_id, name, description, default_labor_hours) VALUES
    (cat_diagnostics, 'General Diagnostic / Inspection',  'Diagnose reported concern and inspect vehicle',                   1.00),
    (cat_diagnostics, 'Check Engine Light Diagnosis',     'Scan codes, diagnose root cause of CEL',                          1.00),
    (cat_diagnostics, 'Electrical System Diagnostic',     'Diagnose electrical fault or no-start condition',                 1.50),
    (cat_diagnostics, 'Transmission Diagnostic',          'Road test and diagnose transmission concern',                     1.00),
    (cat_diagnostics, 'AC System Diagnostic',             'Pressure test and diagnose AC system',                            1.00),
    (cat_diagnostics, 'Noise / Vibration Diagnostic',     'Diagnose abnormal noise or vibration',                            1.50)
  ON CONFLICT DO NOTHING;

END $$;
