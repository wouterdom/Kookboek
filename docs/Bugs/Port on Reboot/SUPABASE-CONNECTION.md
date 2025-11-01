⚠️ **SECURITY**: Never commit actual API keys. See .env.local for actual values.

---

# Supabase Connection Guide

## Your Supabase Instance

**Studio URL:** https://supabase.homelab.local
**API URL:** http://192.168.1.63:8000
**Database:** PostgreSQL 15
**Status:** ✅ Running (19 containers)

---

## Credentials

### Public (Safe for Client-Side)

```bash
NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.63:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=[see .env.local for NEXT_PUBLIC_SUPABASE_ANON_KEY]
```

### Private (Server-Side Only!)

```bash
SUPABASE_SERVICE_ROLE_KEY=[see .env.local for SUPABASE_SERVICE_ROLE_KEY]

DATABASE_URL=postgresql://postgres:[see .env.local for DATABASE_PASSWORD]@192.168.1.63:5432/postgres

JWT_SECRET=[see .env.local for JWT_SECRET]
```

**⚠️ NEVER commit these to GitHub! Use `.env.local` and add to `.gitignore`**

---

## Setup in Next.js

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Create `.env.local`

```bash
# .env.local (add to .gitignore!)
NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.63:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=[see .env.local for NEXT_PUBLIC_SUPABASE_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[see .env.local for SUPABASE_SERVICE_ROLE_KEY]
```

### 3. Create Supabase Client (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

// Client-side client (safe for browser)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server-side client (admin privileges)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## Usage Examples

### Fetch Recipes (Client-Side)

```typescript
import { supabase } from '@/lib/supabase'

// Get all recipes
const { data: recipes, error } = await supabase
  .from('recipes')
  .select('*')
  .order('created_at', { ascending: false })

// Get single recipe
const { data: recipe, error } = await supabase
  .from('recipes')
  .select('*, ingredients(*), categories(*)')
  .eq('slug', 'spaghetti-carbonara')
  .single()
```

### Insert Recipe (Client-Side)

```typescript
const { data, error } = await supabase
  .from('recipes')
  .insert({
    title: 'Spaghetti Carbonara',
    slug: 'spaghetti-carbonara',
    description: 'Classic Italian pasta',
    content: '## Ingredients\n\n...',
    prep_time: 10,
    cook_time: 15,
    servings: 4,
    difficulty: 'easy'
  })
  .select()
  .single()
```

### Upload Recipe Image

```typescript
const file = event.target.files[0]

const { data, error } = await supabase.storage
  .from('recipe-images')
  .upload(`${recipeSlug}/${file.name}`, file)

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('recipe-images')
  .getPublicUrl(`${recipeSlug}/${file.name}`)
```

---

## Database Access

### Via Supabase Studio
1. Open https://supabase.homelab.local
2. Navigate to "Table Editor"
3. Create/view/edit tables manually

### Via SQL Editor
1. Open Studio → SQL Editor
2. Write SQL queries directly
3. Run migrations

### Via Claude Code MCP
Claude can directly query/modify your database:
- "List all tables"
- "Show me the recipes table structure"
- "Create a new table for categories"
- "Generate TypeScript types from schema"

---

## Generate TypeScript Types

```bash
# Using MCP (recommended)
# Claude can do this: "Generate TypeScript types from my database"

# Or manually:
npx supabase gen types typescript --db-url "[see .env.local for DATABASE_URL]" > types/database.ts
```

Then use in your code:
```typescript
import { Database } from '@/types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']
type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
```

---

## Storage Buckets

### Create Recipe Images Bucket

Via Studio or SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true);
```

### Set Public Access Policy

```sql
CREATE POLICY "Public recipe images"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipe-images'
  AND auth.role() = 'authenticated'
);
```

---

## Troubleshooting

### Can't connect to Supabase

```bash
# Check Supabase is running
ssh wouter@192.168.1.63 "docker ps | grep supabase"

# Check API is responding
curl http://192.168.1.63:8000/rest/v1/
```

### CORS errors

Supabase should allow all origins by default in self-hosted setup.
If issues persist, check `.env` file on server for `API_EXTERNAL_URL`.

### Database connection issues

```bash
# Test database directly
psql "[see .env.local for DATABASE_URL]"
```

---

## Security Best Practices

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use anon key in client** - It's limited by Row Level Security
3. **Use service key in API routes** - Never expose to client
4. **Enable Row Level Security** - Protect your data
5. **Use environment variables** - No hardcoded credentials

---

## Resources

- **Supabase Docs:** https://supabase.com/docs
- **JS Client Docs:** https://supabase.com/docs/reference/javascript
- **SQL Reference:** https://supabase.com/docs/guides/database
- **Your Studio:** https://supabase.homelab.local

---

**Last Updated:** January 2025
