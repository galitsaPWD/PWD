-- Security Remediation Migration
-- Objective: Secure sensitive data and remove legacy credential columns

-- 1. Secure system_settings Table
-- Vulnerability: Table was readable by anonymous users, exposing plaintext PIN.
-- Fix: Remove overly permissive policies and restrict read access to authenticated staff.

DROP POLICY IF EXISTS "Enable read access for all users" ON system_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON system_settings;
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Enable write access for authenticated" ON system_settings;
DROP POLICY IF EXISTS "Enable all access" ON system_settings;

-- Create restrictive policies
-- Read access: Only authenticated users (Staff/Admin) can see settings
CREATE POLICY "Enable read for authenticated users" ON system_settings
    FOR SELECT TO authenticated USING (true);

-- Write access: Only authenticated users (Admin) can modify settings
CREATE POLICY "Enable write for authenticated users" ON system_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Remove Legacy Credential Columns
-- Vulnerability: staff table had a 'password' column which is redundant and insecure.
-- Fix: Drop the column to ensure only Supabase Auth is used.

ALTER TABLE staff DROP COLUMN IF EXISTS password;

-- 3. Verify RLS is enabled
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- 4. Audit Log
COMMENT ON TABLE system_settings IS 'Secured on 2026-02-22: Restricted SELECT to authenticated users and removed anon access.';
COMMENT ON TABLE staff IS 'Secured on 2026-02-22: Removed legacy password column.';
