-- ============================================================
-- AnimalBase Database Schema
-- Run this in pgAdmin4 Query Tool after creating the DB
-- ============================================================

-- Drop tables if re-running
DROP TABLE IF EXISTS sightings          CASCADE;
DROP TABLE IF EXISTS adoption_applications CASCADE;
DROP TABLE IF EXISTS lost_pets          CASCADE;
DROP TABLE IF EXISTS pets               CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

-- ── ENUM TYPES ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role       AS ENUM ('user', 'admin');
  CREATE TYPE pet_type        AS ENUM ('Dogs','Cats','Birds','Small Animals','Reptiles','Other');
  CREATE TYPE pet_status      AS ENUM ('Available','Pending','Adopted');
  CREATE TYPE pet_gender      AS ENUM ('Male','Female');
  CREATE TYPE app_status      AS ENUM ('Pending','Approved','Rejected');
  CREATE TYPE lost_pet_status AS ENUM ('Missing','Found');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  full_name    VARCHAR(150) NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  phone        VARCHAR(30),
  address      TEXT,
  avatar_url   TEXT,
  new_pet_email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  pet_finder_email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  role         user_role NOT NULL DEFAULT 'user',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EMAIL VERIFICATIONS (OTP)
CREATE TABLE IF NOT EXISTS email_verifications (
  email        VARCHAR(255) PRIMARY KEY,
  otp_code     VARCHAR(10) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PETS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pets (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(100) NOT NULL,
  type                 pet_type NOT NULL,
  breed                VARCHAR(150) NOT NULL,
  gender               pet_gender NOT NULL,
  age                  VARCHAR(80) NOT NULL,
  weight               VARCHAR(80) NOT NULL,
  color_appearance     TEXT NOT NULL,
  description          TEXT NOT NULL,
  distinctive_features TEXT,
  image_url            TEXT,
  status               pet_status NOT NULL DEFAULT 'Available',
  shelter_name         VARCHAR(200),
  shelter_email        VARCHAR(255),
  shelter_phone        VARCHAR(30),
  location             VARCHAR(200),
  created_by           INT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ADOPTION APPLICATIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS adoption_applications (
  id                       SERIAL PRIMARY KEY,
  pet_id                   INT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id                  INT REFERENCES users(id) ON DELETE SET NULL,
  full_name                VARCHAR(150) NOT NULL,
  email                    VARCHAR(255) NOT NULL,
  phone                    VARCHAR(30)  NOT NULL,
  home_address             TEXT NOT NULL,
  previous_pet_experience  TEXT NOT NULL,
  why_adopt                TEXT NOT NULL,
  why_choose_you           TEXT NOT NULL,
  status                   app_status NOT NULL DEFAULT 'Pending',
  admin_remark             TEXT,
  submitted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LOST PETS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lost_pets (
  id                   SERIAL PRIMARY KEY,
  pet_name             VARCHAR(100) NOT NULL,
  type                 VARCHAR(50)  NOT NULL,
  breed                VARCHAR(150) NOT NULL,
  gender               VARCHAR(20)  NOT NULL,
  age                  VARCHAR(80),
  weight               VARCHAR(80),
  color_appearance     TEXT NOT NULL,
  description          TEXT NOT NULL,
  distinctive_features TEXT,
  image_url            TEXT,
  last_seen_location   TEXT NOT NULL,
  last_seen_date       DATE NOT NULL,
  reward_offered       VARCHAR(50),
  owner_name           VARCHAR(150) NOT NULL,
  owner_email          VARCHAR(255) NOT NULL,
  owner_phone          VARCHAR(30)  NOT NULL,
  owner_phone2         VARCHAR(30),
  reported_by          INT REFERENCES users(id) ON DELETE SET NULL,
  status               lost_pet_status NOT NULL DEFAULT 'Missing',
  reported_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SIGHTINGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sightings (
  id             SERIAL PRIMARY KEY,
  lost_pet_id    INT NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  reporter_name  VARCHAR(150) NOT NULL,
  reporter_email VARCHAR(255) NOT NULL,
  reporter_phone VARCHAR(30)  NOT NULL,
  location_seen  TEXT NOT NULL,
  address        TEXT,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  date_seen      DATE NOT NULL,
  description    TEXT NOT NULL,
  image_url      TEXT,
  reported_by    INT REFERENCES users(id) ON DELETE SET NULL,
  reported_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    ALTER TABLE sightings
      ADD COLUMN IF NOT EXISTS geo_point geometry(Point, 4326);
  END IF;
END $$;

-- ── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pets_type     ON pets(type);
CREATE INDEX IF NOT EXISTS idx_pets_status   ON pets(status);
CREATE INDEX IF NOT EXISTS idx_apps_user     ON adoption_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_pet      ON adoption_applications(pet_id);
CREATE INDEX IF NOT EXISTS idx_apps_status   ON adoption_applications(status);
CREATE INDEX IF NOT EXISTS idx_lost_status   ON lost_pets(status);
CREATE INDEX IF NOT EXISTS idx_sightings_pet ON sightings(lost_pet_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sightings'
      AND column_name = 'geo_point'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sightings_geo_point ON sightings USING GIST (geo_point)';
  END IF;
END $$;

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','pets','adoption_applications','lost_pets'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
  END LOOP;
END $$;

-- ── SEED: Sample Pets ────────────────────────────────────────
INSERT INTO pets (name, type, breed, gender, age, weight, color_appearance, description, image_url, status, shelter_name, shelter_email, shelter_phone, location)
VALUES
  ('Daisy',      'Birds',         'Sun Conure',             'Female', 'Young (2 months old)',  '120 grams', 'Bright orange, yellow, and green feathers', 'Daisy is a playful young Sun Conure who loves attention and exploring. She''s looking for a caring home to grow into a cheerful companion.', 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&q=80', 'Available', 'AnimalBase Shelter House', 'pets.absh@animalbase.com', '+63 9956789101', 'Birmingham, UK'),
  ('Bailey',     'Small Animals', 'African Pygmy Hedgehog', 'Male',   'Young (3 months old)', '300 grams', 'Brown and white quills',                  'Bailey is a curious and gentle hedgehog who loves to explore. He is litter trained and enjoys being handled.',                              'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&q=80', 'Available', 'AnimalBase Shelter House', 'pets.absh@animalbase.com', '+63 9956789101', 'Birmingham, UK'),
  ('Bluey',      'Dogs',          'Border Collie',          'Male',   'Adult (2 years old)',   '18 kg',     'Black and white',                         'Bluey is an energetic and intelligent Border Collie who loves to run and play. He needs an active family.',                               'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=400&q=80', 'Available', 'AnimalBase Shelter House', 'pets.absh@animalbase.com', '+63 9956789101', 'Manchester, UK'),
  ('Zoe',        'Cats',          'Domestic Shorthair',     'Female', 'Young (8 months old)', '3 kg',      'Brown tabby striped',                     'Zoe is a gentle and affectionate cat who loves to curl up on laps. She gets along well with other cats.',                                'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80', 'Available', 'AnimalBase Shelter House', 'pets.absh@animalbase.com', '+63 9956789101', 'London, UK'),
  ('Bambi',      'Small Animals', 'Teacup Pig',             'Female', 'Young (4 months old)', '1.2 kg',    'Pink with brown spots',                   'Bambi is a tiny sociable pig who loves treats and belly rubs. She is intelligent and can learn tricks.',                                 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80', 'Available', 'AnimalBase Shelter House', 'pets.absh@animalbase.com', '+63 9956789101', 'Leeds, UK'),
  ('Spike',      'Reptiles',      'Bearded Dragon',         'Male',   'Adult (1.5 years old)','450 grams', 'Sandy brown with orange highlights',       'Spike is a calm and friendly bearded dragon. He enjoys being handled and basking under his heat lamp.',                                  'https://images.unsplash.com/photo-1589558249810-a07f5c6a5600?w=400&q=80', 'Available', 'AnimalBase Shelter House', 'pets.absh@animalbase.com', '+63 9956789101', 'Bristol, UK'),
  ('Bernkastel', 'Cats',          'Domestic Shorthair',     'Female', 'Adult (3 years old)',  '4 kg',      'Grey and white',                          'Bernkastel is a calm and independent cat who enjoys sunny windowsills and quiet evenings.',                                             'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&q=80', 'Available', 'AnimalBase Shelter House', 'pets.absh@animalbase.com', '+63 9956789101', 'Birmingham, UK'),
  ('Luna',       'Dogs',          'Pug',                    'Female', 'Adult (4 years old)',  '8 kg',      'Fawn with black mask',                    'Luna is a lovable and lazy pug who enjoys cuddles on the couch and short walks in the park.',                                           'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80', 'Available', 'AnimalBase Shelter House', 'pets.absh@animalbase.com', '+63 9956789101', 'London, UK')
ON CONFLICT DO NOTHING;

-- ── SEED: Sample Lost Pets ───────────────────────────────────
INSERT INTO lost_pets (pet_name, type, breed, gender, age, weight, color_appearance, description, distinctive_features, image_url, last_seen_location, last_seen_date, reward_offered, owner_name, owner_email, owner_phone, status)
VALUES
  ('Bernkastel', 'Cat', 'Domestic Shorthair', 'Female', 'Adult (3 years old)', '4 kg', 'Brown tabby (striped)', 'Bernkastel is a young, curious brown tabby cat last seen near her home. She''s very shy with strangers and may hide when approached.', 'Brown paws, pink collar with bell, small scar on left ear. Very shy with strangers but responds to soft calls.', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&q=80', 'Saints Park, Birmingham', '2026-01-11', '₱15,000', 'Sarah Mitchell', 'sarah.m@email.com', '+63 981 236 3767', 'Missing'),
  ('Whiskey',    'Dog', 'Golden Retriever',   'Male',   'Adult (3 years old)', '31 kg','Golden',               'Whiskey is a friendly and energetic Golden Retriever. He loves people and will approach anyone wagging his tail.',                         'Blue collar with tag, friendly disposition, responds to his name.',                                                 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&q=80', 'Saints Park, Birmingham', '2026-01-10', NULL,       'James Carter',  'james.c@email.com', '+63 991 325 2816', 'Missing')
ON CONFLICT DO NOTHING;

SELECT 'Schema created and seeded successfully!' AS result;
