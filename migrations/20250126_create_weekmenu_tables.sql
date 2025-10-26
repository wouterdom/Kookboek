-- Create weekly_menu_items table for weekmenu feature
-- Week starts on Monday (day_of_week: 0=Ma, 6=Zo, NULL=geen dag)

CREATE TABLE IF NOT EXISTS weekly_menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    week_date DATE NOT NULL, -- Monday of the week
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6 OR day_of_week IS NULL), -- 0=Ma, 6=Zo, NULL=geen dag
    servings INTEGER DEFAULT 4,
    is_completed BOOLEAN DEFAULT false, -- For marking as done in list view
    order_index INTEGER DEFAULT 0, -- For drag & drop ordering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recipe_id, week_date, day_of_week)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_menu_week ON weekly_menu_items(week_date);
CREATE INDEX IF NOT EXISTS idx_weekly_menu_recipe ON weekly_menu_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_weekly_menu_day ON weekly_menu_items(day_of_week);

-- RLS Policies (assuming single-user app for now, can be enhanced for multi-user)
ALTER TABLE weekly_menu_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust based on auth requirements)
CREATE POLICY "Enable all operations for weekly_menu_items" ON weekly_menu_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE weekly_menu_items IS 'Stores recipes assigned to specific days in weekly menus';
COMMENT ON COLUMN weekly_menu_items.week_date IS 'Monday of the week (ISO 8601 week start)';
COMMENT ON COLUMN weekly_menu_items.day_of_week IS '0=Monday, 1=Tuesday, ..., 6=Sunday, NULL=unassigned';
COMMENT ON COLUMN weekly_menu_items.servings IS 'Number of servings for this weekmenu entry';
COMMENT ON COLUMN weekly_menu_items.is_completed IS 'Whether this meal has been completed (for list view checkbox)';
COMMENT ON COLUMN weekly_menu_items.order_index IS 'Order within the day for drag & drop';
