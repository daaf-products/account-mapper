-- =============================================================================
-- CREATE NOTIFICATIONS TABLE
-- =============================================================================
-- This table stores notifications for users about account activities
-- Business Rules:
-- 1. Notifications are created for account mapping approvals/rejections
-- 2. Notifications are created for profile verification
-- 3. Notifications are created for account status changes (parked, etc.)
-- 4. Users can mark notifications as read
-- =============================================================================

-- Create ENUM type for notification type
CREATE TYPE notification_type AS ENUM (
  'mapping_approved',
  'mapping_rejected',
  'profile_verified',
  'account_parked',
  'account_unmapped',
  'system'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- Store additional data like bank_account_id, account_number, reason, etc.
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (to mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Management can insert notifications for any user
CREATE POLICY "Management can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_management_user() = true);

-- Service role can insert notifications (for system notifications)
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- =============================================================================
-- TRIGGERS TO AUTO-CREATE NOTIFICATIONS
-- =============================================================================

-- Function to create notification when mapping request is approved
CREATE OR REPLACE FUNCTION public.notify_mapping_approved()
RETURNS TRIGGER AS $$
DECLARE
  bank_account_record RECORD;
  merchant_record RECORD;
BEGIN
  -- Only create notification if status changed to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get bank account details
    SELECT bank_name, account_number INTO bank_account_record
    FROM public.bank_accounts
    WHERE id = NEW.bank_account_id;
    
    -- Get merchant details
    SELECT full_name INTO merchant_record
    FROM public.users
    WHERE id = NEW.merchant_id;
    
    -- Create notification
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.merchant_id,
      'mapping_approved',
      'Account Mapping Approved',
      'Your request to map ' || bank_account_record.bank_name || ' account ' || 
      '****' || RIGHT(bank_account_record.account_number, 4) || ' has been approved.',
      jsonb_build_object(
        'bank_account_id', NEW.bank_account_id,
        'request_id', NEW.id,
        'bank_name', bank_account_record.bank_name,
        'account_number', bank_account_record.account_number
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when mapping request is rejected
CREATE OR REPLACE FUNCTION public.notify_mapping_rejected()
RETURNS TRIGGER AS $$
DECLARE
  bank_account_record RECORD;
BEGIN
  -- Only create notification if status changed to rejected
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Get bank account details
    SELECT bank_name, account_number INTO bank_account_record
    FROM public.bank_accounts
    WHERE id = NEW.bank_account_id;
    
    -- Create notification
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.merchant_id,
      'mapping_rejected',
      'Account Mapping Rejected',
      'Your request to map ' || bank_account_record.bank_name || ' account ' || 
      '****' || RIGHT(bank_account_record.account_number, 4) || ' has been rejected.' ||
      CASE 
        WHEN NEW.request_notes IS NOT NULL AND NEW.request_notes != '' 
        THEN ' Reason: ' || NEW.request_notes
        ELSE ''
      END,
      jsonb_build_object(
        'bank_account_id', NEW.bank_account_id,
        'request_id', NEW.id,
        'bank_name', bank_account_record.bank_name,
        'account_number', bank_account_record.account_number,
        'reason', NEW.request_notes
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when account is parked
CREATE OR REPLACE FUNCTION public.notify_account_parked()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status changed to parked and account is mapped to a merchant
  IF NEW.status = 'parked' AND OLD.status != 'parked' AND NEW.mapped_to_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.mapped_to_user_id,
      'account_parked',
      'Account Parked',
      NEW.bank_name || ' account ****' || RIGHT(NEW.account_number, 4) || 
      ' has been temporarily parked due to maintenance.',
      jsonb_build_object(
        'bank_account_id', NEW.id,
        'bank_name', NEW.bank_name,
        'account_number', NEW.account_number
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when user is approved (profile verified)
CREATE OR REPLACE FUNCTION public.notify_profile_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status changed to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.id,
      'profile_verified',
      'Profile Verification Complete',
      'Your merchant profile has been successfully verified and approved.',
      jsonb_build_object(
        'user_id', NEW.id,
        'user_type', NEW.type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER notify_on_mapping_approved
  AFTER UPDATE ON public.account_mapping_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mapping_approved();

CREATE TRIGGER notify_on_mapping_rejected
  AFTER UPDATE ON public.account_mapping_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mapping_rejected();

CREATE TRIGGER notify_on_account_parked
  AFTER UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_account_parked();

CREATE TRIGGER notify_on_profile_verified
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_profile_verified();

