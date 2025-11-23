-- =============================================================================
-- Allow holders to delete their own bank accounts
-- =============================================================================

-- Policy: Holders can delete their own accounts (only if unmapped)
CREATE POLICY "Holders can delete their own unmapped accounts"
  ON public.bank_accounts
  FOR DELETE
  USING (
    added_by_user_id = auth.uid() AND 
    added_by_type = 'holder' AND
    status = 'unmapped'
  );

