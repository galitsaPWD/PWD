-- CONSOLIDATED FIXES FOR REALTIME & DATABASE STRUCTURE
-- 1. Ensure Rate Schedules Table exists with all 6 categories
CREATE TABLE IF NOT EXISTS rate_schedules (
    id SERIAL PRIMARY KEY,
    category_key VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    factor DECIMAL DEFAULT 1.0,
    min_charge_1_2 DECIMAL DEFAULT 260.00,
    min_charge_3_4 DECIMAL DEFAULT 416.00,
    min_charge_1 DECIMAL DEFAULT 832.00,
    min_charge_1_1_2 DECIMAL DEFAULT 2080.00,
    min_charge_2 DECIMAL DEFAULT 5200.00,
    min_charge_3 DECIMAL DEFAULT 9360.00,
    min_charge_4 DECIMAL DEFAULT 18720.00,
    tier1_rate DECIMAL DEFAULT 27.25, -- 11-20
    tier2_rate DECIMAL DEFAULT 28.75, -- 21-30
    tier3_rate DECIMAL DEFAULT 30.75, -- 31-40
    tier4_rate DECIMAL DEFAULT 33.25, -- 41-up
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all 6 categories are populated
INSERT INTO rate_schedules (category_key, display_name, factor)
VALUES 
    ('residential', 'Residential', 1.0),
    ('full-commercial', 'Commercial / Industrial', 2.0),
    ('commercial-a', 'Semi-Commercial A', 1.75),
    ('commercial-b', 'Semi-Commercial B', 1.50),
    ('commercial-c', 'Semi-Commercial C', 1.25),
    ('bulk', 'Bulk / Wholesale', 3.0)
ON CONFLICT (category_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    factor = EXCLUDED.factor;

-- 2. Ensure Realtime Publication for ALL tables
-- Drop and recreate to ensure all tables are included
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 3. Enable RLS and Permissions for everything
-- Rate Schedules
ALTER TABLE rate_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON rate_schedules;
DROP POLICY IF EXISTS "Allow public update" ON rate_schedules;
CREATE POLICY "Allow public read" ON rate_schedules FOR SELECT USING (true);
CREATE POLICY "Allow public update" ON rate_schedules FOR UPDATE USING (true);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON notifications;
DROP POLICY IF EXISTS "Allow public insert" ON notifications;
CREATE POLICY "Allow public read" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON notifications FOR INSERT WITH CHECK (true);

-- Grant permissions to sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON rate_schedules TO anon, authenticated;
