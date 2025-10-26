/**
 * Ingredient Categorizer
 * Auto-categorizes ingredients based on keyword matching
 */

export interface CategoryKeywords {
  slug: string
  keywords: string[]
}

// Keyword mappings for auto-categorization
const CATEGORY_KEYWORDS: CategoryKeywords[] = [
  {
    slug: 'groenten-fruit',
    keywords: [
      'aardappel', 'wortel', 'ui', 'knoflook', 'tomaat', 'paprika', 'courgette',
      'aubergine', 'broccoli', 'bloemkool', 'prei', 'sla', 'andijvie', 'spinazie',
      'appel', 'peer', 'banaan', 'sinaasappel', 'citroen', 'limoen', 'mango',
      'ananas', 'aardbei', 'frambo', 'bes', 'druif', 'perzik', 'abrikoos',
      'komkom', 'radijs', 'rode kool', 'witte kool', 'Chinese kool', 'paddenstoel',
      'champignon', 'shiitake', 'portobello', 'selderij', 'venkel', 'pompoen',
      'biet', 'pastinaak', 'snijbiet', 'rucola', 'veldsla', 'ijsbergsla'
    ]
  },
  {
    slug: 'zuivel-eieren',
    keywords: [
      'melk', 'volle melk', 'halfvolle melk', 'magere melk', 'room', 'slagroom',
      'crème fraîche', 'zure room', 'kwark', 'yoghurt', 'Griekse yoghurt',
      'karnemelk', 'boter', 'margarine', 'kaas', 'geitenkaas', 'brie', 'camembert',
      'mozzarella', 'parmezaan', 'grana padano', 'cheddar', 'gouda', 'edammer',
      'feta', 'hüttenkäse', 'ricotta', 'mascarpone', 'ei', 'eieren', 'eidooier',
      'eiwit'
    ]
  },
  {
    slug: 'brood-bakkerij',
    keywords: [
      'brood', 'wit brood', 'volkoren', 'meergranen', 'stokbrood', 'baguette',
      'ciabatta', 'focaccia', 'pita', 'tortilla', 'wrap', 'naan', 'croissant',
      'krentenbol', 'rozijnenbrood', 'pistolet', 'broodje', 'bolletje', 'bagel',
      'panini', 'toast', 'beschuit', 'knäckebröd', 'rijstwafel', 'crackers'
    ]
  },
  {
    slug: 'vlees-vis',
    keywords: [
      'kip', 'kipfilet', 'kippenbouten', 'kippendij', 'kippenvleugel', 'gehakt',
      'rundergehakt', 'varkensgehakt', 'gemengd gehakt', 'biefstuk', 'entrecote',
      'ossenhaas', 'rosbief', 'varkenshaas', 'speklap', 'spareribs', 'bacon',
      'spek', 'ham', 'salami', 'chorizo', 'worst', 'rookworst', 'braadworst',
      'zalm', 'zalmfilet', 'tonijn', 'kabeljauw', 'schelvis', 'schol', 'tong',
      'forel', 'makreel', 'haring', 'sardine', 'garnaal', 'garnalen', 'gamba',
      'kreeft', 'mosselen', 'inktvis', 'paling', 'vis', 'visfilet'
    ]
  },
  {
    slug: 'pasta-rijst',
    keywords: [
      'pasta', 'spaghetti', 'penne', 'fusilli', 'farfalle', 'tagliatelle',
      'fettuccine', 'lasagne', 'cannelloni', 'ravioli', 'tortellini', 'macaroni',
      'rigatoni', 'linguine', 'orecchiette', 'rijst', 'basmati', 'jasmijn',
      'risotto', 'paella', 'zilvervlies', 'wilde rijst', 'couscous', 'quinoa',
      'bulgur', 'polenta', 'gierst', 'boekweit', 'havermout', 'muesli', 'cornflakes',
      'noedels', 'mihoen', 'bami', 'Chinese noedels', 'Japanse noedels', 'ramen',
      'udon', 'soba'
    ]
  },
  {
    slug: 'conserven',
    keywords: [
      'blik', 'pot', 'conserven', 'tomatenpuree', 'passata', 'gepelde tomaten',
      'tomatensaus', 'ketchup', 'mayonaise', 'mosterd', 'augurken', 'zilveruitjes',
      'kappertjes', 'olijven', 'zongedroogde tomaten', 'ansjovis', 'tonijn in blik',
      'maïs', 'kikkererwten', 'witte bonen', 'bruine bonen', 'kidneybonen',
      'linzen', 'kokosmelk', 'pindakaas', 'notenpasta', 'jam', 'honing', 'siroop',
      'appelstroop', 'hagelslag', 'vlokken', 'pasta saus', 'curry paste',
      'sambal', 'sriracha', 'tabasco', 'worcester', 'sojasaus', 'vissaus',
      'oestersaus', 'teriyakisaus', 'sweet chili', 'hoisin'
    ]
  },
  {
    slug: 'kruiden',
    keywords: [
      'zout', 'peper', 'zwarte peper', 'witte peper', 'paprikapoeder', 'kerrie',
      'kurkuma', 'komijn', 'koriander', 'kaneel', 'nootmuskaat', 'kruidnagel',
      'kardemom', 'gember', 'cayennepeper', 'chilipoeder', 'chilipeper', 'oregano',
      'basilicum', 'tijm', 'rozemarijn', 'salie', 'dragon', 'peterselie', 'bieslook',
      'dille', 'laurier', 'munt', 'verse kruiden', 'Italiaanse kruiden', 'bouillon',
      'groentebouillon', 'kippenbouillon', 'runderbouillon', 'bouillonblokje',
      'gelatine', 'vanille', 'vanillesuiker', 'bakpoeder', 'gist', 'agar', 'azijn',
      'balsamico', 'witte wijn azijn', 'appelazijn', 'rijstazijn'
    ]
  },
  {
    slug: 'dranken',
    keywords: [
      'water', 'spa', 'bronwater', 'mineraalwater', 'bruisend', 'sap', 'sinaasappelsap',
      'appelsap', 'vruchtensap', 'smoothie', 'thee', 'groene thee', 'zwarte thee',
      'kruidenthee', 'koffie', 'espresso', 'cappuccino', 'melk', 'frisdrank', 'cola',
      'fanta', 'sprite', 'seven-up', 'limonade', 'ice tea', 'sportdrank', 'energy drink',
      'wijn', 'rode wijn', 'witte wijn', 'rosé', 'champagne', 'prosecco', 'bier',
      'pils', 'witbier', 'alcoholvrij', 'port', 'sherry', 'likeur', 'cognac', 'whisky'
    ]
  },
  {
    slug: 'diepvries',
    keywords: [
      'diepvries', 'bevroren', 'vriesproduct', 'ijsblokjes', 'ijs', 'ijsje',
      'roomijs', 'sorbet', 'diepvriespizza', 'diepvriesgroenten', 'diepvriesfruit',
      'doperwten', 'sperziebonen', 'spinazie blokje', 'gemengde groenten',
      'wokgroenten', 'friet', 'patat', 'croquetten', 'bitterballen', 'kipnuggets',
      'vissticks', 'garnalen diepvries', 'zalmfilet bevroren'
    ]
  },
  {
    slug: 'schoonmaak',
    keywords: [
      'afwasmiddel', 'vaatwastablet', 'schoonmaakmiddel', 'allesreiniger',
      'keukenrol', 'toiletpapier', 'tissues', 'keukendoeken', 'sponsen', 'dweil',
      'wasmiddel', 'wasverzachter', 'bleek', 'toiletblok', 'wc-eend', 'glasreiniger',
      'zeep', 'handzeep', 'shampoo', 'conditioner', 'douchegel', 'tandpasta',
      'tandenborstel', 'scheerschuim', 'deodorant', 'luiers', 'babyvoeding',
      'hondenvoer', 'kattenvoer', 'kaarsjes', 'batterijen', 'aluminiumfolie',
      'bakpapier', 'huishoudfolie', 'vershoudfolie', 'plastic zakken', 'vuilniszakken'
    ]
  }
]

