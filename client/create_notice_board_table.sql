-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to everyone (authenticated users)
CREATE POLICY "Allow read access to everyone" ON system_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow write access only to admins
-- Note: This assumes you have a way to check for admin role, e.g., via a custom claim or a profiles table check.
-- For simplicity in this script, we'll allow authenticated users to update if they are admins.
-- Adjust the USING clause based on your actual admin check implementation.
CREATE POLICY "Allow update access to admins" ON system_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert default common info if not exists
INSERT INTO system_settings (key, value)
VALUES ('common_info', 'Welcome to the Notice Board! Important announcements will appear here.')
ON CONFLICT (key) DO NOTHING;
