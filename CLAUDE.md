# Kookboek - Recipe Book App

## Overview
Digital recipe book for managing and organizing family recipes.

## Tech Stack
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Gemini AI for recipe extraction
- **Deployment**: Self-hosted on Coolify

## Database Schema

### recipes
- id (uuid, pk)
- title (text)
- slug (text, unique)
- description (text)
- content (text) - Markdown instructions
- prep_time (integer)
- cook_time (integer)
- servings (integer)
- difficulty (text)
- image_url (text)
- source (text) - e.g., "Jeroen Meus", "Laura Bakeries"
- created_at (timestamp)
- updated_at (timestamp)

### ingredients
- id (uuid, pk)
- recipe_id (uuid, fk)
- item (text)
- amount (text)
- order (integer)

### categories
- id (uuid, pk)
- name (text, unique)
- slug (text, unique)

### recipe_categories (junction)
- recipe_id (uuid, fk)
- category_id (uuid, fk)

### notes
- id (uuid, pk)
- recipe_id (uuid, fk)
- content (text)
- created_at (timestamp)

## Features
- List/search/filter recipes
- View recipe details with tabs (ingredients, instructions, notes)
- Create recipes manually or import from URL/photos
- Categories and filtering
- Favorites
- Print-friendly view
- Serving size adjustment
- Personal notes per recipe

## Environment Variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY
- GEMINI_API_KEY

## Local Development
```bash
npm run dev  # Start dev server at localhost:3000
```

## Design Reference
See /wireframes for UI mockups

## Deployment
Self-hosted via Coolify with auto-deploy from GitHub
