-- Allow Anonymous (Public) Read Access for Cashier Dashboard
-- Required because the "Staff Login" system does not create a Supabase Auth session

-- 1. Customers Table (Read-Only for Anon)
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
CREATE POLICY "Enable read access for all users" ON customers
    FOR SELECT TO anon USING (true);

-- 2. Billing Table (Read-Only for Anon)
DROP POLICY IF EXISTS "Enable read access for all users" ON billing;
CREATE POLICY "Enable read access for all users" ON billing
    FOR SELECT TO anon USING (true);

-- 3. System Settings (Read-Only for Anon)
DROP POLICY IF EXISTS "Enable read access for all users" ON system_settings;
CREATE POLICY "Enable read access for all users" ON system_settings
    FOR SELECT TO anon USING (true);

-- 4. Staff Table (Read-Only for Anon - required for login check)
DROP POLICY IF EXISTS "Enable read access for all users" ON staff;
CREATE POLICY "Enable read access for all users" ON staff
    FOR SELECT TO anon USING (true);

-- Note: Write operations (INSERT/UPDATE/DELETE) still require authentication logic
-- or separate policies if handled via server-side functions / specific anon rules.
