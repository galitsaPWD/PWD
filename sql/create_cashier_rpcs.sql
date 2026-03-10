-- SECURE CASHIER FUNCTIONS
-- These functions allow the "Anon" cashier to Write data safely.

-- 1. RECORD PAYMENT RPC
-- Replaces direct billing update
CREATE OR REPLACE FUNCTION record_payment(
    p_bill_id INTEGER,
    p_amount DECIMAL,
    p_method VARCHAR,
    p_reference VARCHAR DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as Admin
AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_new_status VARCHAR;
    v_bill_customer_id INTEGER;
    v_total_remaining_balance DECIMAL;
    v_result JSONB;
BEGIN
    -- Get current bill details
    SELECT balance, customer_id INTO v_current_balance, v_bill_customer_id
    FROM billing
    WHERE id = p_bill_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill not found';
    END IF;

    -- Calculate new balance
    v_new_balance := GREATEST(0, v_current_balance - p_amount);
    
    -- Determine Status
    IF v_new_balance <= 0 THEN
        v_new_status := 'paid';
    ELSE
        v_new_status := 'unpaid';
    END IF;

    -- Update Billing
    UPDATE billing
    SET 
        balance = v_new_balance,
        status = v_new_status,
        payment_date = NOW(),
        updated_at = NOW()
    WHERE id = p_bill_id;

    -- Calculate TOTAL remaining balance for this customer across ALL bills
    SELECT COALESCE(SUM(balance), 0) INTO v_total_remaining_balance
    FROM billing
    WHERE customer_id = v_bill_customer_id;

    -- NEW: Reactivation Notification Logic
    -- If total balance is 0 and customer is currently "inactive" (cutoff), notify admin
    DECLARE
        v_cust_status VARCHAR;
        v_cust_name VARCHAR;
    BEGIN
        SELECT status, first_name || ' ' || last_name INTO v_cust_status, v_cust_name
        FROM customers WHERE id = v_bill_customer_id;

        IF v_cust_status = 'inactive' AND v_total_remaining_balance <= 0 THEN
            INSERT INTO notifications (type, message, customer_id)
            VALUES (
                'activation_ready',
                v_cust_name || ' has paid all bills and is ready for activation.',
                v_bill_customer_id
            );
        END IF;
    END;

    -- Record Online Payment (if applicable)
    IF p_method != 'cash' THEN
        INSERT INTO online_payments (
            bill_id, customer_id, amount, platform, reference_number, status
        ) VALUES (
            p_bill_id, v_bill_customer_id, p_amount, p_method, p_reference, 'pending'
        );
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'total_balance', v_total_remaining_balance,
        'customer_id', v_bill_customer_id,
        'status', v_new_status
    );

    RETURN v_result;
END;
$$;

-- 2. GENERATE BILL RPC
-- Replaces direct billing insert
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
    v_period_start DATE;
    v_period_end DATE;
    v_new_id INTEGER;
    v_billing_period VARCHAR;
BEGIN
    -- Calculate dates
    v_period_end := p_month_date;
    v_period_start := p_month_date - INTERVAL '1 month';
    
    -- Format Billing Period
    v_billing_period := TO_CHAR(p_month_date, 'MM/YYYY');
    
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
        p_amount, -- Initial balance = total amount
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

-- 3. REACTIVATE CUSTOMER RPC
CREATE OR REPLACE FUNCTION reactivate_customer(
    p_customer_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE customers
    SET 
        status = 'active',
        updated_at = NOW()
    WHERE id = p_customer_id;

    -- Note: This will trigger the Reader App to reset if they have Realtime enabled on customers table
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. ENABLE REALTIME
-- This is CRITICAL for the "live" updates to work on the Cashier/Admin side.
-- (Already added in previous version, keeping for completeness if rerunning)
-- ALTER PUBLICATION supabase_realtime ADD TABLE billing;
-- ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- 5. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION record_payment TO anon;
GRANT EXECUTE ON FUNCTION generate_bill TO anon;
GRANT EXECUTE ON FUNCTION reactivate_customer TO anon;

-- Grant access to online_payments table
GRANT INSERT ON online_payments TO anon; 
