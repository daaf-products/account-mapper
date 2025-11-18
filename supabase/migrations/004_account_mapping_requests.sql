-- =============================================================================
-- ACCOUNT MAPPING REQUESTS - Table and RLS Policies
-- =============================================================================
-- This table stores requests from merchants to access specific bank accounts
-- Business Rules:
-- 1. Merchants request access to bank accounts
-- 2. Management approves or rejects requests
-- 3. Upon approval, the bank account is mapped to the merchant
-- =============================================================================

-- Create ENUM type for request status
CREATE TYPE mapping_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create account_mapping_requests table
CREATE TABLE public.account_mapping_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  status mapping_request_status NOT NULL DEFAULT 'pending'::mapping_request_status,
  request_notes TEXT,
  reviewed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure merchant can only have one active request per account
  CONSTRAINT unique_merchant_account UNIQUE (merchant_id, bank_account_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_mapping_requests_merchant ON public.account_mapping_requests(merchant_id);
CREATE INDEX idx_mapping_requests_account ON public.account_mapping_requests(bank_account_id);
CREATE INDEX idx_mapping_requests_status ON public.account_mapping_requests(status);
CREATE INDEX idx_mapping_requests_updated_at ON public.account_mapping_requests(updated_at DESC);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_mapping_requests_updated_at
  BEFORE UPDATE ON public.account_mapping_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.account_mapping_requests TO postgres, authenticated, service_role;

-- Enable RLS
ALTER TABLE public.account_mapping_requests ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR ACCOUNT MAPPING REQUESTS
-- =============================================================================

-- Policy 1: Management users can read all requests
CREATE POLICY "Management users can read all requests"
  ON public.account_mapping_requests
  FOR SELECT
  USING (public.is_management_user() = true);

-- Policy 2: Merchants can read their own requests
CREATE POLICY "Merchants can read their own requests"
  ON public.account_mapping_requests
  FOR SELECT
  USING (merchant_id = auth.uid());

-- Policy 3: Merchants can create requests (for themselves only)
CREATE POLICY "Merchants can create their own requests"
  ON public.account_mapping_requests
  FOR INSERT
  WITH CHECK (
    merchant_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND type = 'merchant')
  );

-- Policy 4: Management users can update all requests (approve/reject)
CREATE POLICY "Management users can update all requests"
  ON public.account_mapping_requests
  FOR UPDATE
  USING (public.is_management_user() = true)
  WITH CHECK (public.is_management_user() = true);

-- Policy 5: Management users can delete requests
CREATE POLICY "Management users can delete requests"
  ON public.account_mapping_requests
  FOR DELETE
  USING (public.is_management_user() = true);

-- =============================================================================
-- Account mapping requests table setup complete!
-- =============================================================================

