-- =============================================================================
-- SEED BANK ACCOUNTS DATA FOR TESTING
-- =============================================================================
-- This file contains dummy bank account data for testing the accounts screen
-- Run this after the migrations are applied
-- =============================================================================

-- First, let's check what users we have and store them in temp variables
DO $$
DECLARE
  holder_id_1 UUID;
  holder_id_2 UUID;
  merchant_id_1 UUID;
  merchant_id_2 UUID;
  management_id UUID;
BEGIN
  -- Get holder IDs
  SELECT id INTO holder_id_1 FROM public.users WHERE type = 'holder' LIMIT 1;
  SELECT id INTO holder_id_2 FROM public.users WHERE type = 'holder' LIMIT 1 OFFSET 1;
  
  -- Get merchant IDs
  SELECT id INTO merchant_id_1 FROM public.users WHERE type = 'merchant' LIMIT 1;
  SELECT id INTO merchant_id_2 FROM public.users WHERE type = 'merchant' LIMIT 1 OFFSET 1;
  
  -- Get management ID (as fallback)
  SELECT id INTO management_id FROM public.users WHERE type = 'management' LIMIT 1;
  
  -- Fallback: If we don't have enough holders, reuse the first one
  IF holder_id_2 IS NULL THEN
    holder_id_2 := holder_id_1;
  END IF;
  
  -- Fallback: If we don't have enough merchants, reuse the first one
  IF merchant_id_2 IS NULL THEN
    merchant_id_2 := merchant_id_1;
  END IF;
  
  -- Fallback: If we don't have any merchants, use management as merchant
  IF merchant_id_1 IS NULL THEN
    merchant_id_1 := management_id;
    merchant_id_2 := management_id;
  END IF;
  
  -- Fallback: If we don't have any holders, use management as holder
  IF holder_id_1 IS NULL THEN
    holder_id_1 := management_id;
    holder_id_2 := management_id;
  END IF;

  -- Insert dummy bank accounts
  INSERT INTO public.bank_accounts (
    account_holder_name,
    bank_name,
    account_number,
    ifsc_code,
    status,
    added_by_type,
    added_by_user_id,
    mapped_to_user_id
  ) VALUES
    -- Mapped accounts
    (
      'John Doe',
      'HDFC Bank',
      '50100123456789',
      'HDFC0001234',
      'mapped',
      'holder',
      holder_id_1,
      merchant_id_1
    ),
    (
      'Tech Solutions Ltd',
      'ICICI Bank',
      '012345678901',
      'ICIC0001234',
      'mapped',
      'merchant',
      merchant_id_1,
      merchant_id_1
    ),
    (
      'Sarah Johnson',
      'Axis Bank',
      '987654321098',
      'UTIB0001234',
      'mapped',
      'holder',
      holder_id_2,
      merchant_id_1
    ),
    
    -- Unmapped accounts
    (
      'Michael Chen',
      'State Bank',
      '123456789012',
      'SBIN0001234',
      'unmapped',
      'holder',
      holder_id_1,
      NULL
    ),
    (
      'Emma Davis',
      'Kotak Bank',
      '567890123456',
      'KKBK0001234',
      'unmapped',
      'holder',
      holder_id_2,
      NULL
    ),
    (
      'Global Traders Inc',
      'Yes Bank',
      '234567890123',
      'YESB0001234',
      'unmapped',
      'merchant',
      merchant_id_2,
      NULL
    ),
    (
      'Robert Wilson',
      'Punjab National Bank',
      '345678901234',
      'PUNB0001234',
      'unmapped',
      'holder',
      holder_id_1,
      NULL
    ),
    
    -- Parked accounts
    (
      'Sunrise Enterprises',
      'Bank of Baroda',
      '456789012345',
      'BARB0001234',
      'parked',
      'merchant',
      merchant_id_1,
      NULL
    ),
    (
      'Maria Garcia',
      'Canara Bank',
      '678901234567',
      'CNRB0001234',
      'parked',
      'holder',
      holder_id_2,
      NULL
    ),
    (
      'David Lee',
      'Union Bank',
      '789012345678',
      'UBIN0001234',
      'parked',
      'holder',
      holder_id_1,
      NULL
    ),
    
    -- More mapped accounts
    (
      'Innovate Corp',
      'IndusInd Bank',
      '890123456789',
      'INDB0001234',
      'mapped',
      'merchant',
      merchant_id_2,
      merchant_id_2
    ),
    (
      'Jessica Brown',
      'Federal Bank',
      '901234567890',
      'FDRL0001234',
      'mapped',
      'holder',
      holder_id_1,
      merchant_id_1
    ),
    
    -- More unmapped accounts
    (
      'Smart Solutions',
      'IDFC First Bank',
      '112233445566',
      'IDFB0001234',
      'unmapped',
      'merchant',
      merchant_id_1,
      NULL
    ),
    (
      'Alex Turner',
      'RBL Bank',
      '223344556677',
      'RATN0001234',
      'unmapped',
      'holder',
      holder_id_2,
      NULL
    ),
    (
      'Enterprise Holdings',
      'Bandhan Bank',
      '334455667788',
      'BDBL0001234',
      'unmapped',
      'merchant',
      merchant_id_2,
      NULL
    );
    
  RAISE NOTICE 'Successfully inserted % bank accounts', (SELECT COUNT(*) FROM public.bank_accounts);
END $$;

-- =============================================================================
-- Seed data inserted!
-- =============================================================================

