-- MANUAL USER CREATION HELPER
-- Use this to create new Cashier/Reader accounts until Edge Functions are set up.
-- Replace the placeholder values with actual user details.

-- Step 1: Create the Auth User (Run in Supabase Dashboard > Authentication > Add User)
-- Email: cashier@example.com
-- Password: (set a temporary password)
-- Auto Confirm: YES

-- Step 2: After creating the user, get their UUID from the auth.users table
-- Then run this script, replacing the UUID and details:

INSERT INTO public.profiles (id, role, first_name, last_name)
VALUES (
    'PASTE_USER_UUID_HERE'::uuid,  -- Get this from auth.users after creating the user
    'cashier',                       -- or 'reader'
    'John',                          -- First name
    'Doe'                            -- Last name
);

-- Verification:
SELECT u.email, p.role, p.first_name, p.last_name
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE p.role IN ('cashier', 'reader');
