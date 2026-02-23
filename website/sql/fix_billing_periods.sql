-- Standardize all inconsistent billing periods to "Month Year" format
UPDATE billing
SET billing_period = 
    CASE 
        -- Handle MM/YYYY (legacy from RPC)
        WHEN billing_period ~ '^\d{2}/\d{4}$' THEN
            TO_CHAR(TO_DATE(billing_period, 'MM/YYYY'), 'FMMonth YYYY')
        -- Handle ISO YYYY-MM
        WHEN billing_period ~ '^\d{4}-\d{2}$' THEN
            TO_CHAR(TO_DATE(billing_period, 'YYYY-MM'), 'FMMonth YYYY')
        -- Handle full date strings
        WHEN billing_period ~ '^\d{2}/\d{2}/\d{4}$' THEN
            TO_CHAR(TO_DATE(billing_period, 'MM/DD/YYYY'), 'FMMonth YYYY')
        ELSE billing_period 
    END;

-- Verify results
SELECT DISTINCT billing_period FROM billing ORDER BY billing_period DESC;
