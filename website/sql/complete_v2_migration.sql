-- COMPLETE V2 MIGRATION SCRIPT
-- RUN THIS TO FIX ALL ISSUES AND UPGRADE TO SECURE AUTH
-- Does: Tables + Functions + RLS + Permissions in one go.

-- ==========================================
-- 1. TABLE STRUCTURE
-- ==========================================

-- Profiles (Linked to Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'cashier', 'reader')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Online Payments (Missing Table Fix)
CREATE TABLE IF NOT EXISTS online_payments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES billing(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 2. SECURE FUNCTIONS (RPCs)
-- ==========================================

-- Record Payment RPC
CREATE OR REPLACE FUNCTION record_payment(
    p_bill_id INTEGER,
    p_amount DECIMAL,
    p_method VARCHAR,
    p_reference VARCHAR DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_new_status VARCHAR;
    v_bill_customer_id INTEGER;
BEGIN
    SELECT balance, customer_id INTO v_current_balance, v_bill_customer_id
    FROM billing WHERE id = p_bill_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found'; END IF;

    v_new_balance := GREATEST(0, v_current_balance - p_amount);
    v_new_status := CASE WHEN v_new_balance <= 0 THEN 'paid' ELSE 'unpaid' END;

    UPDATE billing
    SET balance = v_new_balance, status = v_new_status, payment_date = NOW(), updated_at = NOW()
    WHERE id = p_bill_id;

    IF p_method != 'cash' THEN
        INSERT INTO online_payments (bill_id, customer_id, amount, platform, reference_number, status)
        VALUES (p_bill_id, v_bill_customer_id, p_amount, p_method, p_reference, 'pending');
    END IF;

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'status', v_new_status);
END;
$$;

-- Generate Bill RPC
CREATE OR REPLACE FUNCTION generate_bill(
    p_customer_id INTEGER,
    p_current_reading DECIMAL,
    p_previous_reading DECIMAL,
    p_month_date DATE,
    p_amount DECIMAL,
    p_consumption DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_id INTEGER;
    v_period_start DATE := p_month_date - INTERVAL '1 month';
    v_due_date DATE := p_month_date + INTERVAL '15 days';
BEGIN
    INSERT INTO billing (
        customer_id, billing_period, reading_date, due_date,
        previous_reading, current_reading, consumption, amount, balance, status
    ) VALUES (
        p_customer_id, TO_CHAR(p_month_date, 'FMMonth YYYY'), p_month_date, v_due_date,
        p_previous_reading, p_current_reading, p_consumption, p_amount, p_amount, 'unpaid'
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'bill_id', v_new_id);
END;
$$;

-- ==========================================
-- 3. RLS POLICIES (Security)
-- ==========================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_payments ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
CREATE POLICY "profiles_self_read" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Customers
DROP POLICY IF EXISTS "customers_admin_all" ON customers;
CREATE POLICY "customers_admin_all" ON customers FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "customers_staff_read" ON customers;
CREATE POLICY "customers_staff_read" ON customers FOR SELECT TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('cashier', 'reader'));

-- Billing
DROP POLICY IF EXISTS "billing_admin_all" ON billing;
CREATE POLICY "billing_admin_all" ON billing FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "billing_staff_read" ON billing;
CREATE POLICY "billing_staff_read" ON billing FOR SELECT TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('cashier', 'reader'));

-- Online Payments
DROP POLICY IF EXISTS "payments_admin_all" ON online_payments;
CREATE POLICY "payments_admin_all" ON online_payments FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "payments_cashier_insert" ON online_payments;
CREATE POLICY "payments_cashier_insert" ON online_payments FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'cashier');
DROP POLICY IF EXISTS "payments_cashier_read" ON online_payments;
CREATE POLICY "payments_cashier_read" ON online_payments FOR SELECT TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'cashier');

-- ==========================================
-- 4. PERMISSIONS
-- ==========================================

-- Revoke Anon (Public) Access
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON customers FROM anon;
REVOKE ALL ON billing FROM anon;
REVOKE ALL ON online_payments FROM anon;
REVOKE EXECUTE ON FUNCTION record_payment FROM anon;
REVOKE EXECUTE ON FUNCTION generate_bill FROM anon;

-- Grant Authenticated Access
GRANT EXECUTE ON FUNCTION record_payment TO authenticated;
GRANT EXECUTE ON FUNCTION generate_bill TO authenticated;
