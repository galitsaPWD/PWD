-- Migration: Update Customer Types, Add Meter Size, and Create Rate Schedules
-- Source: Pulupandan Water District Schedule (Photo provided by user)

-- 1. Update Customers Table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS meter_size VARCHAR(10) DEFAULT '1/2"';

-- Update CHECK constraint for customer_type
-- Note: Supabase/Postgres requires dropping and recreating the constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
ALTER TABLE customers ADD CONSTRAINT customers_customer_type_check 
CHECK (customer_type IN ('residential', 'commercial-a', 'commercial-b', 'commercial-c', 'full-commercial', 'bulk'));

-- 2. Create Rate Schedules Table
CREATE TABLE IF NOT EXISTS rate_schedules (
    id SERIAL PRIMARY KEY,
    category_key VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    factor DECIMAL(5,2) DEFAULT 1.0,
    -- Base rates (Factor 1.0) for meter sizes
    min_charge_1_2 DECIMAL(10,2) DEFAULT 260.00,
    min_charge_3_4 DECIMAL(10,2) DEFAULT 416.00,
    min_charge_1 DECIMAL(10,2) DEFAULT 832.00,
    min_charge_1_1_2 DECIMAL(10,2) DEFAULT 2080.00,
    min_charge_2 DECIMAL(10,2) DEFAULT 5200.00,
    min_charge_3 DECIMAL(10,2) DEFAULT 9360.00,
    min_charge_4 DECIMAL(10,2) DEFAULT 18720.00,
    -- Commodity Charges (Base)
    tier1_rate DECIMAL(10,2) DEFAULT 27.25, -- 11-20
    tier2_rate DECIMAL(10,2) DEFAULT 28.75, -- 21-30
    tier3_rate DECIMAL(10,2) DEFAULT 30.75, -- 31-40
    tier4_rate DECIMAL(10,2) DEFAULT 33.25, -- 41-UP
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Seed Rate Schedules
INSERT INTO rate_schedules (category_key, display_name, factor)
VALUES 
('residential', 'Residential/Government', 1.0),
('full-commercial', 'Commercial/Industrial', 2.0),
('commercial-a', 'Semi Commercial A', 1.75),
('commercial-b', 'Semi Commercial B', 1.50),
('commercial-c', 'Semi Commercial C', 1.25),
('bulk', 'Bulk/Wholesale', 3.0)
ON CONFLICT (category_key) DO UPDATE 
SET display_name = EXCLUDED.display_name, factor = EXCLUDED.factor;

-- 4. Update System Settings for Senior Discount
UPDATE system_settings SET discount_percentage = 5.00 WHERE id = (SELECT id FROM system_settings LIMIT 1);
