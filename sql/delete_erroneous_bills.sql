-- DELETE ERRONEOUS BILLS
-- These bills were created incorrectly (marked as PAID or zeroed) during debugging
-- Using ID here as a safe fallback since columns might still be migrating
DELETE FROM billing WHERE id IN (89, 7);

-- Also delete any other bills for today that might have been created with 0 amount accidentally
DELETE FROM billing 
WHERE amount = 0 
AND status = 'paid' 
AND reading_date >= CURRENT_DATE;

-- Verify after deletion (using ID)
SELECT id, customer_id, billing_period, amount, balance, status 
FROM billing 
WHERE id IN (89, 7);
