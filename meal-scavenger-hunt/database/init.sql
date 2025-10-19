-- Meal Scavenger Hunt Platform Database Schema
-- PostgreSQL 15+ compatible

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
CREATE TYPE user_role AS ENUM ('hunter', 'organizer', 'shop_owner', 'shop_employee', 'admin');
CREATE TYPE hunt_status AS ENUM ('draft', 'scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE team_status AS ENUM ('forming', 'ready', 'in_progress', 'completed');
CREATE TYPE scan_status AS ENUM ('pending', 'scanned', 'verified', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('ideal', 'paypal', 'stripe', 'sofort', 'bancontact', 'credit_card');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'hunter',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    language VARCHAR(5) DEFAULT 'en',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Shops/Venues table
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'NL',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location GEOGRAPHY(POINT, 4326),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(500),
    logo_url TEXT,
    cover_image_url TEXT,
    business_hours JSONB,
    fun_facts JSONB,
    menu_items JSONB,
    capacity INTEGER DEFAULT 50,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shop employees table
CREATE TABLE shop_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'staff',
    permissions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, user_id)
);

-- Hunts table
CREATE TABLE hunts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    meeting_location VARCHAR(500),
    meeting_latitude DECIMAL(10, 8),
    meeting_longitude DECIMAL(11, 8),
    special_guest_name VARCHAR(255),
    special_guest_info TEXT,
    max_teams INTEGER DEFAULT 10,
    max_team_size INTEGER DEFAULT 4,
    min_team_size INTEGER DEFAULT 2,
    entry_fee DECIMAL(10, 2) DEFAULT 0,
    total_prize_pool DECIMAL(10, 2) DEFAULT 0,
    status hunt_status DEFAULT 'draft',
    rules TEXT,
    theme VARCHAR(100),
    difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
    estimated_duration INTEGER, -- in minutes
    cover_image_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hunt shops (venues participating in a hunt)
CREATE TABLE hunt_shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID REFERENCES hunts(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    meal_component VARCHAR(255) NOT NULL,
    points_value INTEGER DEFAULT 100,
    hint_penalty INTEGER DEFAULT 20,
    clue_text TEXT,
    hint_text TEXT,
    fun_fact TEXT,
    special_instructions TEXT,
    max_redemptions INTEGER,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hunt_id, shop_id),
    UNIQUE(hunt_id, sequence_order)
);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID REFERENCES hunts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    captain_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invite_code VARCHAR(20) UNIQUE,
    max_members INTEGER DEFAULT 4,
    current_members INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    status team_status DEFAULT 'forming',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    completion_rank INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hunt_id, name)
);

-- Team members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    points_earned INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(team_id, user_id)
);

-- QR codes table
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(255) UNIQUE NOT NULL,
    hunt_id UUID REFERENCES hunts(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    qr_image_url TEXT,
    expires_at TIMESTAMP,
    max_scans INTEGER DEFAULT 1,
    current_scans INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hunt_id, shop_id, team_id)
);

-- Scans table
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    hunt_id UUID REFERENCES hunts(id) ON DELETE CASCADE,
    points_awarded INTEGER,
    hint_used BOOLEAN DEFAULT FALSE,
    scan_location GEOGRAPHY(POINT, 4326),
    device_info JSONB,
    status scan_status DEFAULT 'pending',
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clues and progress tracking
CREATE TABLE hunt_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    hunt_shop_id UUID REFERENCES hunt_shops(id) ON DELETE CASCADE,
    clue_unlocked_at TIMESTAMP,
    hint_used BOOLEAN DEFAULT FALSE,
    hint_used_at TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    points_earned INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, hunt_shop_id)
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    hunt_id UUID REFERENCES hunts(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method payment_method NOT NULL,
    payment_provider VARCHAR(50),
    provider_payment_id VARCHAR(255),
    status payment_status DEFAULT 'pending',
    description TEXT,
    metadata JSONB,
    processed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    refunded_at TIMESTAMP,
    refund_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Statistics table
CREATE TABLE statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'shop', 'hunt', 'team'
    entity_id UUID NOT NULL,
    stat_date DATE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, entity_id, stat_date)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_via VARCHAR(50), -- 'email', 'push', 'in_app'
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table (for security and compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_id UUID,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    result VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.hunt_id,
    t.total_points,
    t.completion_rank,
    COUNT(DISTINCT tm.user_id) as team_size,
    COUNT(DISTINCT hp.hunt_shop_id) FILTER (WHERE hp.completed = true) as components_collected,
    MAX(hp.completed_at) as last_activity
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = true
LEFT JOIN hunt_progress hp ON t.id = hp.team_id
WHERE t.status != 'forming'
GROUP BY t.id, t.name, t.hunt_id, t.total_points, t.completion_rank
ORDER BY t.total_points DESC;

-- Shop analytics view
CREATE OR REPLACE VIEW shop_analytics AS
SELECT 
    s.id as shop_id,
    s.name as shop_name,
    COUNT(DISTINCT hs.hunt_id) as total_hunts,
    COUNT(DISTINCT sc.team_id) as unique_teams,
    COUNT(sc.id) as total_scans,
    AVG(s.rating) as average_rating,
    SUM(p.amount) FILTER (WHERE p.status = 'completed') as revenue_generated
FROM shops s
LEFT JOIN hunt_shops hs ON s.id = hs.shop_id
LEFT JOIN scans sc ON s.id = sc.shop_id
LEFT JOIN payments p ON s.id = p.shop_id
GROUP BY s.id, s.name;

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_shops_location ON shops USING GIST(location);
CREATE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_hunts_status ON hunts(status);
CREATE INDEX idx_hunts_organizer ON hunts(organizer_id);
CREATE INDEX idx_hunts_dates ON hunts(start_time, end_time);
CREATE INDEX idx_teams_hunt ON teams(hunt_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_qr_codes_code ON qr_codes(code);
CREATE INDEX idx_scans_qr ON scans(qr_code_id);
CREATE INDEX idx_scans_team ON scans(team_id);
CREATE INDEX idx_hunt_progress_team ON hunt_progress(team_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_statistics_lookup ON statistics(entity_type, entity_id, stat_date);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_target_id ON audit_logs(target_id);
CREATE INDEX idx_audit_result ON audit_logs(result);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hunts_updated_at BEFORE UPDATE ON hunts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hunt_progress_updated_at BEFORE UPDATE ON hunt_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();