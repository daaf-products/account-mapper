-- Create users table
-- This table extends Supabase auth.users with additional business logic fields

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  initials TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'unassigned' CHECK (type IN ('management', 'holder', 'merchant', 'unassigned')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON public.users(type);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to automatically create user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  calculated_initials TEXT;
BEGIN
  -- Extract full_name from raw_user_meta_data
  name_parts := string_to_array(NEW.raw_user_meta_data->>'full_name', ' ');
  
  -- Calculate initials
  IF array_length(name_parts, 1) >= 2 THEN
    -- First letter of first name + first letter of last name
    first_name := name_parts[1];
    last_name := name_parts[array_length(name_parts, 1)];
    calculated_initials := UPPER(SUBSTRING(first_name, 1, 1) || SUBSTRING(last_name, 1, 1));
  ELSIF array_length(name_parts, 1) = 1 THEN
    -- First two letters of single name
    calculated_initials := UPPER(SUBSTRING(name_parts[1], 1, 2));
  ELSE
    -- Fallback: first two letters of email
    calculated_initials := UPPER(SUBSTRING(NEW.email, 1, 2));
  END IF;

  -- Insert into public.users table
  INSERT INTO public.users (id, email, full_name, phone_number, initials, type, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone_number',
    calculated_initials,
    'unassigned',
    'pending'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

