-- Create site_credentials table for storing encrypted login credentials
-- This allows automated access to login-protected recipe sites

CREATE TABLE IF NOT EXISTS site_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL UNIQUE, -- e.g., 'libelle-lekker', 'dagelijksekost'
  site_url TEXT NOT NULL, -- e.g., 'https://www.libelle-lekker.be'
  username_encrypted TEXT NOT NULL, -- Encrypted username/email
  password_encrypted TEXT NOT NULL, -- Encrypted password
  is_active BOOLEAN DEFAULT true, -- Enable/disable without deleting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_site_credentials_site_name ON site_credentials(site_name);
CREATE INDEX IF NOT EXISTS idx_site_credentials_active ON site_credentials(is_active);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_site_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_credentials_updated_at
BEFORE UPDATE ON site_credentials
FOR EACH ROW
EXECUTE FUNCTION update_site_credentials_updated_at();

-- Add comment
COMMENT ON TABLE site_credentials IS 'Stores encrypted credentials for automated login to recipe sites like Libelle Lekker';
