-- =============================================================================
-- SEED DATA - Test data for development
-- =============================================================================
-- Populates the database with test users and bank accounts
-- Note: This is for development/testing only. Remove in production.
-- =============================================================================

-- =============================================================================
-- SEED USERS
-- =============================================================================
-- Note: In real scenarios, users are created via auth.signup()
-- This seed data is for testing the application with different user types

-- To manually seed users, you would need to:
-- 1. Create users via Supabase Auth UI or auth.admin.createUser()
-- 2. Update their type and status in the public.users table

-- Example SQL to update user types (run after creating auth users):
-- UPDATE public.users SET type = 'management', status = 'approved' WHERE email = 'admin@example.com';
-- UPDATE public.users SET type = 'holder', status = 'approved' WHERE email = 'holder1@example.com';
-- UPDATE public.users SET type = 'holder', status = 'approved' WHERE email = 'holder2@example.com';
-- UPDATE public.users SET type = 'merchant', status = 'approved' WHERE email = 'merchant1@example.com';
-- UPDATE public.users SET type = 'merchant', status = 'approved' WHERE email = 'merchant2@example.com';

-- =============================================================================
-- SEED BANK ACCOUNTS
-- =============================================================================

DO $$
DECLARE
  holder_id_1 UUID;
  holder_id_2 UUID;
  merchant_id_1 UUID;
  merchant_id_2 UUID;
  management_id UUID;
BEGIN
  -- Get user IDs (requires that users exist in the system)
  SELECT id INTO holder_id_1 FROM public.users WHERE type = 'holder' LIMIT 1;
  SELECT id INTO holder_id_2 FROM public.users WHERE type = 'holder' LIMIT 1 OFFSET 1;
  SELECT id INTO merchant_id_1 FROM public.users WHERE type = 'merchant' LIMIT 1;
  SELECT id INTO merchant_id_2 FROM public.users WHERE type = 'merchant' LIMIT 1 OFFSET 1;
  SELECT id INTO management_id FROM public.users WHERE type = 'management' LIMIT 1;
  
  -- Fallback: If we don't have enough users, reuse what we have
  IF holder_id_2 IS NULL THEN holder_id_2 := holder_id_1; END IF;
  IF merchant_id_2 IS NULL THEN merchant_id_2 := merchant_id_1; END IF;
  IF merchant_id_1 IS NULL THEN merchant_id_1 := management_id; END IF;
  IF holder_id_1 IS NULL THEN holder_id_1 := management_id; END IF;

  -- Only proceed if we have at least one user
  IF management_id IS NOT NULL THEN
    -- Insert test bank accounts
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
      -- Mapped accounts (added by holder)
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
        'Sarah Johnson',
        'Axis Bank',
        '987654321098',
        'UTIB0001234',
        'mapped',
        'holder',
        holder_id_2,
        merchant_id_1
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
      
      -- Mapped accounts (added by management)
      (
        'Tech Solutions Ltd',
        'ICICI Bank',
        '012345678901',
        'ICIC0001234',
        'mapped',
        'management',
        management_id,
        merchant_id_1
      ),
      (
        'Innovate Corp',
        'IndusInd Bank',
        '890123456789',
        'INDB0001234',
        'mapped',
        'management',
        management_id,
        merchant_id_2
      ),
      
      -- Unmapped accounts (added by holder)
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
        'Robert Wilson',
        'Punjab National Bank',
        '345678901234',
        'PUNB0001234',
        'unmapped',
        'holder',
        holder_id_1,
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
      
      -- Unmapped accounts (added by management)
      (
        'Global Traders Inc',
        'Yes Bank',
        '234567890123',
        'YESB0001234',
        'unmapped',
        'management',
        management_id,
        NULL
      ),
      (
        'Smart Solutions',
        'IDFC First Bank',
        '112233445566',
        'IDFB0001234',
        'unmapped',
        'management',
        management_id,
        NULL
      ),
      (
        'Enterprise Holdings',
        'Bandhan Bank',
        '334455667788',
        'BDBL0001234',
        'unmapped',
        'management',
        management_id,
        NULL
      ),
      
      -- Parked accounts (added by holder)
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
      
      -- Parked accounts (added by management)
      (
        'Sunrise Enterprises',
        'Bank of Baroda',
        '456789012345',
        'BARB0001234',
        'parked',
        'management',
        management_id,
        NULL
      );
      
    RAISE NOTICE 'Successfully inserted % bank accounts', (SELECT COUNT(*) FROM public.bank_accounts);
  ELSE
    RAISE NOTICE 'No users found. Please create users first before seeding bank accounts.';
  END IF;
END $$;

-- =============================================================================
-- Seed data complete!
-- Summary:
-- - 15 bank accounts created (if users exist)
-- - Mix of mapped, unmapped, and parked statuses
-- - Accounts added by both holders and management
-- - Accounts mapped to different merchants
-- =============================================================================

