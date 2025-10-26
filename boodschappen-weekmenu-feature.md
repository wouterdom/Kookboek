# 📋 Boodschappenlijst & Weekmenu Feature - Complete Implementation Guide

## 📌 Executive Summary

Deze feature voegt twee nieuwe hoofdsecties toe aan de Kookboek app:
1. **Boodschappenlijst** - Georganiseerde checklist met categorieën voor efficiënt winkelen
2. **Weekmenu** - Weekplanning voor recepten met drag & drop functionaliteit

De features zijn nauw geïntegreerd: recepten worden via een bookmark icoon aan het weekmenu toegevoegd, waarbij gebruikers selecteren welke ingrediënten naar de boodschappenlijst gaan. **Geen automatische synchronisatie** - gebruikers hebben volledige controle.

---

## 🏗️ Architecture Overview

### Data Flow
```
Recipe → [Bookmark Click] → Weekmenu → [Ingredient Selection Popup] → Boodschappenlijst
                                ↑                                           ↓
                          [Week Clear/Remove]                      [Check/Delete Items]
```

### State Management
- **Weekmenu Status**: Tracked in `weekly_menu_items` table
- **Bookmark State**: Computed from weekmenu presence (no separate field)
- **Ingredient Sync**: Manual via selection popup (not automatic)
- **Servings**: Adjustable per weekmenu item AND in popup

---

## 💾 Database Schema

### New Tables

```sql
-- Boodschappencategorieën (combinatie standaard + custom)
CREATE TABLE grocery_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT '📦',
    color TEXT DEFAULT '#6B7280',
    order_index INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false, -- true voor standaard categorieën
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Boodschappenlijst items
CREATE TABLE grocery_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    amount TEXT, -- "400g", "2 stuks", etc.
    original_amount TEXT, -- Voor tracking aanpassingen
    category_id UUID REFERENCES grocery_categories(id) ON DELETE SET NULL,
    is_checked BOOLEAN DEFAULT false,
    from_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    from_weekmenu_id UUID REFERENCES weekly_menu_items(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekmenu planning
CREATE TABLE weekly_menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    week_date DATE NOT NULL, -- Maandag van de week
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Ma, 6=Zo, NULL=geen dag
    servings INTEGER DEFAULT 4,
    is_completed BOOLEAN DEFAULT false, -- Voor afvinken in lijst view
    order_index INTEGER DEFAULT 0, -- Voor drag & drop volgorde
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recipe_id, week_date, day_of_week)
);

-- Index voor performance
CREATE INDEX idx_weekly_menu_week ON weekly_menu_items(week_date);
CREATE INDEX idx_weekly_menu_recipe ON weekly_menu_items(recipe_id);
CREATE INDEX idx_grocery_items_checked ON grocery_items(is_checked);
```

### Seed Data - Default Categories

```sql
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
    ('Overige', 'overige', '➕', '#9CA3AF', 99, true);
```

---

## 🎯 Key Features & Implementation

### 1. Navigation Dropdown

**Location**: Main header
**Implementation**:
```typescript
// components/navigation-dropdown.tsx
type Section = 'recipes' | 'groceries' | 'weekmenu';

const NavigationDropdown = ({ currentSection }: { currentSection: Section }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {getSectionLabel(currentSection)} <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem href="/">
          <BookOpen /> Recepten
        </DropdownMenuItem>
        <DropdownMenuItem href="/boodschappen">
          <ShoppingCart /> Boodschappenlijst
          {uncheckedCount > 0 && <Badge>{uncheckedCount}</Badge>}
        </DropdownMenuItem>
        <DropdownMenuItem href="/weekmenu">
          <Calendar /> Weekmenu
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

### 2. Recipe Card Bookmark Icon

**Location**: Recipe cards (grid & detail view)
**Visual**: Bookmark icon next to heart icon
**States**:
- Outline = not in weekmenu
- Filled = in weekmenu

```typescript
// components/recipe-card.tsx
const RecipeCard = ({ recipe }: { recipe: Recipe }) => {
  const [isInWeekMenu, setIsInWeekMenu] = useState(false);

  useEffect(() => {
    // Check if recipe is in current week menu
    checkWeekMenuStatus(recipe.id);
  }, [recipe.id]);

  const handleBookmarkClick = async () => {
    if (isInWeekMenu) {
      // Remove from weekmenu
      await removeFromWeekMenu(recipe.id);
      setIsInWeekMenu(false);
    } else {
      // Add to weekmenu and show ingredient popup
      await addToWeekMenu(recipe.id);
      setIsInWeekMenu(true);
      showIngredientSelectionPopup(recipe);
    }
  };

  return (
    <Card>
      {/* ... other content ... */}
      <Button onClick={handleFavoriteClick}>
        <Heart className={isFavorite ? "fill-primary" : ""} />
      </Button>
      <Button onClick={handleBookmarkClick}>
        <Bookmark className={isInWeekMenu ? "fill-primary" : ""} />
      </Button>
      {isInWeekMenu && <Badge>In weekmenu</Badge>}
    </Card>
  );
};
```

### 3. Ingredient Selection Popup

**Trigger**: After bookmark click
**Key Features**:
- Servings adjuster (affects all amounts)
- Individual amount editing
- Nothing selected by default
- "was X" indicator for changed amounts

```typescript
// components/ingredient-selection-popup.tsx
interface IngredientSelectionProps {
  recipe: Recipe;
  onConfirm: (items: GroceryItem[]) => void;
  onCancel: () => void;
}

