
# Product Requirements Document - Kookboek

## Tech Stack Architecture

### Frontend Stack
**Next.js 15 (App Router)**
- React 19+ framework with Server Components
- File-based routing in `/app` directory
- Server Actions for mutations
- Built-in image optimization

**TypeScript**
- Type-safe development
- Database types auto-generated from Supabase

**Tailwind CSS**
- Utility-first CSS framework
- Custom design system (no preset themes)
- Responsive design utilities

### Backend Stack
**Supabase (Self-Hosted)**
- PostgreSQL database
- Row Level Security (RLS) policies
- Authentication (optional for future)
- Storage for recipe images

**Database Access**
- Direct connection: `postgresql://postgres:[password]@192.168.1.63:5432/postgres`
- API: `http://192.168.1.63:8000`
- Studio: `https://supabase.homelab.local`

### AI Integration
**Gemini AI**
- Model: `models/gemini-flash-lite-latest`
- Purpose: Extract recipe data from URLs and photos
- Input: URL or images (up to 10 photos)
- Output: Structured recipe JSON

### Development Tools
- **npm**: Package management
- **Git**: Version control
- **MCP**: Claude has direct DB access via MCP server

### Deployment
**Coolify**
- Self-hosted on home server
- Auto-deploy on git push to main
- Environment variables managed in Coolify
- Nginx Proxy Manager for SSL/domains

## Data Flow

### Recipe Import Flow
1. User provides URL or uploads photos
2. Frontend sends to `/api/import` endpoint
3. Server calls Gemini AI with URL/images
4. AI returns structured JSON (title, ingredients, instructions, etc.)
5. Server validates and inserts into Supabase
6. Returns recipe ID
7. Frontend redirects to recipe detail page

### Recipe Display Flow
1. Server Component fetches recipe from Supabase
2. Renders with Server-Side Rendering (SSR)
3. Client-side JavaScript for interactive features:
   - Tab switching
   - Serving size adjustment
   - Ingredient checkboxes
   - Notes editing

### Image Storage
1. User uploads image during recipe creation
2. Upload to Supabase Storage bucket `recipe-images`
3. Get public URL
4. Store URL in `recipes.image_url`

## Key Technical Decisions

### Why Next.js 15?
- Server Components reduce client bundle size
- Built-in optimizations (images, fonts)
- Server Actions simplify data mutations
- Best React framework for production

### Why Supabase?
- Open source, self-hostable
- PostgreSQL (robust, SQL)
- Built-in auth and storage
- Real-time subscriptions (future feature)

### Why Gemini AI?
- Multimodal (text + images)
- Fast and affordable
- Good at structured data extraction
- Handles multiple photos

### Why Tailwind?
- Rapid UI development
- No CSS files to manage
- Easy responsive design
- Full customization freedom

### Why Self-Hosted?
- Data ownership
- No monthly fees
- Learning DevOps
- Full control

## File Structure
```
kookboek/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage (recipe list)
│   ├── recipes/
│   │   ├── [slug]/
│   │   │   └── page.tsx   # Recipe detail
│   │   └── new/
│   │       └── page.tsx   # Create recipe
│   └── api/
│       └── import/
│           └── route.ts   # AI import endpoint
├── components/            # React components
│   ├── recipe-card.tsx
│   ├── recipe-form.tsx
│   └── import-dialog.tsx
├── lib/
│   ├── supabase.ts       # Supabase client
│   └── gemini.ts         # Gemini AI client
├── types/
│   └── database.ts       # TypeScript types
├── public/               # Static assets
├── wireframes/           # UI mockups
├── .env.local            # Environment variables
└── package.json
```

## API Endpoints

### `POST /api/import`
Import recipe from URL or photos
```typescript
// Request
{
  url?: string
  photos?: File[]
}

// Response
{
  success: boolean
  recipeId?: string
  error?: string
}
```

### Database Queries
Direct queries via Supabase client - no REST API needed for most operations.

## Styling Philosophy
- **Custom design**, not preset themes
- Reference wireframes in `/wireframes` for exact UI
- Use Tailwind utilities for styling
- No shadcn/ui or component libraries
- Custom components built from scratch

## Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile-first responsive design
