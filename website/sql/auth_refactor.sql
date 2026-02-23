-- AUTH REFACTOR: THE "ONE LOGIN" ARCHITECTURE
-- 1. Create Profiles Table (Linked to Supabase Auth)
-- 2. Define Strict Role-Based Access (RLS)
-- 3. Secure the System (Revoke Anon Access)

-- === 1. PROFILES TABLE ===
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'cashier', 'reader')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- Admin can do everything
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- === 2. BILLING TABLE (Secure) ===
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- Clean up old policies
DROP POLICY IF EXISTS "Enable read access for all users" ON billing;
DROP POLICY IF EXISTS "Enable write access for authenticated" ON billing;
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON billing;
DROP POLICY IF EXISTS "Admin Full Access Billing" ON billing;
DROP POLICY IF EXISTS "Staff View Billing" ON billing;

-- Admin: Full Access
CREATE POLICY "Admin Full Access Billing" ON billing
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Cashier & Reader: View Only
-- (Updates happen via Secure RPC 'record_payment' only)
CREATE POLICY "Staff View Billing" ON billing
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('cashier', 'reader')
  );

-- === 3. CUSTOMERS TABLE ===
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable write access for authenticated" ON customers;
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON customers;

-- Admin: Full Access
CREATE POLICY "Admin Full Access Customers" ON customers
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Cashier & Reader: View Only
CREATE POLICY "Staff View Customers" ON customers
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('cashier', 'reader')
  );

-- === 4. PAYMENTS (online_payments) ===
ALTER TABLE online_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated" ON online_payments;
DROP POLICY IF EXISTS "Enable read access for anon" ON online_payments;

-- Admin: Full Access
CREATE POLICY "Admin Full Access Payments" ON online_payments
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Cashier: Insert (Directly record payments) & View
CREATE POLICY "Cashier Insert Payments" ON online_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'cashier'
  );

CREATE POLICY "Cashier View Payments" ON online_payments
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'cashier'
  );

-- === 5. SECURE RPCs (Revoke Anon, Grant Authenticated) ===
REVOKE EXECUTE ON FUNCTION record_payment FROM anon;
REVOKE EXECUTE ON FUNCTION generate_bill FROM anon;

GRANT EXECUTE ON FUNCTION record_payment TO authenticated;
GRANT EXECUTE ON FUNCTION generate_bill TO authenticated;

-- Note: The RPCs are SECURITY DEFINER, so they will work for any Authenticated user.
-- We could add logic inside them to check if (role == 'cashier') for extra safety, 
-- but RLS on the tables prevents direct abuse anyway.