const IngredientSelectionPopup = ({ recipe, onConfirm, onCancel }) => {
  const [servings, setServings] = useState(recipe.servings_default);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [adjustedAmounts, setAdjustedAmounts] = useState<Map<string, string>>(new Map());

  const handleServingsChange = (newServings: number) => {
    const ratio = newServings / recipe.servings_default;
    setServings(newServings);

    // Update all amounts based on ratio
    recipe.ingredients.forEach(ing => {
      const newAmount = calculateNewAmount(ing.amount, ratio);
      setAdjustedAmounts(prev => new Map(prev).set(ing.id, newAmount));
    });
  };

  const handleAmountChange = (ingredientId: string, newAmount: string) => {
    setAdjustedAmounts(prev => new Map(prev).set(ingredientId, newAmount));
  };

  const handleConfirm = () => {
    const itemsToAdd = recipe.ingredients
      .filter(ing => selectedIngredients.has(ing.id))
      .map(ing => ({
        name: ing.item,
        amount: adjustedAmounts.get(ing.id) || ing.amount,
        original_amount: ing.amount,
        category_id: categorizeIngredient(ing.item), // AI or mapping
        from_recipe_id: recipe.id
      }));

    onConfirm(itemsToAdd);
  };

  return (
    <Modal>
      <ModalHeader>
        <BookmarkCheck /> Recept toegevoegd aan weekmenu!
        <p>Selecteer ingrediënten voor je boodschappenlijst</p>
      </ModalHeader>

      <ModalBody>
        {/* Recipe info with servings adjuster */}
        <div className="recipe-info">
          <img src={recipe.image_url} />
          <h3>{recipe.title}</h3>
          <ServingsAdjuster value={servings} onChange={handleServingsChange} />
        </div>

        {/* Ingredient list with checkboxes and editable amounts */}
        {recipe.ingredients.map(ing => (
          <div key={ing.id} className="ingredient-item">
            <Checkbox
              checked={selectedIngredients.has(ing.id)}
              onCheckedChange={(checked) => {
                if (checked) selectedIngredients.add(ing.id);
                else selectedIngredients.delete(ing.id);
                setSelectedIngredients(new Set(selectedIngredients));
              }}
            />
            <Input
              value={adjustedAmounts.get(ing.id) || ing.amount}
              onChange={(e) => handleAmountChange(ing.id, e.target.value)}
              className="w-20"
            />
            <span>{ing.item}</span>
            {adjustedAmounts.get(ing.id) !== ing.amount && (
              <span className="text-muted">was {ing.amount}</span>
            )}
          </div>
        ))}
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onCancel}>Overslaan</Button>
        <Button onClick={handleConfirm} disabled={selectedIngredients.size === 0}>
          Toevoegen ({selectedIngredients.size})
        </Button>
      </ModalFooter>
    </Modal>
  );
};
```

### 4. Weekmenu Page

**Features**:
- Week navigation (previous/next)
- Drag & drop between days
- View toggle (Week/List)
- Servings per recipe
- "Geen dag" section

```typescript
// app/weekmenu/page.tsx
const WeekMenuPage = () => {
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekMonday());
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');
  const [weekMenuItems, setWeekMenuItems] = useState<WeekMenuItem[]>([]);

  const handleDragDrop = async (itemId: string, newDay: number | null) => {
    await updateWeekMenuItem(itemId, { day_of_week: newDay });
    refreshWeekMenu();
  };

  const handleRemove = async (itemId: string) => {
    await removeWeekMenuItem(itemId);
    refreshWeekMenu();
    // Update recipe bookmark state
    updateRecipeBookmarkState(itemId, false);
  };

  const handleClearWeek = async () => {
    if (confirm('Weet je zeker dat je het hele weekmenu wilt legen?')) {
      await clearWeekMenu(currentWeek);
      refreshWeekMenu();
      // Update all recipe bookmark states
      updateAllRecipeBookmarkStates(false);
    }
  };

  const handleServingsChange = async (itemId: string, servings: number) => {
    await updateWeekMenuItem(itemId, { servings });
  };

  const handleComplete = async (itemId: string, completed: boolean) => {
    await updateWeekMenuItem(itemId, { is_completed: completed });
  };

  return (
    <div>
      {/* View Toggle in Header */}
      <ViewToggle value={viewMode} onChange={setViewMode} />

      {/* Week Navigation */}
      <WeekNavigation
        currentWeek={currentWeek}
        onPrevious={() => setCurrentWeek(addWeeks(currentWeek, -1))}
        onNext={() => setCurrentWeek(addWeeks(currentWeek, 1))}
      />

      {viewMode === 'week' ? (
        <WeekView
          items={weekMenuItems}
          onDragDrop={handleDragDrop}
          onRemove={handleRemove}
          onServingsChange={handleServingsChange}
        />
      ) : (
        <ListView
          items={weekMenuItems}
          onComplete={handleComplete}
          onDragDrop={handleDragDrop}
        />
      )}

      {/* Action Buttons */}
      <Button onClick={() => copyWeekToNext(currentWeek)}>
        <Copy /> Kopieer naar volgende week
      </Button>
      <Button onClick={handleClearWeek} variant="destructive">
        <Trash /> Week legen
      </Button>
      <Button onClick={syncToGroceries} variant="primary">
        <ShoppingCart /> Naar boodschappen
      </Button>
    </div>
  );
};
```

### 5. Boodschappenlijst Page

**Features**:
- Categories (editable, even system ones)
- View toggle (Expanded/Compact)
- Manual item add
- Automatic aggregation
- Sync from weekmenu

```typescript
// app/boodschappen/page.tsx
const GroceryListPage = () => {
  const [viewMode, setViewMode] = useState<'expanded' | 'compact'>('expanded');
  const [categories, setCategories] = useState<GroceryCategory[]>([]);
  const [items, setItems] = useState<GroceryItem[]>([]);

  const handleCheck = async (itemId: string, checked: boolean) => {
    await updateGroceryItem(itemId, { is_checked: checked });
    refreshItems();
  };

  const handleAddItem = async (item: Partial<GroceryItem>) => {
    await addGroceryItem({
      ...item,
      category_id: item.category_id || categorizeItem(item.name)
    });
    refreshItems();
  };

  const handleClearList = async (mode: 'checked' | 'all') => {
    if (mode === 'checked') {
      await clearCheckedItems();
    } else {
      await clearAllItems();
    }
    refreshItems();
  };

  const handleSyncWeekMenu = async () => {
    const weekMenuItems = await getWeekMenuWithIngredients();
    // Show selection popup for new items only
    const existingItems = await getExistingGroceryItems();
    const newItems = filterNewItems(weekMenuItems, existingItems);

    if (newItems.length > 0) {
      showSyncSelectionPopup(newItems, async (selected) => {
        await addBulkGroceryItems(selected);
        refreshItems();
      });
    }
  };

  const handleCategoryUpdate = async (categoryId: string, updates: Partial<GroceryCategory>) => {
    await updateCategory(categoryId, updates);
    refreshCategories();
  };

  return (
    <div>
      {/* View Toggle in Header */}
      <ViewToggle value={viewMode} onChange={setViewMode} />

      {/* Action Buttons */}
      <div className="action-bar">
        <Button onClick={handleSyncWeekMenu}>
          <RefreshCw /> Sync Weekmenu
        </Button>
        <Button onClick={() => handleClearList('all')} variant="destructive">
          <Trash /> Lijst Legen
        </Button>
        <Button onClick={() => showCategoryModal()}>
          <Settings /> Categorieën
        </Button>
      </div>

      {viewMode === 'expanded' ? (
        <ExpandedView
          categories={categories}
          items={items}
          onCheck={handleCheck}
          onAddItem={handleAddItem}
        />
      ) : (
        <CompactView
          items={items}
          onCheck={handleCheck}
        />
      )}

      {/* Floating Action Button (mobile) */}
      <FAB onClick={() => showAddItemModal()}>
        <Plus />
      </FAB>
    </div>
  );
};
```

---

## 🔄 Critical State Synchronization

### Bookmark State Management

**CRITICAL**: The bookmark icon state must be synchronized across all views:

```typescript
// When adding to weekmenu
const addToWeekMenu = async (recipeId: string) => {
  const weekMenuItem = await createWeekMenuItem({
    recipe_id: recipeId,
    week_date: getCurrentWeekMonday()
  });

  // Update UI state in all mounted components
  eventBus.emit('weekmenu:added', { recipeId, weekMenuItem });

  return weekMenuItem;
};

