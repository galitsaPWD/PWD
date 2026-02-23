-- MASTER REALTIME & PERMISSIONS FIX
-- Run this in your Supabase SQL Editor to fix "Live Update" issues.

BEGIN;
  -- 1. Ensure Publication exists
  DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;

  -- 2. Force Add Tables to Realtime
  DO $$ 
  BEGIN
    -- Add billing
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'billing'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE billing;
    END IF;

    -- Add customers
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE customers;
    END IF;
  END $$;

  -- 3. Set Replica Identity
  -- This ensures the full row is sent in the realtime payload
  ALTER TABLE billing REPLICA IDENTITY FULL;
  ALTER TABLE customers REPLICA IDENTITY FULL;

  -- 4. Unified RLS Policies (Allow everyone to see, required for Realtime to broadcast)
  ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "realtime_billing_select" ON billing;
  CREATE POLICY "realtime_billing_select" ON billing FOR SELECT TO public USING (true);

  ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "realtime_customers_select" ON customers;
  CREATE POLICY "realtime_customers_select" ON customers FOR SELECT TO public USING (true);

  -- 5. Grant Permissions to ANON (Reader) and AUTHENTICATED (Cashier)
  GRANT SELECT, INSERT, UPDATE ON billing TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE ON customers TO anon, authenticated;
  
  -- Ensure RTCs can work
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

COMMIT;

-- VERIFICATION QUERY
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
