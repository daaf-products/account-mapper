-- =============================================================================
-- CREATE BANK ACCOUNTS TABLE
-- =============================================================================
-- Table to store bank account information with mapping details
-- =============================================================================

-- Create ENUM types for bank account status and added_by
CREATE TYPE bank_account_status AS ENUM ('mapped', 'unmapped', 'parked');
CREATE TYPE added_by_type AS ENUM ('merchant', 'holder');

-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  status bank_account_status NOT NULL DEFAULT 'unmapped'::bank_account_status,
  added_by_type added_by_type NOT NULL,
  added_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mapped_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_account_number UNIQUE (account_number, bank_name)
);

-- Create indexes for better query performance
CREATE INDEX idx_bank_accounts_added_by ON public.bank_accounts(added_by_user_id);
CREATE INDEX idx_bank_accounts_mapped_to ON public.bank_accounts(mapped_to_user_id);
CREATE INDEX idx_bank_accounts_status ON public.bank_accounts(status);
CREATE INDEX idx_bank_accounts_added_by_type ON public.bank_accounts(added_by_type);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.bank_accounts TO postgres, authenticated, service_role;

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR BANK ACCOUNTS
-- =============================================================================

-- Policy 1: Management users can read all bank accounts
CREATE POLICY "Management users can read all bank accounts"
  ON public.bank_accounts
  FOR SELECT
  USING (public.is_management_user() = true);

-- Policy 2: Holders can read their own added bank accounts
CREATE POLICY "Holders can read their own accounts"
  ON public.bank_accounts
  FOR SELECT
  USING (
    added_by_user_id = auth.uid() AND 
    added_by_type = 'holder'
  );

-- Policy 3: Merchants can read accounts mapped to them
CREATE POLICY "Merchants can read mapped accounts"
  ON public.bank_accounts
  FOR SELECT
  USING (mapped_to_user_id = auth.uid());

-- Policy 4: Users can insert their own bank accounts
CREATE POLICY "Users can insert their own accounts"
  ON public.bank_accounts
  FOR INSERT
  WITH CHECK (added_by_user_id = auth.uid());

-- Policy 5: Management users can update all bank accounts
CREATE POLICY "Management users can update all accounts"
  ON public.bank_accounts
  FOR UPDATE
  USING (public.is_management_user() = true)
  WITH CHECK (public.is_management_user() = true);

-- Policy 6: Users can update their own unmapped accounts
CREATE POLICY "Users can update their own unmapped accounts"
  ON public.bank_accounts
  FOR UPDATE
  USING (
    added_by_user_id = auth.uid() AND 
    status = 'unmapped'
  )
  WITH CHECK (
    added_by_user_id = auth.uid() AND
    status = 'unmapped'
  );

-- Policy 7: Management users can delete bank accounts
CREATE POLICY "Management users can delete accounts"
  ON public.bank_accounts
  FOR DELETE
  USING (public.is_management_user() = true);

-- =============================================================================
-- Bank accounts table setup complete!
-- =============================================================================

