-- SF Haven Database Schema
-- PostgreSQL with PostGIS extension for geospatial data

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE,
    phone_hash VARCHAR(255),
    pin_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    is_anonymous BOOLEAN DEFAULT false,
    consent_tracking BOOLEAN DEFAULT false,
    CONSTRAINT phone_or_anonymous CHECK (phone_number IS NOT NULL OR is_anonymous = true)
);

CREATE INDEX idx_users_phone ON users(phone_hash);
CREATE INDEX idx_users_created ON users(created_at);

-- Services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT,
    address VARCHAR(500),
    location GEOGRAPHY(POINT, 4326),
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    hours JSONB,
    requirements JSONB,
    capacity INTEGER,
    current_availability INTEGER,
    amenities JSONB DEFAULT '[]',
    languages VARCHAR[] DEFAULT ARRAY['English'],
    accessibility_features JSONB DEFAULT '{}',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_location ON services USING GIST(location);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active) WHERE is_active = true;

-- Parking zones table
CREATE TABLE parking_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_type VARCHAR(50) NOT NULL,
    geometry GEOGRAPHY(POLYGON, 4326) NOT NULL,
    restrictions JSONB DEFAULT '{}',
    street_cleaning JSONB DEFAULT '{}',
    time_limits JSONB DEFAULT '{}',
    effective_date DATE,
    expiry_date DATE,
    source VARCHAR(50) DEFAULT 'sfmta',
    verified_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parking_geometry ON parking_zones USING GIST(geometry);
CREATE INDEX idx_parking_type ON parking_zones(zone_type);
CREATE INDEX idx_parking_dates ON parking_zones(effective_date, expiry_date);

-- Parking alerts table
CREATE TABLE parking_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parking_alerts_location ON parking_alerts USING GIST(location);
CREATE INDEX idx_parking_alerts_expires ON parking_alerts(expires_at);

-- User activities table (for analytics, anonymized)
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    location GEOGRAPHY(POINT, 4326),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_user ON user_activities(user_id);
CREATE INDEX idx_activities_time ON user_activities(created_at);
CREATE INDEX idx_activities_type ON user_activities(activity_type);

-- Saved services (user bookmarks)
CREATE TABLE saved_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, service_id)
);

CREATE INDEX idx_saved_services_user ON saved_services(user_id);

-- Service reviews
CREATE TABLE service_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_service ON service_reviews(service_id);
CREATE INDEX idx_reviews_rating ON service_reviews(rating);

-- Emergency resources
CREATE TABLE emergency_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    location GEOGRAPHY(POINT, 4326),
    address VARCHAR(500),
    available_24_7 BOOLEAN DEFAULT false,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emergency_location ON emergency_resources USING GIST(location);
CREATE INDEX idx_emergency_type ON emergency_resources(type);

-- Housing applications tracking
CREATE TABLE housing_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    waitlist_position INTEGER,
    case_manager_id VARCHAR(100),
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_housing_user ON housing_applications(user_id);
CREATE INDEX idx_housing_status ON housing_applications(status);

-- System announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    priority VARCHAR(20) DEFAULT 'normal',
    target_users JSONB DEFAULT '{}',
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_active ON announcements(is_active, start_date, end_date);

-- Functions for geospatial queries
CREATE OR REPLACE FUNCTION nearby_services(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 5000,
    service_category VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    category VARCHAR,
    distance_meters DOUBLE PRECISION,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    phone VARCHAR,
    hours JSONB,
    current_availability INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.category,
        ST_Distance(
            s.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) as distance_meters,
        ST_Y(s.location::geometry) as location_lat,
        ST_X(s.location::geometry) as location_lng,
        s.phone,
        s.hours,
        s.current_availability
    FROM services s
    WHERE s.is_active = true
        AND (service_category IS NULL OR s.category = service_category)
        AND ST_DWithin(
            s.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            radius_meters
        )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Function to check if location is in legal parking zone
CREATE OR REPLACE FUNCTION check_parking_legality(
    check_lat DOUBLE PRECISION,
    check_lng DOUBLE PRECISION,
    check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
RETURNS TABLE (
    is_legal BOOLEAN,
    zone_type VARCHAR,
    restrictions JSONB,
    time_limit INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN pz.zone_type = 'legal' THEN true
            ELSE false
        END as is_legal,
        pz.zone_type,
        pz.restrictions,
        (pz.time_limits->>'minutes')::INTEGER as time_limit
    FROM parking_zones pz
    WHERE ST_Contains(
        pz.geometry::geometry,
        ST_SetSRID(ST_MakePoint(check_lng, check_lat), 4326)::geometry
    )
    AND (pz.effective_date IS NULL OR pz.effective_date <= check_time::DATE)
    AND (pz.expiry_date IS NULL OR pz.expiry_date >= check_time::DATE)
    ORDER BY
        CASE pz.zone_type
            WHEN 'restricted' THEN 1
            WHEN 'time_limited' THEN 2
            WHEN 'legal' THEN 3
            ELSE 4
        END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parking_zones_updated_at BEFORE UPDATE ON parking_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_reviews_updated_at BEFORE UPDATE ON service_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
