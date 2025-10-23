# AI Image Generation for PDF Imports

## Overview

When importing recipes from PDF cookbooks, each recipe automatically gets a custom-generated food photo using Google's Gemini 2.5 Flash Image model.

## Model Details

**Model:** `gemini-2.5-flash-image`
**Purpose:** Generate professional food photography for recipes
**Cost:** ~€0.04 per image
**Quality:** High-resolution, restaurant-style presentation

## Implementation

### Location
`app/api/import-pdf/route.ts` → `generateRecipeImage()` function

### Code Example

```typescript
/**
 * Generate a food image using Gemini 2.5 Flash Image model
 *
 * Uses: models/gemini-2.5-flash-image
 * Cost: ~€0.04 per image
 *
 * @param recipeTitle - The title of the recipe (e.g., "Lemon Meringue Taart")
 * @returns URL of the generated image
 */
async function generateRecipeImage(recipeTitle: string): Promise<string | null> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })

  const prompt = `A professional, appetizing photo of ${recipeTitle}. High quality food photography, well-lit, restaurant-style presentation.`

  const result = await model.generateContent(prompt)
  const imageUrl = result.response.text()

  return imageUrl
}
```

## How It Works

### Step-by-Step Process

1. **PDF Import Triggered**
   - User uploads a PDF cookbook
   - Gemini Flash Latest extracts all recipe text

2. **For Each Recipe Found:**
   - Recipe title extracted (e.g., "Chocolade Taart")
   - `generateRecipeImage()` called with title

3. **AI Image Generation:**
   ```
   Input: "Chocolade Taart"
   Prompt: "A professional, appetizing photo of Chocolade Taart.
            High quality food photography, well-lit, restaurant-style presentation."
   Output: URL to generated image
   ```

4. **Save to Database:**
   - Image URL saved in `recipes.image_url`
   - Recipe displayed with custom AI-generated photo

### Prompt Engineering

**Current Prompt Template:**
```
"A professional, appetizing photo of {recipe_title}. High quality food photography, well-lit, restaurant-style presentation."
```

**Why This Works:**
- ✅ Simple and clear
- ✅ Focuses on professional quality
- ✅ Restaurant-style ensures appetizing presentation
- ✅ Well-lit ensures good visibility

**Keywords Used:**
- "professional" → High quality output
- "appetizing" → Makes food look delicious
- "food photography" → Correct style/genre
- "well-lit" → Proper lighting
- "restaurant-style" → Professional presentation

## Examples

### Input → Output

| Recipe Title | Generated Image Description |
|-------------|----------------------------|
| Lemon Meringue Taart | Professional photo of lemon meringue pie with golden peaks |
| Chocolade Brownies | Rich chocolate brownies with fudgy texture |
| Kippenspiesjes met Pindasaus | Chicken skewers with peanut sauce, restaurant plating |
| Pompoensoep | Creamy pumpkin soup in elegant bowl |

## Cost Analysis

### Per Image
- **Generation:** €0.04 per image
- **Storage:** €0.00 (URL stored, not image file)
- **Total:** €0.04

### Per PDF Import

| Recipes Found | Image Cost | Total with Text Extraction |
|--------------|------------|---------------------------|
| 10 recipes | €0.40 | €0.45 |
| 25 recipes | €1.00 | €1.05 |
| 50 recipes | €2.00 | €2.05 |
| 100 recipes | €4.00 | €4.05 |

**Note:** Text extraction (Gemini Flash Latest) is only ~€0.05 per PDF, so images are 95%+ of the cost.

## Error Handling

### Fallback Strategy

```typescript
try {
  // Try to generate AI image
  const imageUrl = await generateRecipeImage(recipeTitle)
  return imageUrl
} catch (error) {
  console.error('AI generation failed:', error)
  // Fallback to generic Unsplash image
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=800'
}
```

### Possible Failures
1. **API Key Invalid:** Falls back to Unsplash
2. **Rate Limit Exceeded:** Falls back to Unsplash
3. **Network Error:** Falls back to Unsplash
4. **Invalid Response:** Falls back to Unsplash

## Configuration

### Environment Variables Required

```env
GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

### Testing Locally

```bash
# Ensure API key is set
echo $GOOGLE_AI_API_KEY

# Start dev server
npm run dev

# Upload a test PDF
# Check console logs for:
# "Generating AI image for: {recipe_title}"
# "Generated image URL for "{recipe_title}": {url}"
```

## Monitoring & Debugging

### Console Logs

The function logs important information:

```typescript
console.log(`Generating AI image for: ${recipeTitle}`)
// Output: Generating AI image for: Lemon Meringue Taart

console.log(`Generated image URL for "${recipeTitle}": ${imageUrl.substring(0, 50)}...`)
// Output: Generated image URL for "Lemon Meringue Taart": https://...
```

### Check Database

```sql
-- View recipes with AI-generated images
SELECT
  title,
  image_url,
  pdf_import_job_id
FROM recipes
WHERE pdf_import_job_id IS NOT NULL
ORDER BY created_at DESC;
```

## Alternative Approaches

### Cost Comparison

| Method | Cost per Image | Pros | Cons |
|--------|---------------|------|------|
| **AI Generated (Current)** | €0.04 | Perfect match, high quality | Expensive at scale |
| Unsplash API | €0.00 | Free, good quality | Generic, not exact match |
| Google Images | €0.005 | Cheap, real photos | Copyright issues |
| No Image | €0.00 | Free | Poor UX, manual work |

### When to Use Each

**AI Generated (Current):**
- ✅ Best for: High-quality imports
- ✅ When: Cost is acceptable
- ✅ Result: Perfect match to recipe

**Switch to Unsplash:**
- ✅ Best for: Cost-conscious approach
- ✅ When: >100 recipes/day
- ✅ Result: Good enough, free

## Future Enhancements

### Planned Improvements

1. **PDF Image Extraction**
   - Extract actual photos from PDF pages
   - Use AI vision to match photos to recipes
   - Only generate AI images if no photo found
   - **Cost Reduction:** Only generate when needed

2. **Image Caching**
   - Cache generated images by recipe title
   - Reuse if same recipe title imported again
   - **Cost Reduction:** Avoid duplicate generations

3. **Batch Generation**
   - Generate all images in parallel
   - Reduce total processing time
   - **Performance:** Faster imports

4. **Quality Settings**
   - User can choose: High/Medium/Low/None
   - Adjust costs based on preference
   - **Flexibility:** User control over costs

## Troubleshooting

### Common Issues

**Issue:** All recipes have same generic image
**Solution:** Check if `generateRecipeImage()` is being called
**Debug:** Look for console logs "Generating AI image for..."

**Issue:** Error: "API key not valid"
**Solution:** Check `GOOGLE_AI_API_KEY` environment variable
**Debug:** `echo $GOOGLE_AI_API_KEY` should show your key

**Issue:** Images not showing in UI
**Solution:** Check `recipes.image_url` in database
**Debug:** Query database to see if URLs are saved

**Issue:** Generation is slow
**Expected:** AI generation takes 2-5 seconds per image
**Solution:** Normal behavior, runs in background

## Summary

✅ **Implemented:** AI-generated food photos for all PDF imports
🎨 **Model:** Gemini 2.5 Flash Image
💰 **Cost:** ~€0.04 per image (~€2 per 50-recipe cookbook)
📊 **Quality:** Professional, restaurant-style food photography
🔄 **Fallback:** Unsplash generic food images if generation fails

**Result:** Each imported recipe gets a beautiful, relevant, AI-generated photo automatically!
