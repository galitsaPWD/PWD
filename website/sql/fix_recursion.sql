-- FIX INFINITE RECURSION BUG
-- Reason: The RLS policy on 'profiles' was trying to read 'profiles' to check permission, creating a loop.
-- Solution: Use a "Security Definer" function to read the role safely without triggering RLS.

-- 1. Create a Helper Function (Bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER -- <--- Limitless Power (Internal Use Only)
SET search_path = public -- Secure search path
AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    SELECT role INTO v_role
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role TO anon; -- Allow login check if needed

-- 2. Update Profiles Policy (Break the loop)
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- New Policies using the Helper
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL TO authenticated
    USING (get_my_role() = 'admin');

CREATE POLICY "profiles_self_read" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- 3. Update Other Tables for Performance (Optional but recommended)
-- It's faster to call the function than query the table repeatedly in the policy logic
DROP POLICY IF EXISTS "customers_admin_all" ON customers;
CREATE POLICY "customers_admin_all" ON customers
    FOR ALL TO authenticated
    USING (get_my_role() = 'admin');
    
DROP POLICY IF EXISTS "customers_staff_read" ON customers;
CREATE POLICY "customers_staff_read" ON customers
    FOR SELECT TO authenticated
    USING (get_my_role() IN ('cashier', 'reader'));

DROP POLICY IF EXISTS "billing_admin_all" ON billing;
CREATE POLICY "billing_admin_all" ON billing
    FOR ALL TO authenticated
    USING (get_my_role() = 'admin');
    
DROP POLICY IF EXISTS "billing_staff_read" ON billing;
CREATE POLICY "billing_staff_read" ON billing
    FOR SELECT TO authenticated
    USING (get_my_role() IN ('cashier', 'reader'));

DROP POLICY IF EXISTS "payments_admin_all" ON online_payments;
CREATE POLICY "payments_admin_all" ON online_payments
    FOR ALL TO authenticated
    USING (get_my_role() = 'admin');

-- Cashier specific checks
DROP POLICY IF EXISTS "payments_cashier_insert" ON online_payments;
CREATE POLICY "payments_cashier_insert" ON online_payments
    FOR INSERT TO authenticated
    WITH CHECK (get_my_role() = 'cashier');
    
DROP POLICY IF EXISTS "payments_cashier_read" ON online_payments;
CREATE POLICY "payments_cashier_read" ON online_payments
    FOR SELECT TO authenticated
    USING (get_my_role() = 'cashier');
