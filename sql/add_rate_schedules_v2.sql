-- 1. Create Rate Schedules Table
CREATE TABLE IF NOT EXISTS rate_schedules (
    id SERIAL PRIMARY KEY,
    category_key VARCHAR(50) UNIQUE NOT NULL, -- 'residential', 'commercial-a', etc.
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

-- 2. Add Meter Size to Customers if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='meter_size') THEN
        ALTER TABLE customers ADD COLUMN meter_size VARCHAR(20) DEFAULT '1/2"';
    END IF;
END $$;

-- 3. Populate Default Rates
INSERT INTO rate_schedules (category_key, display_name, factor)
VALUES 
    ('residential', 'Residential', 1.0),
    ('full-commercial', 'Commercial / Industrial', 2.0),
    ('commercial-a', 'Semi Commercial A', 1.75),
    ('commercial-b', 'Semi Commercial B', 1.50),
    ('commercial-c', 'Semi Commercial C', 1.25),
    ('bulk', 'Bulk / Wholesale', 3.0)
ON CONFLICT (category_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    factor = EXCLUDED.factor;

-- 4. Enable RLS and Permissions
ALTER TABLE rate_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON rate_schedules FOR SELECT USING (true);
CREATE POLICY "Allow admin update access" ON rate_schedules FOR UPDATE USING (true); -- Use true for now, narrow if auth is strictly enforced

GRANT ALL ON rate_schedules TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE rate_schedules_id_seq TO anon, authenticated, service_role;
