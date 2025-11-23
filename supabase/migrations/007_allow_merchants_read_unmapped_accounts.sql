-- =============================================================================
-- ALLOW MERCHANTS TO READ UNMAPPED BANK ACCOUNTS
-- =============================================================================
-- This migration adds an RLS policy to allow merchants to read unmapped
-- bank accounts so they can browse and request mapping to them.
-- =============================================================================

-- Policy: Merchants can read unmapped accounts (to request mapping)
CREATE POLICY "Merchants can read unmapped accounts"
  ON public.bank_accounts
  FOR SELECT
  USING (
    status = 'unmapped' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.type = 'merchant'
      AND users.status = 'approved'
    )
  );

