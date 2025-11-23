# Account Mapper

<img  src="/static/logo.svg" alt="logo" width=50/>

The goal of this application is to map bank accounts to the registered merchants. Bank account can be listed by Management team or holders team. Everything must be approved by the Management team.

## Three types of users

1. **Management** - Contains users who would add bank accounts which are masked, approve users on registrations and add their type. They will also handle account status [Pending, Active, Suspended]. They can approve or reject request for bank mapping by merchants. They will upload and maintain the APK file to be downloaded by the holders.
2. **Merchants** - They can register an account, ask for a masked bank account to be mapped to them so that, its gets unmasked and they can see the details of that bank account.
3. **Holders** - They can register account, and once approved, they can add their bank account with masked values. They can also downloaded the OTP forwarder APK for setting up OTP forwarding.

## Packages Used

- Shadecn for Components - [svelte-kit](https://svelte.dev/docs/kit/introduction)
- Supabase as BaaS - [supabase](https://supabase.com/)
- SvelteKit for Web - [shadecn-svelte](https://www.shadcn-svelte.com/docs)
- Has little bit of Shadecn Extras - [shadecn-extras](https://www.shadcn-svelte-extras.com/docs/introduction)
- Lucide Svelte - [lucide-svelte](https://lucide.dev/guide/packages/lucide-svelte)

# Supabase Setup Guide

This guide will walk you through setting up Supabase for the Account Mapper application.

## Overview

The setup involves three SQL migration files:

1. `001_drop_everything.sql` - Cleans up existing schema (use when resetting)
2. `002_create_schema.sql` - Creates tables, triggers, and functions
3. `003_setup_rls.sql` - Configures Row Level Security policies

## Prerequisites

- A [Supabase](https://supabase.com) account
- A Supabase project created

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

## Step 2: Configure Environment Variables

1. Open `.env.local` in your project root (create it if it doesn't exist)
2. Add your Supabase credentials:

```env
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
```

3. **Important**: Restart your dev server after updating `.env.local`

## Step 3: Disable Email Confirmation

**This is critical for immediate login after registration!**

1. Go to **Authentication** > **Providers** > **Email**
2. Find **"Enable email confirmations"**
3. **UNCHECK this option**
4. Click **Save**

## Step 4: Run Database Migrations

### Option A: Fresh Setup

If this is your first time setting up the database:

1. Open Supabase Dashboard > **SQL Editor**
2. Click **New query**
3. Copy and paste `002_create_schema.sql`
4. Click **Run**
5. Wait for success message ✅
6. Repeat for `003_setup_rls.sql`

### Option B: Reset and Fresh Setup

If you need to reset the database (this will delete all data):

1. Open Supabase Dashboard > **SQL Editor**
2. Run `001_drop_everything.sql` first
3. Then run `002_create_schema.sql`
4. Finally run `003_setup_rls.sql`

## Step 5: Verify Setup

Run this query in SQL Editor to verify everything is set up correctly:

```sql
-- Check ENUM types
SELECT typname FROM pg_type WHERE typname IN ('user_status', 'user_type');

-- Check table structure
\d public.users;

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'users';

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'users';
```

You should see:

- ✅ 2 ENUM types: `user_status`, `user_type`
- ✅ 1 table: `users` with 9 columns
- ✅ 2 triggers: `on_auth_user_created`, `update_users_updated_at`
- ✅ 4 RLS policies

## Step 6: Test Registration

1. Start your dev server: `npm run dev`
2. Go to http://localhost:5173/register
3. Fill out the registration form
4. Submit and verify:
   - ✅ No errors in console
   - ✅ Redirects to `/pending` page
   - ✅ User appears in **Authentication** > **Users**
   - ✅ User record in **Table Editor** > **users**

## Database Schema

### ENUM Types

**user_status**: `'pending' | 'suspended' | 'approved'`
**user_type**: `'unassigned' | 'merchant' | 'holder' | 'management'`

### Users Table

| Column       | Type        | Default      | Description                |
| ------------ | ----------- | ------------ | -------------------------- |
| id           | UUID        | -            | Foreign key to auth.users  |
| email        | TEXT        | -            | User email (unique)        |
| full_name    | TEXT        | -            | User's full name           |
| phone_number | TEXT        | null         | Optional phone number      |
| initials     | TEXT        | -            | Calculated from name/email |
| type         | user_type   | 'unassigned' | User role/type             |
| status       | user_status | 'pending'    | Account status             |
| created_at   | TIMESTAMPTZ | NOW()        | Creation timestamp         |
| updated_at   | TIMESTAMPTZ | NOW()        | Last update timestamp      |

## How It Works

### Registration Flow

1. User submits registration form
2. `signUp()` creates user in `auth.users`
3. **Trigger**: `on_auth_user_created` attempts to create `public.users` record
4. **Fallback**: If trigger fails, SvelteKit action creates record manually
5. User is signed in immediately (no email confirmation)
6. User redirected to `/pending` page

### Authentication Flow

1. `hooks.server.ts` checks for authenticated user
2. Fetches user data from `public.users` table
3. Populates `locals.user` with user details
4. Protected routes check `locals.user` and redirect if needed

### Status-Based Routing

- **pending**: Redirects to `/pending` page
- **suspended**: Redirects to `/suspended` page
- **approved**: Allowed to access main app
- **No auth**: Redirects to `/login` page

## Troubleshooting

### "Database error saving new user"

- **Cause**: Email confirmation is enabled
- **Fix**: Disable email confirmation in Auth settings (Step 3)

### "must be owner of table users"

- **Cause**: Trying to run `DROP TABLE` or `ALTER TRIGGER` without permissions
- **Fix**: Use `001_drop_everything.sql` OR delete the project and create a new one

### "fetch failed" or "ENOTFOUND"

- **Cause**: Wrong Supabase URL in `.env.local`
- **Fix**: Double-check credentials and restart dev server

### Users not appearing in `public.users`

- **Cause**: Trigger might be failing silently
- **Fix**: The fallback code should handle this automatically. Check console logs.

## Security Notes

1. **Never commit `.env.local`** - It contains sensitive keys
2. **Service role key** - Only use server-side, never in browser
3. **RLS policies** - Protect user data from unauthorized access
4. **Anon key** - Safe to use in browser (public-facing)

## Need to Reset?

If you want to start completely fresh:

1. **Option A**: Run `001_drop_everything.sql`, then setup again
2. **Option B**: Delete the Supabase project and create a new one
3. Update `.env.local` with new credentials
4. Restart dev server
5. Run migrations `002_create_schema.sql` and `003_setup_rls.sql`

---

**Setup complete!** 🎉 You're ready to start developing.

## Database Migrations

This directory contains SQL migration scripts for the Account Mapper application.

### Migration Files

#### 001_drop_everything.sql

**Purpose:** Drops all database objects (tables, functions, triggers, policies)

**When to use:**

- Complete database reset
- Starting fresh in development
- Before running migrations from scratch

**⚠️ WARNING:** This will delete ALL data! Use with caution.

```bash
# Local development
npx supabase db reset --local

# Or run directly
psql "your_connection_string" -f 001_drop_everything.sql
```

---

#### 002_create_schema.sql

**Purpose:** Creates the complete database schema

**Includes:**

- ✅ ENUM types (user_type, user_status, bank_account_status, added_by_type)
- ✅ Tables (users, bank_accounts)
- ✅ Indexes for performance
- ✅ Functions (update_updated_at_column, is_management_user, handle_new_user)
- ✅ Triggers (auto-create users, auto-update timestamps)
- ✅ RLS policies for both tables
- ✅ Permissions

**Business Rules Enforced:**

1. Only Management and Holder users can ADD bank accounts
2. Accounts can only be MAPPED to Merchant users
3. Management users can read/update all data
4. Holders can only see their own accounts
5. Merchants can only see accounts mapped to them

```bash
# Run after 001 (or on fresh database)
psql "your_connection_string" -f 002_create_schema.sql
```

---

#### 003_seed_data.sql

**Purpose:** Populates database with test data for development

**Includes:**

- 📝 Instructions for seeding users (via Supabase Auth)
- 15 bank accounts with various statuses
- Mix of accounts added by holders and management
- Accounts mapped to different merchants

**Note:** Users must exist before running this. Create users via:

- Supabase Dashboard (Authentication > Users)
- API calls to `auth.admin.createUser()`
- Your app's registration flow

```bash
# Run after users are created
psql "your_connection_string" -f 003_seed_data.sql
```

---

### Quick Start

#### Full Reset (Local Development)

```bash
# Option 1: Using Supabase CLI (recommended)
cd /path/to/project
npx supabase db reset --local

# This runs all migrations in order automatically
```

#### Manual Step-by-Step

```bash
# 1. Drop everything
npx supabase db execute --local -f supabase/migrations/001_drop_everything.sql

# 2. Create schema
npx supabase db execute --local -f supabase/migrations/002_create_schema.sql

# 3. Create users via your app or Supabase dashboard
# Example: Sign up at http://localhost:54321/auth/v1/signup

# 4. Seed data
npx supabase db execute --local -f supabase/migrations/003_seed_data.sql
```

---

### Production Deployment

#### Using Supabase CLI

```bash
# Link to your project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push

# Or deploy specific migration
npx supabase db execute --remote -f supabase/migrations/002_create_schema.sql
```

#### Using Supabase Dashboard

1. Go to **SQL Editor** in your Supabase project
2. Copy and paste the contents of each migration file
3. Run them in order (001 → 002 → 003)

---

### Schema Overview

#### Users Table

- **Purpose:** Stores user profiles and metadata
- **Types:** unassigned, merchant, holder, management
- **Statuses:** pending, approved, suspended
- **Auth Integration:** Linked to Supabase Auth via trigger

#### Bank Accounts Table

- **Purpose:** Stores bank account information
- **Statuses:** mapped, unmapped, parked
- **Added By:** management, holder
- **Mapped To:** merchant users only
- **Security:** Data masked at server level, reveal via API

---

### Development Tips

#### Testing RLS Policies

```sql
-- Test as different user types
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'user-uuid-here';

-- Test management user
SELECT * FROM public.users; -- Should see all users

-- Test holder user
SELECT * FROM public.bank_accounts; -- Should see only their accounts
```

#### Check Current Schema

```sql
-- List all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- List all enums
SELECT typname FROM pg_type WHERE typtype = 'e';

-- List all functions
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;

-- List all policies
SELECT tablename, policyname FROM pg_policies;
```

---

### Troubleshooting

#### "relation already exists" error

- Run `001_drop_everything.sql` first to clean up

#### "type already exists" error

- Run `001_drop_everything.sql` to drop all ENUMs

#### "no users found" when seeding

- Create users via Supabase Auth first
- Update user types: `UPDATE public.users SET type = 'management' WHERE email = 'admin@example.com'`

#### RLS blocking queries

- Check your JWT token has the correct user ID
- Verify user type is set correctly in public.users
- Use service role key for admin operations

---

### Migration History

| Version | Date       | Description                                |
| ------- | ---------- | ------------------------------------------ |
| 003     | 2025-11-18 | Clean consolidated setup with seed data    |
| 002     | 2025-11-18 | Complete schema with users + bank accounts |
| 001     | 2025-11-18 | Drop everything script                     |

---

### Support

For issues or questions:

1. Check Supabase logs: `npx supabase logs --local`
2. Review RLS policies in Supabase Dashboard
3. Test queries in SQL Editor with different user contexts
