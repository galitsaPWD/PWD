-- Run this in your Supabase SQL Editor
-- Creates the notifications table for reader-to-admin cutoff alerts

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type        TEXT NOT NULL DEFAULT 'cutoff_done',
    message     TEXT NOT NULL,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast unread lookups
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Allow authenticated reads + inserts (readers insert, admins read)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Allow authenticated inserts" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated reads" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated updates" ON notifications;

CREATE POLICY "Allow authenticated inserts" ON notifications
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated reads" ON notifications
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated updates" ON notifications
    FOR UPDATE TO authenticated USING (true);
