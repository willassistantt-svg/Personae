CREATE TABLE users (
    id UUID PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(100),
    birth_date DATE NOT NULL,
    phone VARCHAR(40) NOT NULL,
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    country VARCHAR(80) NOT NULL,
    contact_authorized BOOLEAN NOT NULL,
    travel_locations VARCHAR(2000),
    document_path VARCHAR(300),
    role VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    locale VARCHAR(5) NOT NULL,
    member_code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE access_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token VARCHAR(120) NOT NULL UNIQUE,
    purpose VARCHAR(20) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    email_status VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    age INTEGER NOT NULL,
    city VARCHAR(120) NOT NULL,
    description_pt VARCHAR(4000) NOT NULL,
    description_en VARCHAR(4000) NOT NULL,
    email VARCHAR(180) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(8) NOT NULL,
    ethnicity VARCHAR(40) NOT NULL,
    height_cm INTEGER NOT NULL,
    weight_kg INTEGER NOT NULL,
    hair VARCHAR(80),
    eyes VARCHAR(80),
    languages VARCHAR(180),
    availability VARCHAR(30) NOT NULL,
    tier VARCHAR(20) NOT NULL,
    visible BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE profile_media (
    id UUID PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL,
    storage_path VARCHAR(300) NOT NULL,
    label VARCHAR(80),
    duration_label VARCHAR(20),
    sort_order INTEGER NOT NULL
);

CREATE TABLE site_settings (
    id INTEGER PRIMARY KEY,
    site_phone VARCHAR(40) NOT NULL,
    site_email VARCHAR(180) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(40) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    status VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE favorites (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, profile_id)
);

CREATE TABLE email_logs (
    id UUID PRIMARY KEY,
    recipient VARCHAR(180) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,
    detail VARCHAR(400),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_tokens_user ON access_tokens (user_id);
CREATE INDEX idx_profiles_visible ON profiles (visible);
CREATE INDEX idx_media_profile ON profile_media (profile_id, sort_order);
CREATE INDEX idx_audit_created ON audit_events (created_at DESC);