// When removing from weekmenu (individual or clear all)
const removeFromWeekMenu = async (recipeId: string) => {
  await deleteWeekMenuItem(recipeId);

  // Update UI state - bookmark should revert to outline
  eventBus.emit('weekmenu:removed', { recipeId });
};

// In Recipe Card component
useEffect(() => {
  const handleWeekMenuChange = ({ recipeId, added }) => {
    if (recipeId === recipe.id) {
      setIsInWeekMenu(added);
    }
  };

  eventBus.on('weekmenu:added', (e) => handleWeekMenuChange({ ...e, added: true }));
  eventBus.on('weekmenu:removed', (e) => handleWeekMenuChange({ ...e, added: false }));

  return () => {
    eventBus.off('weekmenu:added');
    eventBus.off('weekmenu:removed');
  };
}, [recipe.id]);
```

### Ingredient Aggregation Logic

```typescript
const aggregateIngredients = (items: GroceryItem[]): GroceryItem[] => {
  const aggregated = new Map<string, GroceryItem>();

  items.forEach(item => {
    const key = normalizeIngredientName(item.name);

    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      existing.amount = combineAmounts(existing.amount, item.amount);
      existing.from_recipe_id = null; // Multiple sources
    } else {
      aggregated.set(key, { ...item });
    }
  });

  return Array.from(aggregated.values());
};

