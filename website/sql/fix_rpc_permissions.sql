-- CLEAN RE-CREATE: Fix generate_bill RPC and permissions
-- This script drops any ambiguous overloads and ensures a clean 12-param function exists.

-- 1. Drop the function with ANY signature to avoid "function does not exist" errors
DROP FUNCTION IF EXISTS generate_bill;

-- 2. Define the exact function with 12 parameters
CREATE OR REPLACE FUNCTION generate_bill(
    p_customer_id INTEGER,
    p_current_reading DECIMAL,
    p_previous_reading DECIMAL,
    p_month_date DATE,
    p_amount DECIMAL,
    p_consumption DECIMAL,
    p_due_date DATE,
    p_base_charge DECIMAL DEFAULT 0,
    p_consumption_charge DECIMAL DEFAULT 0,
    p_penalty DECIMAL DEFAULT 0,
    p_tax DECIMAL DEFAULT 0,
    p_arrears DECIMAL DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_id INTEGER;
    v_billing_period VARCHAR;
BEGIN
    -- Format Billing Period (MM/DD/YYYY)
    v_billing_period := TO_CHAR(p_month_date, 'MM/DD/YYYY');
    
    -- Insert Bill
    INSERT INTO billing (
        customer_id,
        billing_period,
        reading_date,
        due_date,
        previous_reading,
        current_reading,
        consumption,
        amount,
        balance,
        status,
        base_charge,
        consumption_charge,
        penalty,
        tax,
        arrears
    ) VALUES (
        p_customer_id,
        v_billing_period,
        p_month_date,
        p_due_date,
        p_previous_reading,
        p_current_reading,
        p_consumption,
        p_amount,
        p_amount, -- Initial balance
        'unpaid',
        p_base_charge,
        p_consumption_charge,
        p_penalty,
        p_tax,
        p_arrears
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'bill_id', v_new_id);
END;
$$;

-- 3. Grant permissions using ALL FUNCTIONS to avoid signature matching issues
GRANT EXECUTE ON FUNCTION generate_bill TO anon;

-- 4. Refresh Cache
NOTIFY pgrst, 'reload schema';
