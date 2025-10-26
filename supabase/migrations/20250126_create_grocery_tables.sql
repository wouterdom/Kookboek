-- Boodschappencategorieën (system + custom)
CREATE TABLE IF NOT EXISTS grocery_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT '📦',
    color TEXT DEFAULT '#6B7280',
    order_index INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Boodschappenlijst items
CREATE TABLE IF NOT EXISTS grocery_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    amount TEXT,
    original_amount TEXT,
    category_id UUID REFERENCES grocery_categories(id) ON DELETE SET NULL,
    is_checked BOOLEAN DEFAULT false,
    from_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices voor performance
CREATE INDEX IF NOT EXISTS idx_grocery_items_checked ON grocery_items(is_checked);
CREATE INDEX IF NOT EXISTS idx_grocery_items_category ON grocery_items(category_id);
CREATE INDEX IF NOT EXISTS idx_grocery_categories_order ON grocery_categories(order_index);

-- Seed default categories
INSERT INTO grocery_categories (name, slug, icon, color, order_index, is_system) VALUES
    ('Groenten & Fruit', 'groenten-fruit', '🥬', '#10B981', 1, true),
    ('Zuivel & Eieren', 'zuivel-eieren', '🥛', '#3B82F6', 2, true),
    ('Brood & Bakkerij', 'brood-bakkerij', '🥖', '#F59E0B', 3, true),
    ('Vlees & Vis', 'vlees-vis', '🥩', '#EF4444', 4, true),
    ('Pasta, Rijst & Granen', 'pasta-rijst', '🍝', '#8B5CF6', 5, true),
    ('Conserven & Potten', 'conserven', '🥫', '#EC4899', 6, true),
    ('Kruiden & Specerijen', 'kruiden', '🧂', '#14B8A6', 7, true),
    ('Dranken', 'dranken', '🍷', '#F97316', 8, true),
    ('Diepvries', 'diepvries', '🍦', '#06B6D4', 9, true),
    ('Schoonmaak & Non-food', 'schoonmaak', '🧹', '#6B7280', 10, true),
    ('Overige', 'overige', '➕', '#9CA3AF', 99, true)
ON CONFLICT (slug) DO NOTHING;
