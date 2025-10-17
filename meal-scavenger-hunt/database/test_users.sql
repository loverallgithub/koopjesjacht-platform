-- Test Users for Meal Scavenger Hunt Platform
-- Password for all test users: "TestPassword123!"
-- Hashed with bcrypt (rounds=10)

-- Test Admin User
INSERT INTO users (id, email, username, password_hash, role, first_name, last_name, phone, email_verified, language, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@koopjesjacht.test',
    'admin_test',
    '$2b$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
    'admin',
    'Admin',
    'User',
    '+31612345601',
    TRUE,
    'en',
    NOW()
);

-- Test Organizer User
INSERT INTO users (id, email, username, password_hash, role, first_name, last_name, phone, email_verified, language, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'organizer@koopjesjacht.test',
    'organizer_test',
    '$2b$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
    'organizer',
    'John',
    'Organizer',
    '+31612345602',
    TRUE,
    'en',
    NOW()
);

-- Test Shop Owner User
INSERT INTO users (id, email, username, password_hash, role, first_name, last_name, phone, email_verified, language, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'shopowner@koopjesjacht.test',
    'shopowner_test',
    '$2b$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
    'shop_owner',
    'Maria',
    'Owner',
    '+31612345603',
    TRUE,
    'en',
    NOW()
);

-- Test Shop Employee User
INSERT INTO users (id, email, username, password_hash, role, first_name, last_name, phone, email_verified, language, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'employee@koopjesjacht.test',
    'employee_test',
    '$2b$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
    'shop_employee',
    'Peter',
    'Employee',
    '+31612345604',
    TRUE,
    'en',
    NOW()
);

-- Test Hunter User 1
INSERT INTO users (id, email, username, password_hash, role, first_name, last_name, phone, email_verified, language, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000005',
    'hunter1@koopjesjacht.test',
    'hunter1_test',
    '$2b$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
    'hunter',
    'Sarah',
    'Hunter',
    '+31612345605',
    TRUE,
    'en',
    NOW()
);

-- Test Hunter User 2
INSERT INTO users (id, email, username, password_hash, role, first_name, last_name, phone, email_verified, language, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'hunter2@koopjesjacht.test',
    'hunter2_test',
    '$2b$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
    'hunter',
    'Mike',
    'Hunter',
    '+31612345606',
    TRUE,
    'en',
    NOW()
);

-- Test Hunter User 3
INSERT INTO users (id, email, username, password_hash, role, first_name, last_name, phone, email_verified, language, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000007',
    'hunter3@koopjesjacht.test',
    'hunter3_test',
    '$2b$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
    'hunter',
    'Emma',
    'Hunter',
    '+31612345607',
    TRUE,
    'en',
    NOW()
);

-- Test Hunter User 4
INSERT INTO users (id, email, username, password_hash, role, first_name, last_name, phone, email_verified, language, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000008',
    'hunter4@koopjesjacht.test',
    'hunter4_test',
    '$2b$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
    'hunter',
    'David',
    'Hunter',
    '+31612345608',
    TRUE,
    'en',
    NOW()
);

-- Test Shop for Shop Owner
INSERT INTO shops (id, owner_id, name, description, address, city, postal_code, country, latitude, longitude, phone, email, verified, is_active, created_at)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'De Lekkerste Pizzeria',
    'Authentic Italian pizza with the freshest ingredients',
    'Hoofdstraat 123',
    'Amsterdam',
    '1011 AB',
    'NL',
    52.3676,
    4.9041,
    '+31201234567',
    'info@pizzeria.test',
    TRUE,
    TRUE,
    NOW()
);

-- Test Shop 2
INSERT INTO shops (id, owner_id, name, description, address, city, postal_code, country, latitude, longitude, phone, email, verified, is_active, created_at)
VALUES (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    'Gezellig Café',
    'Cozy café with amazing coffee and pastries',
    'Damstraat 45',
    'Amsterdam',
    '1012 JK',
    'NL',
    52.3728,
    4.8936,
    '+31201234568',
    'info@cafe.test',
    TRUE,
    TRUE,
    NOW()
);

-- Test Shop 3
INSERT INTO shops (id, owner_id, name, description, address, city, postal_code, country, latitude, longitude, phone, email, verified, is_active, created_at)
VALUES (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'Griekse Taverna',
    'Traditional Greek cuisine in the heart of Amsterdam',
    'Nieuwendijk 78',
    'Amsterdam',
    '1012 MR',
    'NL',
    52.3752,
    4.8952,
    '+31201234569',
    'info@taverna.test',
    TRUE,
    TRUE,
    NOW()
);

-- Link Employee to Shop
INSERT INTO shop_employees (shop_id, user_id, role, is_active, created_at)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    'staff',
    TRUE,
    NOW()
);

-- Test Hunt (active)
INSERT INTO hunts (id, organizer_id, title, description, start_time, end_time, meeting_location, max_teams, max_team_size, min_team_size, entry_fee, difficulty_level, status, is_public, created_at)
VALUES (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Amsterdam Food Adventure',
    'Discover the best food spots in Amsterdam through an exciting scavenger hunt!',
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '6 hours',
    'Dam Square, Amsterdam',
    10,
    4,
    2,
    25.00,
    3,
    'active',
    TRUE,
    NOW()
);

-- Link shops to hunt
INSERT INTO hunt_shops (id, hunt_id, shop_id, sequence_order, meal_component, points_value, clue_text, is_required, created_at)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    1,
    'Starter',
    100,
    'Look for the place where Italian dreams come true, and wood-fired magic happens!',
    TRUE,
    NOW()
);

INSERT INTO hunt_shops (id, hunt_id, shop_id, sequence_order, meal_component, points_value, clue_text, is_required, created_at)
VALUES (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    2,
    'Main Course',
    150,
    'Find the cozy spot where locals gather for their daily dose of comfort!',
    TRUE,
    NOW()
);

INSERT INTO hunt_shops (id, hunt_id, shop_id, sequence_order, meal_component, points_value, clue_text, is_required, created_at)
VALUES (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    3,
    'Dessert',
    100,
    'Journey to the Mediterranean where ancient flavors meet modern taste!',
    TRUE,
    NOW()
);

-- Create a test team
INSERT INTO teams (id, hunt_id, name, captain_id, invite_code, max_members, current_members, status, created_at)
VALUES (
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Food Explorers',
    '00000000-0000-0000-0000-000000000005',
    'FOOD2024',
    4,
    2,
    'in_progress',
    NOW()
);

-- Add team members
INSERT INTO team_members (team_id, user_id, role, is_active, joined_at)
VALUES (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000005',
    'captain',
    TRUE,
    NOW()
);

INSERT INTO team_members (team_id, user_id, role, is_active, joined_at)
VALUES (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000006',
    'member',
    TRUE,
    NOW()
);

-- Grant hunt ownership for testing
-- This allows the organizer to manage the hunt
COMMENT ON TABLE hunts IS 'Hunt created by organizer_test for testing';
