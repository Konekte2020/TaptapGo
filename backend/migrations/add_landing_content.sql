-- Landing page content (editable from SuperAdmin)
CREATE TABLE IF NOT EXISTS landing_content (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default empty - API will merge with defaults
INSERT INTO landing_content (key, value) VALUES ('sections', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
