-- =============================================================================
-- DROP EVERYTHING - Clean slate script
-- =============================================================================
-- Run this to completely reset the database schema
-- WARNING: This will delete ALL data!
-- =============================================================================

-- Drop bank_accounts triggers
DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON public.bank_accounts;

-- Drop bank_accounts policies
DROP POLICY IF EXISTS "Management users can read all bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Holders can read their own accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Merchants can read mapped accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Management and Holders can insert accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Management users can update all accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Holders can update their own unmapped accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Management users can delete accounts" ON public.bank_accounts;

-- Drop bank_accounts table
DROP TABLE IF EXISTS public.bank_accounts CASCADE;

-- Drop users triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Drop users policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Allow server-side user creation" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.users;
DROP POLICY IF EXISTS "Management users can read all users" ON public.users;
DROP POLICY IF EXISTS "Management users can update all users" ON public.users;

-- Drop users table
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.is_management_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop all ENUM types
DROP TYPE IF EXISTS bank_account_status CASCADE;
DROP TYPE IF EXISTS added_by_type CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_type CASCADE;

-- =============================================================================
-- Cleanup complete!
-- =============================================================================
