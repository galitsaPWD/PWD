-- ==========================================
-- FIX: RESTORE MISSING "GHOST" STAFF
-- ==========================================
-- This script matches profiles that exist in the system 
-- but are missing from the visible 'staff' table.
-- It inserts them with placeholder data so you can see/edit them.

-- 1. Ensure `auth_uid` column exists (was missing in original schema)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'auth_uid') THEN 
        ALTER TABLE public.staff ADD COLUMN auth_uid UUID REFERENCES auth.users(id); 
    END IF; 
END $$;

INSERT INTO public.staff (
    auth_uid, 
    role, 
    first_name, 
    last_name, 
    username, 
    password, 
    contact_number, 
    status
)
SELECT 
    p.id,
    p.role,
    p.first_name,
    p.last_name,
    -- Generate placeholder username: "user_1234..."
    'user_' || substr(p.id::text, 1, 6),
    -- Placeholder password (since we can't recover the original input)
    'temp123', 
    -- Placeholder contact
    '09000000000',
    'active'
FROM public.profiles p
WHERE p.role IN ('cashier', 'reader') -- Only look for staff roles
AND NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.auth_uid = p.id
);

-- Output the result to confirm
SELECT * FROM staff ORDER BY created_at DESC LIMIT 5;
