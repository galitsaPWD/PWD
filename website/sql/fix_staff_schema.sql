-- ==========================================
-- FIX: ADD UNIQUE CONSTRAINT TO AUTH_UID
-- ==========================================
-- The "upsert" (update if exists) function in the backend 
-- REQUIRES a unique constraint on the column to work.
-- Without this, you get a "400 Bad Request" error.

DO $$ 
BEGIN 
    -- 1. Ensure column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'auth_uid') THEN 
        ALTER TABLE public.staff ADD COLUMN auth_uid UUID REFERENCES auth.users(id); 
    END IF;

    -- 2. Add UNIQUE constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'staff_auth_uid_key'
    ) THEN
        ALTER TABLE public.staff ADD CONSTRAINT staff_auth_uid_key UNIQUE (auth_uid);
    END IF;
END $$;

-- 3. Double check for any missing assignments (Ghost Users)
INSERT INTO public.staff (
    auth_uid, role, first_name, last_name, username, password, contact_number, status
)
SELECT 
    p.id, p.role, p.first_name, p.last_name,
    'user_' || substr(p.id::text, 1, 6),
    'temp123',
    '09000000000',
    'active'
FROM public.profiles p
WHERE p.role IN ('cashier', 'reader')
AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_uid = p.id)
ON CONFLICT (auth_uid) DO NOTHING; -- Now this will work safely
