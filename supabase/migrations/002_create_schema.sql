-- =============================================================================
-- CREATE SCHEMA - Complete database setup
-- =============================================================================
-- Creates all tables, triggers, functions, and RLS policies
-- Business Rules:
-- 1. Only Management and Holder users can ADD bank accounts
-- 2. Accounts can only be MAPPED to Merchants
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE ENUM TYPES
-- =============================================================================

-- User enums
CREATE TYPE user_status AS ENUM ('pending', 'suspended', 'approved');
CREATE TYPE user_type AS ENUM ('unassigned', 'merchant', 'holder', 'management');

-- Bank account enums
CREATE TYPE bank_account_status AS ENUM ('mapped', 'unmapped', 'parked');
CREATE TYPE added_by_type AS ENUM ('management', 'holder');

-- =============================================================================
-- STEP 2: CREATE TABLES
-- =============================================================================

-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  initials TEXT NOT NULL,
  type user_type NOT NULL DEFAULT 'unassigned'::user_type,
  status user_status NOT NULL DEFAULT 'pending'::user_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bank accounts table
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
  -- Note: Business rule "can only map to merchants" is enforced at application level
);

-- =============================================================================
-- STEP 3: CREATE INDEXES
-- =============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_type ON public.users(type);
CREATE INDEX idx_users_status ON public.users(status);

-- Bank accounts indexes
CREATE INDEX idx_bank_accounts_added_by ON public.bank_accounts(added_by_user_id);
CREATE INDEX idx_bank_accounts_mapped_to ON public.bank_accounts(mapped_to_user_id);
CREATE INDEX idx_bank_accounts_status ON public.bank_accounts(status);
CREATE INDEX idx_bank_accounts_added_by_type ON public.bank_accounts(added_by_type);

-- =============================================================================
-- STEP 4: CREATE FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is management (used in RLS policies)
CREATE FUNCTION public.is_management_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND type = 'management'
  );
END;
$$;

-- Function to auto-create user records (with graceful error handling)
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  calculated_initials TEXT;
  user_full_name TEXT;
  user_phone_number TEXT;
BEGIN
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  user_phone_number := NEW.raw_user_meta_data->>'phone_number';
  
  name_parts := string_to_array(user_full_name, ' ');
  
  IF array_length(name_parts, 1) >= 2 THEN
    first_name := name_parts[1];
    last_name := name_parts[array_length(name_parts, 1)];
    calculated_initials := UPPER(SUBSTRING(first_name, 1, 1) || SUBSTRING(last_name, 1, 1));
  ELSIF array_length(name_parts, 1) = 1 AND LENGTH(name_parts[1]) > 0 THEN
    calculated_initials := UPPER(SUBSTRING(name_parts[1], 1, 2));
  ELSE
    calculated_initials := UPPER(SUBSTRING(NEW.email, 1, 2));
  END IF;

  BEGIN
    INSERT INTO public.users (id, email, full_name, phone_number, initials, type, status)
    VALUES (
      NEW.id,
      NEW.email,
      user_full_name,
      user_phone_number,
      calculated_initials,
      'unassigned'::user_type,
      'pending'::user_status
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error in handle_new_user (fallback will handle): %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 5: CREATE TRIGGERS
-- =============================================================================

-- Users triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Bank accounts triggers
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- STEP 6: GRANT PERMISSIONS
-- =============================================================================

-- Users permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT ON auth.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;

-- Bank accounts permissions
GRANT ALL ON public.bank_accounts TO postgres, authenticated, service_role;

-- =============================================================================
-- STEP 7: ENABLE RLS
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 8: CREATE RLS POLICIES FOR USERS TABLE
-- =============================================================================

-- Policy 1: Users can read their own data
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Management users can read all users
CREATE POLICY "Management users can read all users"
  ON public.users
  FOR SELECT
  USING (public.is_management_user() = true);

-- Policy 3: Allow server-side user creation (needed for registration fallback)
CREATE POLICY "Allow server-side user creation"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Policy 4: Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 5: Management users can update all users
CREATE POLICY "Management users can update all users"
  ON public.users
  FOR UPDATE
  USING (public.is_management_user() = true)
  WITH CHECK (public.is_management_user() = true);

-- Policy 6: Service role has full access (for admin operations)
CREATE POLICY "Service role full access"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- STEP 9: CREATE RLS POLICIES FOR BANK ACCOUNTS TABLE
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

-- Policy 4: Management and Holder users can insert bank accounts
CREATE POLICY "Management and Holders can insert accounts"
  ON public.bank_accounts
  FOR INSERT
  WITH CHECK (
    added_by_user_id = auth.uid() AND
    (
      (added_by_type = 'management' AND public.is_management_user() = true) OR
      (added_by_type = 'holder' AND EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND type = 'holder'
      ))
    )
  );

-- Policy 5: Management users can update all bank accounts
CREATE POLICY "Management users can update all accounts"
  ON public.bank_accounts
  FOR UPDATE
  USING (public.is_management_user() = true)
  WITH CHECK (public.is_management_user() = true);

-- Policy 6: Holders can update their own unmapped accounts
CREATE POLICY "Holders can update their own unmapped accounts"
  ON public.bank_accounts
  FOR UPDATE
  USING (
    added_by_user_id = auth.uid() AND 
    added_by_type = 'holder' AND
    status = 'unmapped'
  )
  WITH CHECK (
    added_by_user_id = auth.uid() AND
    added_by_type = 'holder' AND
    status = 'unmapped'
  );

-- Policy 7: Management users can delete bank accounts
CREATE POLICY "Management users can delete accounts"
  ON public.bank_accounts
  FOR DELETE
  USING (public.is_management_user() = true);

-- =============================================================================
-- Schema creation complete!
-- Summary:
-- - Users table with auth integration
-- - Bank accounts table with business rules
-- - All necessary functions and triggers
-- - Comprehensive RLS policies for data security
-- =============================================================================