const combineAmounts = (a1: string, a2: string): string => {
  // Parse and combine: "400g" + "200g" = "600g"
  // "2 stuks" + "3 stuks" = "5 stuks"
  // Complex: return as "400g + 200g"
};
```

---

## 🎨 UI/UX Requirements

### View Toggles

All list views have consistent toggle buttons in header:
```tsx
<ViewToggle>
  <ViewToggleButton active={view === 'expanded'}>
    <LayoutGrid /> Uitgebreid
  </ViewToggleButton>
  <ViewToggleButton active={view === 'compact'}>
    <List /> Compact
  </ViewToggleButton>
</ViewToggle>
```

### Mobile Responsiveness

- **Mobile**: Compact/List view by default
- **Desktop**: Expanded/Week view by default
- **Breakpoint**: 768px

### Drag & Drop (Weekmenu)

Desktop: Native HTML5 drag & drop
Mobile: Long press to activate drag mode

```typescript
const useDragDrop = () => {
  const [draggedItem, setDraggedItem] = useState(null);

  // Desktop
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('item', JSON.stringify(item));
    setDraggedItem(item);
  };

  // Mobile
  const handleLongPress = useLongPress((item) => {
    setDraggedItem(item);
    // Visual feedback
  });

  return { handleDragStart, handleLongPress, draggedItem };
};
```

---

## 📝 API Endpoints

### Weekmenu Endpoints

```typescript
// GET /api/weekmenu?week=2025-01-20
// Returns all items for specified week (Monday date)

// POST /api/weekmenu
// Body: { recipe_id, day_of_week?, servings? }

// PUT /api/weekmenu/:id
// Body: { day_of_week?, servings?, is_completed? }

// DELETE /api/weekmenu/:id

// DELETE /api/weekmenu/clear?week=2025-01-20

// POST /api/weekmenu/copy
// Body: { from_week, to_week }
```

### Grocery Endpoints

```typescript
// GET /api/groceries
// Returns all items grouped by category

// POST /api/groceries
// Body: { name, amount, category_id }

// PUT /api/groceries/:id
// Body: { is_checked?, amount?, category_id? }

// DELETE /api/groceries/:id

// DELETE /api/groceries/clear?mode=checked|all

// POST /api/groceries/sync
// Body: { weekmenu_items: [...] }
// Returns items to be added (for selection)

// GET /api/groceries/categories

// PUT /api/groceries/categories/:id
// Body: { name?, color?, order_index? }

