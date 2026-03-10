-- FIX MISSING TABLE
-- Creates the 'online_payments' table required for the Cashier Payment system.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS online_payments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES billing(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'gcash', 'bank', etc.
    reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE online_payments ENABLE ROW LEVEL SECURITY;

-- 3. Grant Permissions
-- Allow Anon (Cashier) to Insert via RPC (Security Definer handles it, but explicit grant is good practice)
-- Allow Admin to Read/Write all
DROP POLICY IF EXISTS "Enable all access for authenticated" ON online_payments;
CREATE POLICY "Enable all access for authenticated" ON online_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow Anon to SELECT (if needed for status checks)
DROP POLICY IF EXISTS "Enable read access for anon" ON online_payments;
CREATE POLICY "Enable read access for anon" ON online_payments FOR SELECT TO anon USING (true);
