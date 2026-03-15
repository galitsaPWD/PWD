-- Create Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    staff_name TEXT,
    role TEXT,
    action_type TEXT NOT NULL, -- CREATE, UPDATE, DELETE, PAYMENT, LOGIN, etc.
    entity_type TEXT NOT NULL, -- customer, billing, staff, system_settings, etc.
    entity_id TEXT,           -- ID of the affected record
    details TEXT,             -- Human-readable description
    metadata JSONB            -- Optional: { "before": {...}, "after": {...} }
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow Admins to read all logs
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow system to insert logs (using service role or if triggered from frontend, we might need a more open policy for INSERT)
-- For now, let's allow authenticated staff to insert their own logs
CREATE POLICY "Authenticated staff can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
