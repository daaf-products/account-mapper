-- =============================================================================
-- CREATE SCHEMA - Complete database setup
-- =============================================================================
-- Creates all tables, triggers, and functions for the account mapper
-- =============================================================================

-- Step 1: Create ENUM types
-- -----------------------------------------------------------------------------
CREATE TYPE user_status AS ENUM ('pending', 'suspended', 'approved');
CREATE TYPE user_type AS ENUM ('unassigned', 'merchant', 'holder', 'management');

-- Step 2: Create users table
-- -----------------------------------------------------------------------------
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

-- Step 3: Create indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_type ON public.users(type);
CREATE INDEX idx_users_status ON public.users(status);

-- Step 4: Create trigger functions
-- -----------------------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Step 5: Create triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Grant permissions
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT ON auth.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- Schema creation complete!
-- =============================================================================

