# Claude Context - Kookboek (Recipe Book)

## Project Overview

**What:** Digital recipe book web application
**Stack:** Next.js 15 + TypeScript + shadcn/ui + Supabase
**Goal:** Learn full-stack development while building practical app
**Deployment:** Self-hosted on home server via Coolify

---

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS** - Styling (comes with shadcn)

### Backend
- **Supabase** - Self-hosted backend (database + auth + storage)
- **PostgreSQL** - Database for recipes
- **Markdown** - Recipe content format

### Deployment
- **Coolify** - Self-hosted deployment platform
- **GitHub** - Version control and CI/CD
- **Nginx Proxy Manager** - Reverse proxy with SSL

---

## Database Schema

### Tables

**recipes**
- `id` (uuid, primary key)
- `title` (text)
- `slug` (text, unique)
- `description` (text)
- `content` (text) - Markdown recipe instructions
- `prep_time` (integer) - minutes
- `cook_time` (integer) - minutes
- `servings` (integer)
- `difficulty` (text) - easy/medium/hard
- `image_url` (text) - recipe photo
- `created_at` (timestamp)
- `updated_at` (timestamp)

**categories**
- `id` (uuid, primary key)
- `name` (text, unique)
- `slug` (text, unique)

**recipe_categories** (junction table)
- `recipe_id` (uuid)
- `category_id` (uuid)

**ingredients**
- `id` (uuid, primary key)
- `recipe_id` (uuid, foreign key)
- `item` (text) - e.g., "flour"
- `amount` (text) - e.g., "2 cups"
- `order` (integer) - display order

---

## Features Roadmap

### Phase 1: MVP (Basic CRUD)
- [x] Database schema
- [ ] List all recipes (homepage)
- [ ] View single recipe
- [ ] Create recipe with markdown editor
- [ ] Edit recipe
- [ ] Delete recipe
- [ ] Upload recipe images

### Phase 2: Enhanced UX
- [ ] Categories and filtering
- [ ] Search recipes by title/ingredient
- [ ] Recipe cards with images
- [ ] Responsive design (mobile-first)
- [ ] Print-friendly recipe view

### Phase 3: Advanced Features
- [ ] User authentication (family members)
- [ ] Favorite recipes
- [ ] Recipe ratings/reviews
- [ ] Shopping list generator
- [ ] Meal planner

---

## Development Workflow

### Local Development
```bash
# Run dev server
npm run dev

# Access at
http://localhost:3000
```

### Database Access
- **Studio:** https://supabase.homelab.local
- **API:** http://192.168.1.63:8000
- **MCP:** Claude has direct database access via MCP server

### Deployment
1. Push to GitHub
2. Coolify auto-deploys
3. Access via custom domain

---

## How Claude Will Help

### 1. Setup & Configuration
- Generate database schema and migrations
- Configure Supabase client
- Set up shadcn/ui components
- Create environment variables

### 2. Development
- Build React components
- Write SQL queries and migrations
- Implement CRUD operations
- Add markdown editor integration
- Style with Tailwind/shadcn

### 3. Best Practices
- Type-safe database queries
- Server vs client components
- Error handling
- Loading states
- Form validation

### 4. Deployment
- Configure Coolify
- Set up environment variables
- Deploy to production
- Troubleshoot issues

---

## File Structure

```
kookboek/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage (recipe list)
│   ├── recipes/
│   │   ├── [slug]/
│   │   │   └── page.tsx   # Recipe detail page
│   │   └── new/
│   │       └── page.tsx   # Create recipe
│   └── api/               # API routes (server-side)
├── components/            # React components
│   ├── ui/               # shadcn components
│   ├── recipe-card.tsx
│   ├── recipe-form.tsx
│   └── markdown-editor.tsx
├── lib/
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Helper functions
├── types/
│   └── database.ts       # TypeScript types
└── public/               # Static assets
```

---

## Environment Variables

**.env.local** (local development)
```bash
NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.63:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

**.env.production** (Coolify)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://supabase.homelab.local
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## Learning Goals

1. **Next.js App Router** - Modern React patterns
2. **TypeScript** - Type-safe development
3. **Supabase** - Backend-as-a-service
4. **SQL** - Database design and queries
5. **shadcn/ui** - Component library usage
6. **Markdown** - Content management
7. **Git** - Version control
8. **Coolify** - Self-hosted deployments

---

## Related Documentation

- **Server Access:** See `SERVER-ACCESS.md`
- **Supabase Setup:** See `SUPABASE-CONNECTION.md`
- **Coolify Deployment:** See `COOLIFY-DEPLOYMENT.md`
- **Supabase MCP:** See `../Server setup/5-Services-Deployment/supabase/SUPABASE-MCP-SETUP.md`

---

**Last Updated:** January 2025
**Project Start:** January 2025
**Status:** Phase 1 - Setting up infrastructure
