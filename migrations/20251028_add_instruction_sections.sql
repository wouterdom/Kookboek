-- Add instruction sections support
-- This migration adds a new JSONB column to store structured instructions with optional section grouping
-- Backwards compatible: existing recipes continue using content_markdown field

-- Add new column for structured instructions
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS instructions_json JSONB;

-- Create GIN index for efficient JSON queries (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_recipes_instructions_json
ON recipes USING GIN (instructions_json);

-- Add comment for documentation
COMMENT ON COLUMN recipes.instructions_json IS 'Structured instruction steps with optional section grouping. Format: [{"section": "string|null", "step": "string", "order_index": number}]';

-- Note: content_markdown column is preserved for backwards compatibility
-- Display logic will check instructions_json first, then fallback to content_markdown
