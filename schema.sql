-- Supabase SQL Schema for Resume Parser Application

-- 1. Create resume_records table to store parsing history
CREATE TABLE resume_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    original_file_path TEXT,
    file_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'processing')),
    selected_fields JSONB,
    parsed_result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add index for faster queries on created_at field
CREATE INDEX idx_resume_records_created_at ON resume_records(created_at DESC);

-- 2. Create custom_sections table to store user-defined sections
CREATE TABLE custom_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    section_name TEXT NOT NULL,
    section_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 3. Create custom_subfields table to store fields within custom sections
CREATE TABLE custom_subfields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID REFERENCES custom_sections(id) ON DELETE CASCADE,
    field_label TEXT NOT NULL,
    field_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 4. Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers to automatically update the updated_at column
CREATE TRIGGER update_resume_records_updated_at
BEFORE UPDATE ON resume_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_sections_updated_at
BEFORE UPDATE ON custom_sections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_subfields_updated_at
BEFORE UPDATE ON custom_subfields
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. Create a storage bucket for resume files
-- Note: Run this in the Supabase dashboard SQL editor or through the API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('resume_files', 'resume_files', false);

-- 7. Create a policy to allow authenticated users to upload files
-- Note: Run this in the Supabase dashboard SQL editor
-- CREATE POLICY "Allow authenticated users to upload resumes" 
-- ON storage.objects FOR INSERT TO authenticated USING (
--   bucket_id = 'resume_files'
-- );

-- OPTIONAL: Create a view to easily retrieve records with related data
CREATE VIEW resume_records_view AS
SELECT 
    r.id,
    r.file_name,
    r.file_type,
    r.status,
    r.selected_fields,
    r.parsed_result,
    r.error_message,
    r.created_at,
    r.updated_at
FROM 
    resume_records r
ORDER BY 
    r.created_at DESC;

-- HOW TO USE:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste the content and run the query
-- 4. For storage buckets and policies, uncomment the relevant sections as needed