/**
 * Categorize an ingredient based on keyword matching
 * @param ingredientName - Name of the ingredient
 * @param categories - Available categories with their slugs
 * @returns Category slug or 'overige' if no match
 */
export function categorizeIngredient(
  ingredientName: string,
  categories?: Array<{ slug: string }>
): string {
  if (!ingredientName) return 'overige'

  const normalized = ingredientName.toLowerCase().trim()

  // Try to match keywords
  for (const category of CATEGORY_KEYWORDS) {
    for (const keyword of category.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        // Check if this category exists in the provided categories
        if (categories && !categories.some(c => c.slug === category.slug)) {
          continue
        }
        return category.slug
      }
    }
  }

  return 'overige'
}

/**
 * Get category ID from slug
 * @param slug - Category slug
 * @param categories - Available categories
 * @returns Category ID or null
 */
export function getCategoryIdFromSlug(
  slug: string,
  categories: Array<{ id: string; slug: string }>
): string | null {
  const category = categories.find(c => c.slug === slug)
  return category?.id || null
}

/**
 * Batch categorize multiple ingredients
 * @param ingredients - Array of ingredient names
 * @param categories - Available categories
 * @returns Map of ingredient name to category slug
 */
export function batchCategorize(
  ingredients: string[],
  categories?: Array<{ slug: string }>
): Map<string, string> {
  const result = new Map<string, string>()

  for (const ingredient of ingredients) {
    result.set(ingredient, categorizeIngredient(ingredient, categories))
  }

  return result
}
