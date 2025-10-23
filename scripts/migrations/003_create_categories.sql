-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add some default categories
INSERT INTO categories (name, color) VALUES
  ('Voorgerecht', 'voorgerecht'),
  ('Hoofdgerecht', 'hoofdgerecht'),
  ('Dessert', 'dessert'),
  ('Bijgerecht', 'bijgerecht')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on categories" ON categories;

-- Create policy to allow all operations (since this is a personal app)
CREATE POLICY "Allow all operations on categories" ON categories
  FOR ALL
  USING (true)
  WITH CHECK (true);
