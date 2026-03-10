-- Add sequential bill_no column to billing table
ALTER TABLE billing ADD COLUMN IF NOT EXISTS bill_no INTEGER;

-- Backfill existing rows with their IDs (as a starting point)
UPDATE billing SET bill_no = id WHERE bill_no IS NULL;

-- Create a sequence for bill_no if desired, but we'll use MAX()+1 in the RPC 
-- for better "gapless" behavior in this low-concurrency context as requested.

-- Update the generate_bill RPC to handle bill_no
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
    v_bill_no INTEGER;
    v_billing_period VARCHAR;
BEGIN
    -- Format Billing Period (MM/DD/YYYY)
    v_billing_period := TO_CHAR(p_month_date, 'MM/DD/YYYY');
    
    -- Calculate next bill_no (Continuous)
    SELECT COALESCE(MAX(bill_no), 0) + 1 INTO v_bill_no FROM billing;
    
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
        arrears,
        bill_no
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
        p_arrears,
        v_bill_no
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'bill_id', v_new_id, 'bill_no', v_bill_no);
END;
$$;
