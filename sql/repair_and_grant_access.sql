-- MASTER REPAIR SCRIPT
-- 1. Creates Tables if they don't exist
-- 2. Enables Row Level Security (RLS)
-- 3. Grants Read Access to Cashier (Anon)

-- === 1. TABLE CREATION ===

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_initial VARCHAR(5),
    address TEXT NOT NULL,
    meter_number VARCHAR(50) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    customer_type VARCHAR(20) DEFAULT 'residential' CHECK (customer_type IN ('residential', 'industrial')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    has_discount BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    billing_period VARCHAR(50) DEFAULT '',
    period_start DATE,
    period_end DATE,
    previous_reading DECIMAL(10,2) DEFAULT 0,
    current_reading DECIMAL(10,2) DEFAULT 0,
    consumption DECIMAL(10,2) DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'overdue')),
    balance DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_initial VARCHAR(5),
    role VARCHAR(20) NOT NULL CHECK (role IN ('cashier', 'reader')),
    contact_number VARCHAR(20) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    base_rate DECIMAL(10,2) DEFAULT 150.00,
    tier1_threshold INTEGER DEFAULT 10,
    tier1_rate DECIMAL(10,2) DEFAULT 15.00,
    tier2_threshold INTEGER DEFAULT 20,
    tier2_rate DECIMAL(10,2) DEFAULT 20.00,
    tier3_rate DECIMAL(10,2) DEFAULT 25.00,
    discount_percentage DECIMAL(5,2) DEFAULT 20.00,
    penalty_percentage DECIMAL(5,2) DEFAULT 10.00,
    cutoff_days INTEGER DEFAULT 30,
    admin_pin VARCHAR(255) DEFAULT '1234',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- === 2. ENABLE RLS ===

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- === 3. GRANT ACCESS (The Fix) ===

-- Customers
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT TO anon USING (true);
CREATE POLICY "Enable read access for authenticated" ON customers FOR SELECT TO authenticated USING (true); -- Admin

-- Billing
DROP POLICY IF EXISTS "Enable read access for all users" ON billing;
CREATE POLICY "Enable read access for all users" ON billing FOR SELECT TO anon USING (true);
CREATE POLICY "Enable read access for authenticated" ON billing FOR SELECT TO authenticated USING (true); -- Admin

-- Staff
DROP POLICY IF EXISTS "Enable read access for all users" ON staff;
CREATE POLICY "Enable read access for all users" ON staff FOR SELECT TO anon USING (true);
CREATE POLICY "Enable read access for authenticated" ON staff FOR SELECT TO authenticated USING (true); -- Admin

-- System Settings
DROP POLICY IF EXISTS "Enable read access for all users" ON system_settings;
CREATE POLICY "Enable read access for all users" ON system_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Enable read access for authenticated" ON system_settings FOR SELECT TO authenticated USING (true); -- Admin
