-- Migration: Add overdue_days column to system_settings
-- Date: 2026-02-12
-- Description: Adds overdue_days field to track the number of days after reading before a bill becomes overdue

-- Add overdue_days column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_settings' 
        AND column_name = 'overdue_days'
    ) THEN
        ALTER TABLE system_settings 
        ADD COLUMN overdue_days INTEGER DEFAULT 14;
        
        RAISE NOTICE 'Added overdue_days column to system_settings';
    ELSE
        RAISE NOTICE 'overdue_days column already exists';
    END IF;
END $$;

-- Update cutoff_days default to 17 (day of month)
UPDATE system_settings 
SET cutoff_days = 17 
WHERE cutoff_days = 30;

-- Verify the changes
SELECT id, overdue_days, cutoff_days, updated_at 
FROM system_settings 
LIMIT 1;
