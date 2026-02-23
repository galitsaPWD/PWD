-- CLEANUP SCRIPT: Fix generate_bill ambiguity
-- This script drops all versions of generate_bill to ensure a clean state

-- 1. Drop old version (6 parameters)
DROP FUNCTION IF EXISTS generate_bill(integer, numeric, numeric, date, numeric, numeric);

-- 2. Drop new version (7 parameters) if we want to restart
DROP FUNCTION IF EXISTS generate_bill(integer, numeric, numeric, date, numeric, numeric, date);

-- 3. Also drop anything without parameter list if PostgreSQL allows (usually requires list)
-- If we just want to be sure, we list all known previous signatures
DROP FUNCTION IF EXISTS generate_bill(int4, numeric, numeric, date, numeric, numeric);

-- Now the main script can run without "not unique" errors.
