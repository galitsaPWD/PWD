-- UPDATE YOUR ADMIN NAME
-- Change 'System' to your actual name (e.g., 'Boss', 'Admin', 'Jerome')

UPDATE profiles
SET first_name = 'Admin', last_name = 'User' -- <--- Edit this to your liking!
WHERE role = 'admin';
