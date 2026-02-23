-- RESTORE ADMIN ACCESS
-- Run this to create a profile for your existing Admin user.

-- REPLACE 'admin@gmail.com' WITH YOUR ACTUAL EMAIL
INSERT INTO public.profiles (id, role, first_name, last_name)
SELECT id, 'admin', 'System', 'Administrator'
FROM auth.users
WHERE email = 'admin@gmail.com' -- <--- CHANGE THIS IF NEEDED
ON CONFLICT (id) DO UPDATE 
SET role = 'admin';

-- Verification:
SELECT * FROM profiles WHERE role = 'admin';
