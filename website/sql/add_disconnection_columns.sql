-- Migration to add disconnection tracking columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS disconnection_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disconnection_bill_id INTEGER;

-- Update RLS if necessary (assuming current policies allow access)
-- The columns will be accessible under existing SELECT policies.