// POST /api/groceries/categories
// Body: { name, color, icon? }
```

---

## 🚀 Implementation Phases

### Phase 1: Database & Backend (Week 1)
1. Create migration files
2. Seed default categories
3. Implement API endpoints
4. Add Supabase RLS policies

### Phase 2: Navigation & Core UI (Week 1)
1. Navigation dropdown component
2. Route setup (`/boodschappen`, `/weekmenu`)
3. View toggle component
4. Mobile responsiveness

### Phase 3: Weekmenu Features (Week 2)
1. Bookmark icon on recipe cards
2. Add to weekmenu logic
3. Ingredient selection popup
4. Weekmenu page with drag & drop
5. Week navigation
6. List view with checkboxes

### Phase 4: Boodschappenlijst Features (Week 2-3)
1. Category management
2. Manual item add
3. Check/uncheck logic
4. Expanded vs compact view
5. Sync from weekmenu
6. Aggregation logic

### Phase 5: Polish & Testing (Week 3)
1. State synchronization
2. Error handling
3. Loading states
4. Print functionality
5. Export options
6. Performance optimization

---

## ⚠️ Critical Implementation Notes

### 1. No Automatic Sync
**IMPORTANT**: Ingrediënten worden NIET automatisch toegevoegd aan boodschappenlijst. Altijd via selectie popup.

### 2. Bookmark State
Bookmark is afgeleide state van weekmenu presence. Geen aparte `is_bookmarked` field in database.

### 3. Week Definition
Week begint op maandag. Gebruik `week_date` als maandag van die week.

### 4. Category Flexibility
Zelfs systeem categorieën kunnen hernoemd/verplaatst worden door gebruiker.

### 5. Servings Cascade
Servings aanpassen in popup beïnvloedt alle hoeveelheden proportioneel.

### 6. Cleanup on Remove
Bij verwijderen uit weekmenu:
- Update bookmark state
- Optioneel: vraag om gerelateerde boodschappen te verwijderen

---

## 🧪 Testing Scenarios

### User Flow 1: Complete Weekly Planning
1. User bookmarks 5 recipes for the week
2. Adjusts servings in popup (4 → 2)
3. Selects only missing ingredients
4. Drags recipes to different days
5. Checks off completed meals
6. Clears week → all bookmarks reset

### User Flow 2: Grocery Shopping
1. Sync from weekmenu
2. Add manual items
3. Reorder categories
4. Check items while shopping
5. Clear checked items
6. Print remaining items

### Edge Cases
- Recipe removed while in weekmenu
- Duplicate recipes in same week
- Category deleted with items
- Offline grocery checking
- Week transition (Sunday → Monday)

---

## 📊 Success Metrics

- User can plan week in < 5 minutes
- 80% ingredient categorization accuracy
- < 1s load time for lists
- Zero data loss on sync
- Mobile gesture success rate > 95%

---

## 🔧 Configuration

### Environment Variables
```env
# Feature Flags
NEXT_PUBLIC_FEATURE_WEEKMENU=true
NEXT_PUBLIC_FEATURE_GROCERIES=true

# AI Categorization (optional)
GEMINI_API_KEY=xxx
```

### Feature Toggles
```typescript
const features = {
  weekMenu: process.env.NEXT_PUBLIC_FEATURE_WEEKMENU === 'true',
  groceries: process.env.NEXT_PUBLIC_FEATURE_GROCERIES === 'true'
};
```

---

## 📚 References

- User Stories: `/user-stories/boodschappen-weekmenu-features.md`
- Wireframes: `/wireframes/`
  - `navigation-dropdown.html`
  - `boodschappenlijst.html`
  - `weekmenu.html`
  - `ingredient-selection-popup.html`
  - `recipe-card-with-bookmark.html`
- Database Schema: `/migrations/`
- Component Library: Existing shadcn/ui components

---

## 🎯 Definition of Done

- [ ] All database migrations applied
- [ ] API endpoints return correct data
- [ ] Bookmark state syncs across views
- [ ] Drag & drop works on desktop and mobile
- [ ] View toggles persist preference
- [ ] Ingredient aggregation works correctly
- [ ] Categories can be managed by user
- [ ] Print view generates correctly
- [ ] No console errors
- [ ] Lighthouse score > 90
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Documentation updated

---

Dit document bevat alle informatie die een developer nodig heeft om de volledige boodschappenlijst en weekmenu feature te implementeren, van database tot UI, met alle edge cases en synchronisatie logica.