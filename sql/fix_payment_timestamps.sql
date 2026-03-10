-- Fix payment timestamps that were recorded with wrong system time
-- This adds 8 hours to all payment_date timestamps to convert from the incorrectly recorded time

UPDATE billing
SET payment_date = payment_date + INTERVAL '8 hours'
WHERE payment_date IS NOT NULL
  AND payment_date < NOW() - INTERVAL '7 hours';  -- Only update old records that are clearly wrong

-- Verify the update
SELECT id, billing_period, payment_date, updated_at 
FROM billing 
WHERE payment_date IS NOT NULL
ORDER BY payment_date DESC
LIMIT 10;
