-- =============================================================================
-- Create APK Files Table
-- =============================================================================
-- This table stores metadata for APK files uploaded by management users
-- Files are stored in Supabase Storage, this table stores references and metadata
-- =============================================================================

-- Create apk_files table
CREATE TABLE IF NOT EXISTS public.apk_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    version TEXT NOT NULL,
    file_size BIGINT NOT NULL, -- Size in bytes
    storage_path TEXT NOT NULL UNIQUE, -- Path in Supabase Storage
    download_count INTEGER NOT NULL DEFAULT 0,
    uploaded_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_latest BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_version UNIQUE (version)
);

-- Create indexes for better query performance
CREATE INDEX idx_apk_files_version ON public.apk_files(version);
CREATE INDEX idx_apk_files_uploaded_by ON public.apk_files(uploaded_by_user_id);
CREATE INDEX idx_apk_files_is_latest ON public.apk_files(is_latest);
CREATE INDEX idx_apk_files_created_at ON public.apk_files(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_apk_files_updated_at
    BEFORE UPDATE ON public.apk_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.apk_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Management users can do everything
CREATE POLICY "Management users can read all files" ON public.apk_files
    FOR SELECT
    USING (public.is_management_user() = true);

CREATE POLICY "Management users can insert files" ON public.apk_files
    FOR INSERT
    WITH CHECK (public.is_management_user() = true AND uploaded_by_user_id = auth.uid());

CREATE POLICY "Management users can update files" ON public.apk_files
    FOR UPDATE
    USING (public.is_management_user() = true)
    WITH CHECK (public.is_management_user() = true);

CREATE POLICY "Management users can delete files" ON public.apk_files
    FOR DELETE
    USING (public.is_management_user() = true);

-- Holders can only read files (for downloading)
CREATE POLICY "Holders can read all files" ON public.apk_files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'holder'
        )
    );

-- Grant permissions
GRANT ALL ON public.apk_files TO postgres, authenticated, service_role;

-- =============================================================================
-- APK Files Table Created Successfully
-- =============================================================================

