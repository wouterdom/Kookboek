-- Shopping List and Weekly Menu Features
-- Migration: 20251026_shopping_list_weekly_menu
-- Description: Adds grocery categories, grocery items, and weekly menu planning tables

-- =====================================================
-- GROCERY CATEGORIES
-- =====================================================
-- Boodschappencategorieën (combinatie standaard + custom)
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

-- =====================================================
-- WEEKLY MENU ITEMS
-- =====================================================
-- Weekmenu planning (created before grocery_items due to foreign key)
CREATE TABLE IF NOT EXISTS weekly_menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    week_date DATE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    servings INTEGER DEFAULT 4,
    is_completed BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recipe_id, week_date, day_of_week)
);

-- =====================================================
-- GROCERY ITEMS
-- =====================================================
-- Boodschappenlijst items
CREATE TABLE IF NOT EXISTS grocery_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    amount TEXT,
    original_amount TEXT,
    category_id UUID REFERENCES grocery_categories(id) ON DELETE SET NULL,
    is_checked BOOLEAN DEFAULT false,
    from_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    from_weekmenu_id UUID REFERENCES weekly_menu_items(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_weekly_menu_week ON weekly_menu_items(week_date);
CREATE INDEX IF NOT EXISTS idx_weekly_menu_recipe ON weekly_menu_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_checked ON grocery_items(is_checked);
CREATE INDEX IF NOT EXISTS idx_grocery_items_category ON grocery_items(category_id);
CREATE INDEX IF NOT EXISTS idx_grocery_categories_visible ON grocery_categories(is_visible);

-- =====================================================
-- SEED DATA - DEFAULT GROCERY CATEGORIES
-- =====================================================
INSERT INTO grocery_categories (name, slug, icon, color, order_index, is_system, is_visible) VALUES
    ('Groenten & Fruit', 'groenten-fruit', '🥬', '#10B981', 1, true, true),
    ('Zuivel & Eieren', 'zuivel-eieren', '🥛', '#3B82F6', 2, true, true),
    ('Brood & Bakkerij', 'brood-bakkerij', '🥖', '#F59E0B', 3, true, true),
    ('Vlees & Vis', 'vlees-vis', '🥩', '#EF4444', 4, true, true),
    ('Pasta, Rijst & Granen', 'pasta-rijst', '🍝', '#8B5CF6', 5, true, true),
    ('Conserven & Potten', 'conserven', '🥫', '#EC4899', 6, true, true),
    ('Kruiden & Specerijen', 'kruiden', '🧂', '#14B8A6', 7, true, true),
    ('Dranken', 'dranken', '🍷', '#F97316', 8, true, true),
    ('Diepvries', 'diepvries', '🍦', '#06B6D4', 9, true, true),
    ('Schoonmaak & Non-food', 'schoonmaak', '🧹', '#6B7280', 10, true, true),
    ('Overige', 'overige', '➕', '#9CA3AF', 99, true, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (Optional - if using Supabase Auth)
-- =====================================================
-- Enable RLS if needed
-- ALTER TABLE grocery_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE weekly_menu_items ENABLE ROW LEVEL SECURITY;

-- Example policies (uncomment if using auth):
-- CREATE POLICY "Enable read access for all users" ON grocery_categories FOR SELECT USING (true);
-- CREATE POLICY "Enable all access for authenticated users" ON grocery_items FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Enable all access for authenticated users" ON weekly_menu_items FOR ALL USING (auth.role() = 'authenticated');
