-- Add policy columns to system_settings
-- Updated to reflect "Overdue 14 days" + "Cutoff Grace 3 days" logic.

-- 1. Add `overdue_days` (Days after Reading Date until bill is overdue)
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS overdue_days INTEGER DEFAULT 14;

-- 2. Add `cutoff_grace_period` (Days AFTER due date before disconnection/cutoff)
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS cutoff_grace_period INTEGER DEFAULT 3;

-- 3. Update existing row with defaults if null
UPDATE system_settings 
SET overdue_days = 14 WHERE overdue_days IS NULL;

UPDATE system_settings 
SET cutoff_grace_period = 3 WHERE cutoff_grace_period IS NULL;

-- 4. Refresh Schema Cache for RPCs
NOTIFY pgrst, 'reload schema';
