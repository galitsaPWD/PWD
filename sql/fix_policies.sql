-- POLICY FIX SCRIPT
-- Run this to clear old policies and apply the correct ones.

-- 1. DROP EVERYTHING FIRST (To fix "Already Exists" error)
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON customers;
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON customers;

DROP POLICY IF EXISTS "Enable read access for all users" ON billing;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON billing;
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON billing;

DROP POLICY IF EXISTS "Enable read access for all users" ON staff;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON staff;
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON staff;

DROP POLICY IF EXISTS "Enable read access for all users" ON system_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON system_settings;
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON system_settings;

-- 2. RE-APPLY POLICIES

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable write access for authenticated" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Billing
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON billing FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable write access for authenticated" ON billing FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON staff FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable write access for authenticated" ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- System Settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON system_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable write access for authenticated" ON system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
