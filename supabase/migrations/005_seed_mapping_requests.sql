-- =============================================================================
-- SEED ACCOUNT MAPPING REQUESTS
-- =============================================================================
-- Populates test data for account mapping requests
-- =============================================================================

DO $$
DECLARE
  merchant_id_1 UUID;
  merchant_id_2 UUID;
  account_id_1 UUID;
  account_id_2 UUID;
  account_id_3 UUID;
  account_id_4 UUID;
  account_id_5 UUID;
  account_id_6 UUID;
  management_id UUID;
BEGIN
  -- Get merchant IDs
  SELECT id INTO merchant_id_1 FROM public.users WHERE type = 'merchant' LIMIT 1;
  SELECT id INTO merchant_id_2 FROM public.users WHERE type = 'merchant' LIMIT 1 OFFSET 1;
  
  -- Get management user ID
  SELECT id INTO management_id FROM public.users WHERE type = 'management' LIMIT 1;
  
  -- Get unmapped/parked bank account IDs (merchants can request these)
  SELECT id INTO account_id_1 FROM public.bank_accounts WHERE status IN ('unmapped', 'parked') LIMIT 1;
  SELECT id INTO account_id_2 FROM public.bank_accounts WHERE status IN ('unmapped', 'parked') LIMIT 1 OFFSET 1;
  SELECT id INTO account_id_3 FROM public.bank_accounts WHERE status IN ('unmapped', 'parked') LIMIT 1 OFFSET 2;
  SELECT id INTO account_id_4 FROM public.bank_accounts WHERE status IN ('unmapped', 'parked') LIMIT 1 OFFSET 3;
  SELECT id INTO account_id_5 FROM public.bank_accounts WHERE status IN ('unmapped', 'parked') LIMIT 1 OFFSET 4;
  SELECT id INTO account_id_6 FROM public.bank_accounts WHERE status IN ('unmapped', 'parked') LIMIT 1 OFFSET 5;
  
  -- Fallback: Use any merchant if not enough exist
  IF merchant_id_2 IS NULL THEN merchant_id_2 := merchant_id_1; END IF;
  
  -- Only proceed if we have required data
  IF merchant_id_1 IS NOT NULL AND account_id_1 IS NOT NULL AND management_id IS NOT NULL THEN
    -- Insert test mapping requests
    INSERT INTO public.account_mapping_requests (
      merchant_id,
      bank_account_id,
      status,
      request_notes,
      reviewed_by_user_id,
      reviewed_at,
      created_at,
      updated_at
    ) VALUES
      -- PENDING REQUESTS (3)
      (
        merchant_id_1,
        account_id_1,
        'pending',
        'Need this account for processing customer payments',
        NULL,
        NULL,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours'
      ),
      (
        merchant_id_2,
        account_id_2,
        'pending',
        'Main business account',
        NULL,
        NULL,
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '4 hours'
      ),
      (
        merchant_id_1,
        account_id_3,
        'pending',
        'Backup payment account',
        NULL,
        NULL,
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '6 hours'
      ),
      
      -- APPROVED REQUESTS (2)
      (
        merchant_id_1,
        account_id_4,
        'approved',
        'Main payment processing account',
        management_id,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day'
      ),
      (
        merchant_id_2,
        account_id_5,
        'approved',
        'Processing merchant transactions',
        management_id,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '3 days'
      ),
      
      -- REJECTED REQUEST (1)
      (
        merchant_id_2,
        account_id_6,
        'rejected',
        'Backup payment account',
        management_id,
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '5 days'
      );
      
    RAISE NOTICE 'Successfully inserted % mapping requests', (SELECT COUNT(*) FROM public.account_mapping_requests);
  ELSE
    RAISE NOTICE 'Not enough data to seed mapping requests. Please ensure merchants and bank accounts exist.';
  END IF;
END $$;

-- =============================================================================
-- Seed data complete!
-- Summary:
-- - 3 pending requests
-- - 2 approved requests
-- - 1 rejected request
-- =============================================================================

