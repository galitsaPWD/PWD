-- STEP 1: Ensure Tables are in Realtime Publication
-- This allows Supabase to broadcast changes to these tables.
DO $$
BEGIN
    -- Add billing to realtime if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'billing'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE billing;
    END IF;

    -- Add customers to realtime if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE customers;
    END IF;

    -- Add notifications to realtime if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- STEP 2: Ensure Notifications RLS is correct
-- Readers need to INSERT, Admins need to SELECT and UPDATE (mark as read)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated inserts" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated reads" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated updates" ON notifications;

CREATE POLICY "Allow authenticated inserts" ON notifications
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated reads" ON notifications
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated updates" ON notifications
    FOR UPDATE TO authenticated USING (true);

-- STEP 3: Grant access to sequences (if needed for some environments)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
