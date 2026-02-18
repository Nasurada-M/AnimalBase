-- AnimalBase Database Schema
-- PostgreSQL 12+

DROP TABLE IF EXISTS sighting_reports CASCADE;
DROP TABLE IF EXISTS adoption_applications CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS animal_encyclopedia CASCADE;
DROP TABLE IF EXISTS missing_pets CASCADE;
DROP TABLE IF EXISTS available_pets CASCADE;
DROP TABLE IF EXISTS shelters CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  alternate_phone VARCHAR(20),
  address TEXT,
  profile_photo VARCHAR(500),
  member_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  show_profile_publicly BOOLEAN DEFAULT false,
  share_location BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shelters (
  shelter_id SERIAL PRIMARY KEY,
  shelter_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  alternate_phone VARCHAR(20),
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  facebook VARCHAR(255),
  instagram VARCHAR(255),
  tiktok VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE available_pets (
  pet_id SERIAL PRIMARY KEY,
  shelter_id INTEGER REFERENCES shelters(shelter_id) ON DELETE CASCADE,
  pet_name VARCHAR(255) NOT NULL,
  pet_type VARCHAR(50) NOT NULL,
  breed VARCHAR(255),
  gender VARCHAR(20),
  age_category VARCHAR(50),
  age_months INTEGER,
  weight VARCHAR(50),
  color_appearance TEXT,
  description TEXT,
  distinctive_features TEXT,
  status VARCHAR(50) DEFAULT 'Available',
  photos TEXT[],
  current_location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  adopted_date TIMESTAMP
);

CREATE TABLE missing_pets (
  missing_pet_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  pet_name VARCHAR(255) NOT NULL,
  pet_type VARCHAR(50) NOT NULL,
  breed VARCHAR(255),
  gender VARCHAR(20),
  age_category VARCHAR(50),
  age_months INTEGER,
  weight VARCHAR(50),
  color_appearance TEXT,
  description TEXT,
  distinctive_features TEXT,
  date_last_seen DATE NOT NULL,
  location_last_seen TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_number VARCHAR(20) NOT NULL,
  alternate_contact VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  reward_offered DECIMAL(10, 2),
  photos TEXT[],
  status VARCHAR(50) DEFAULT 'Missing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE animal_encyclopedia (
  animal_id SERIAL PRIMARY KEY,
  common_name VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255),
  species VARCHAR(255),
  family VARCHAR(255),
  category VARCHAR(100),
  subcategory VARCHAR(100),
  habitat TEXT,
  geographic_range TEXT,
  conservation_status VARCHAR(50),
  diet VARCHAR(100),
  lifespan VARCHAR(100),
  size_weight TEXT,
  description TEXT,
  interesting_facts TEXT,
  photos TEXT[],
  contributed_by INTEGER REFERENCES users(user_id),
  is_verified BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sighting_reports (
  sighting_id SERIAL PRIMARY KEY,
  missing_pet_id INTEGER REFERENCES missing_pets(missing_pet_id) ON DELETE CASCADE,
  reporter_name VARCHAR(255),
  reporter_email VARCHAR(255) NOT NULL,
  reporter_phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  animal_type VARCHAR(50),
  breed VARCHAR(255),
  gender VARCHAR(20),
  age_category VARCHAR(50),
  size VARCHAR(50),
  color_appearance TEXT,
  description TEXT,
  sighting_date DATE NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  photos TEXT[],
  is_unidentified BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE adoption_applications (
  application_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  pet_id INTEGER REFERENCES available_pets(pet_id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  home_address TEXT NOT NULL,
  previous_pet_experience TEXT,
  why_adopt TEXT,
  why_chosen TEXT,
  status VARCHAR(50) DEFAULT 'Under Review',
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(user_id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_favorites (
  favorite_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  animal_id INTEGER REFERENCES animal_encyclopedia(animal_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, animal_id)
);

CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_missing_pets_user ON missing_pets(user_id);
CREATE INDEX idx_missing_pets_status ON missing_pets(status);
CREATE INDEX idx_available_pets_shelter ON available_pets(shelter_id);
CREATE INDEX idx_available_pets_status ON available_pets(status);
CREATE INDEX idx_available_pets_type ON available_pets(pet_type);
CREATE INDEX idx_sighting_reports_missing_pet ON sighting_reports(missing_pet_id);
CREATE INDEX idx_adoption_applications_user ON adoption_applications(user_id);
CREATE INDEX idx_adoption_applications_pet ON adoption_applications(pet_id);
CREATE INDEX idx_animal_encyclopedia_category ON animal_encyclopedia(category);
CREATE INDEX idx_animal_encyclopedia_conservation ON animal_encyclopedia(conservation_status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);

CREATE INDEX idx_animal_encyclopedia_search ON animal_encyclopedia
USING gin(to_tsvector('english', common_name || ' ' || COALESCE(scientific_name, '') || ' ' || COALESCE(description, '')));
CREATE INDEX idx_available_pets_search ON available_pets
USING gin(to_tsvector('english', pet_name || ' ' || breed || ' ' || COALESCE(description, '')));

-- Seed sample shelter
INSERT INTO shelters (shelter_name, email, phone, address, city, state, country, description)
VALUES ('AnimalBase Shelter', 'shelter@animalbase.com', '+1234567890', '123 Main St', 'Sample City', 'Sample State', 'Philippines', 'Official AnimalBase partner shelter');
