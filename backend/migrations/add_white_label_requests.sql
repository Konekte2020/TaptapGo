-- Demandes White-Label soumises depi landing page
CREATE TABLE IF NOT EXISTS white_label_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    zone TEXT NOT NULL,
    message TEXT,
    website TEXT,
    drivers_estimate INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'archived')),
    admin_notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
