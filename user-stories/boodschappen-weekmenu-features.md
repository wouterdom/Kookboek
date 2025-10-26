# User Stories: Boodschappenlijst & Weekmenu Features

## 📋 Overzicht
Dit document beschrijft de user stories voor de nieuwe boodschappenlijst en weekmenu functionaliteiten in de Kookboek applicatie.

## 🎯 Hoofddoelen
1. **Boodschappenlijst**: Een georganiseerde checklist voor boodschappen met categorieën
2. **Weekmenu**: Planning van recepten per week met flexibele dag-toewijzing
3. **Slimme Integratie**: Selectieve synchronisatie van ingrediënten naar boodschappenlijst

---

## 🗂️ Epic 1: Navigatie Uitbreiding

### User Story 1.1: Dropdown Navigatie
**Als** gebruiker
**Wil ik** via een dropdown in de header kunnen schakelen tussen Recepten, Boodschappenlijst en Weekmenu
**Zodat** ik snel kan navigeren tussen de verschillende secties van de app

**Acceptatiecriteria:**
- [ ] "Recepten" tekst in header wordt dropdown met pijltje
- [ ] Dropdown toont 3 opties: Recepten, Boodschappenlijst, Weekmenu
- [ ] Huidige sectie is visueel gemarkeerd in dropdown
- [ ] Navigatie behoudt scroll positie bij terugkeer

---

## 🛒 Epic 2: Boodschappenlijst

### User Story 2.1: Boodschappenlijst Weergave
**Als** gebruiker
**Wil ik** een overzichtelijke boodschappenlijst zien georganiseerd per categorie
**Zodat** ik efficiënt kan winkelen

**Acceptatiecriteria:**
- [ ] Lijst toont items gegroepeerd per categorie
- [ ] Elke categorie is inklapbaar/uitklapbaar
- [ ] Items tonen: checkbox, naam, hoeveelheid
- [ ] Aangevinkte items worden doorgestreept (blijven zichtbaar)
- [ ] Categorie headers tonen aantal items (bijv. "Zuivel (3)")

### User Story 2.2: Handmatig Items Toevoegen
**Als** gebruiker
**Wil ik** handmatig boodschappen kunnen toevoegen per categorie
**Zodat** ik items kan toevoegen die niet uit recepten komen

**Acceptatiecriteria:**
- [ ] "+" knop bij elke categorie
- [ ] Invoervelden: naam (verplicht), hoeveelheid (optioneel)
- [ ] Auto-complete op basis van eerder toegevoegde items
- [ ] Direct zichtbaar in juiste categorie na toevoegen

### User Story 2.3: Categorieën Beheer
**Als** gebruiker
**Wil ik** boodschappencategorieën kunnen aanpassen en toevoegen
**Zodat** ik de lijst kan organiseren volgens mijn voorkeuren

**Acceptatiecriteria:**
- [ ] Standaard categorieën zijn voorgedefinieerd
- [ ] Gebruiker kan standaard categorieën hernoemen
- [ ] Gebruiker kan volgorde van categorieën aanpassen
- [ ] Gebruiker kan nieuwe categorieën toevoegen
- [ ] Gebruiker kan lege categorieën verbergen/tonen
- [ ] Categorie kleuren kunnen worden aangepast

**Standaard Categorieën:**
- 🥬 Groenten & Fruit
- 🥛 Zuivel & Eieren
- 🥖 Brood & Bakkerij
- 🥩 Vlees & Vis
- 🍝 Pasta, Rijst & Granen
- 🥫 Conserven & Potten
- 🧂 Kruiden & Specerijen
- 🍷 Dranken
- 🍦 Diepvries
- 🧹 Schoonmaak & Non-food
- ➕ Overige

### User Story 2.4: Lijst Beheer
**Als** gebruiker
**Wil ik** de hele boodschappenlijst kunnen legen
**Zodat** ik een nieuwe winkelronde kan beginnen

**Acceptatiecriteria:**
- [ ] "Lijst legen" knop bovenaan
- [ ] Bevestigingsmodal: "Weet je zeker dat je de hele lijst wilt legen?"
- [ ] Optie om alleen aangevinkte items te verwijderen
- [ ] Optie om hele lijst te verwijderen

### User Story 2.5: Automatische Aggregatie
**Als** gebruiker
**Wil ik** dat identieke ingrediënten automatisch worden samengevoegd
**Zodat** ik geen dubbele items in mijn lijst heb

**Acceptatiecriteria:**
- [ ] "2x 500ml melk" wordt "1 liter melk"
- [ ] "200g kaas + 150g kaas" wordt "350g kaas"
- [ ] Slimme eenheid conversie (ml → liter, g → kg)
- [ ] Tooltip toont uit welke recepten item komt

---

## 📅 Epic 3: Weekmenu

### User Story 3.1: Weekmenu Overzicht
**Als** gebruiker
**Wil ik** een weekoverzicht zien met recepten per dag
**Zodat** ik mijn maaltijden kan plannen

**Acceptatiecriteria:**
- [ ] Weergave maandag t/m zondag
- [ ] Recepten worden getoond als titel cards per dag
- [ ] Lege dagen tonen "+" knop om recept toe te voegen
- [ ] Week selector om vorige/volgende week te bekijken
- [ ] Huidige week is standaard geselecteerd

### User Story 3.2: Recept Toevoegen aan Weekmenu (Bookmark)
**Als** gebruiker
**Wil ik** recepten kunnen toevoegen aan het weekmenu via een bookmark icoon
**Zodat** ik snel mijn weekplanning kan maken

**Acceptatiecriteria:**
- [ ] Bookmark icoon naast hart icoon op recipe cards
- [ ] Bookmark icoon in recipe detail pagina
- [ ] Filled bookmark = in weekmenu, outline = niet in weekmenu
- [ ] Bij klikken: recept wordt toegevoegd aan weekmenu (zonder dag)
- [ ] Visual feedback bij toggle (animatie)

### User Story 3.3: Ingrediënten Selectie Popup
**Als** gebruiker
**Wil ik** na het bookmarken van een recept kunnen kiezen welke ingrediënten naar de boodschappenlijst gaan
**Zodat** ik alleen hoef te kopen wat ik nog niet heb

**Acceptatiecriteria:**
- [ ] Popup verschijnt direct na bookmarken van recept
- [ ] Toont alle ingrediënten van het recept met checkboxes
- [ ] GEEN ingrediënten zijn standaard aangevinkt
- [ ] Gebruiker selecteert welke ingrediënten nodig zijn
- [ ] "Toevoegen aan boodschappen" knop
- [ ] "Overslaan" knop (geen ingrediënten toevoegen)
- [ ] Geselecteerde ingrediënten worden direct toegevoegd aan boodschappenlijst

**Popup Layout:**
```
┌─────────────────────────────────┐
│ Ingrediënten voor [Recept Naam] │
├─────────────────────────────────┤
│ Selecteer wat je nodig hebt:    │
│                                  │
│ □ 1 liter melk                  │
│ □ 150 gram suiker               │
│ □ 150 gram dessertrijst         │
│ □ 1 vanillestokje               │
│ □ 2 eieren                      │
│ □ 100 gram vanillepudding       │
│ □ 1 vel bladerdeeg              │
│ □ 4 tal abrikozen (gerust)      │
│                                  │
│ [Overslaan] [Toevoegen (0)]     │
└─────────────────────────────────┘
```

### User Story 3.4: Recepten Tussen Dagen Verplaatsen
**Als** gebruiker
**Wil ik** recepten kunnen slepen tussen verschillende dagen
**Zodat** ik flexibel mijn weekmenu kan aanpassen

**Acceptatiecriteria:**
- [ ] Drag & drop recepten tussen dagen
- [ ] Visual feedback tijdens slepen (ghost card)
- [ ] Drop zones highlight bij hover
- [ ] Recepten kunnen ook naar "Geen dag" gesleept worden
- [ ] Mobile: long-press om drag mode te activeren
- [ ] Alternative: "Verplaats" knop met dag-selector modal

### User Story 3.5: Weekmenu Beheer
**Als** gebruiker
**Wil ik** het weekmenu kunnen beheren en verwijderen
**Zodat** ik een nieuwe week kan plannen

**Acceptatiecriteria:**
- [ ] Verwijder individueel recept per dag (X knop)
- [ ] "Week legen" knop met confirmatie
- [ ] "Kopieer naar volgende week" functie
- [ ] Optie om specifieke dag te legen
- [ ] Undo functionaliteit na verwijderen (toast notification)

### User Story 3.6: Servings Aanpassen
**Als** gebruiker
**Wil ik** het aantal porties kunnen aanpassen in het weekmenu
**Zodat** ingrediënten correct worden berekend voor boodschappen

**Acceptatiecriteria:**
- [ ] Servings selector bij elk recept in weekmenu
- [ ] +/- knoppen of nummer input
- [ ] Ingrediënten worden herberekend bij sync naar boodschappen
- [ ] Visuele indicatie als servings afwijken van standaard

---

## 🔄 Epic 4: Integratie Features

### User Story 4.1: Weekmenu naar Boodschappen Sync
**Als** gebruiker
**Wil ik** niet automatisch alle ingrediënten synchroniseren
**Zodat** ik controle heb over mijn boodschappenlijst

**Acceptatiecriteria:**
- [ ] GEEN automatische sync bij toevoegen aan weekmenu
- [ ] Ingrediënten worden alleen toegevoegd via selectie popup
- [ ] "Weekmenu bijwerken" knop in boodschappenlijst (voor nieuwe recepten)
- [ ] Toont alleen nieuwe ingrediënten in selectie popup

### User Story 4.2: Print & Export
**Als** gebruiker
**Wil ik** mijn boodschappenlijst kunnen printen of delen
**Zodat** ik deze offline kan gebruiken

**Acceptatiecriteria:**
- [ ] Print-vriendelijke versie (zonder UI elements)
- [ ] Export als tekst voor notitie-apps
- [ ] Share functie voor mobile
- [ ] Categorie structuur blijft behouden in export

---

## 📱 Epic 5: Mobile Optimalisatie

### User Story 5.1: Touch Gestures
**Als** mobile gebruiker
**Wil ik** met swipe acties kunnen werken
**Zodat** de app natuurlijk aanvoelt op mijn telefoon

**Acceptatiecriteria:**
- [ ] Swipe right om item af te vinken
- [ ] Swipe left om item te verwijderen (met undo)
- [ ] Pull-to-refresh op alle lijsten
- [ ] Touch & hold voor drag mode in weekmenu

### User Story 5.2: Responsive Layout
**Als** mobile gebruiker
**Wil ik** een geoptimaliseerde layout op mijn scherm
**Zodat** alles goed leesbaar en bedienbaar is

**Acceptatiecriteria:**
- [ ] Bottom navigation voor 3 hoofdsecties
- [ ] Collapsible categorieën in boodschappenlijst
- [ ] Weekmenu in carousel view (swipe tussen dagen)
- [ ] Grote touch targets voor checkboxes

---

## 🎨 Epic 6: UI/UX Verbeteringen

### User Story 6.1: Visual Feedback
**Als** gebruiker
**Wil ik** duidelijke visuele feedback bij acties
**Zodat** ik weet dat mijn acties zijn verwerkt

**Acceptatiecriteria:**
- [ ] Animaties bij toevoegen/verwijderen items
- [ ] Loading states tijdens sync operaties
- [ ] Success toast notifications
- [ ] Error messages met duidelijke acties

### User Story 6.2: Onboarding
**Als** nieuwe gebruiker
**Wil ik** uitleg over de nieuwe features
**Zodat** ik alle functionaliteit kan benutten

**Acceptatiecriteria:**
- [ ] First-time tooltips bij bookmark icoon
- [ ] Help icoon met feature uitleg
- [ ] Voorbeeld weekmenu voor nieuwe gebruikers
- [ ] Tutorial voor drag & drop functionaliteit

---

## 🚀 Implementatie Prioriteiten

### Fase 1: Foundation (Week 1)
1. Database schema & migrations
2. Navigatie dropdown
3. Basis pagina's (routing)

### Fase 2: Weekmenu (Week 2)
1. Bookmark functionaliteit
2. Weekmenu pagina
3. Ingrediënten selectie popup
4. Drag & drop tussen dagen

### Fase 3: Boodschappenlijst (Week 3)
1. Categorie systeem
2. Checklist functionaliteit
3. Handmatig toevoegen
4. Aggregatie logica

### Fase 4: Polish (Week 4)
1. Mobile optimalisatie
2. Print/export
3. Animations & transitions
4. Testing & bug fixes

---

## 📊 Success Metrics
- Gebruiker kan binnen 5 minuten een weekmenu samenstellen
- 80% van ingrediënten wordt correct gecategoriseerd
- Boodschappenlijst laadt binnen 1 seconde
- Zero data loss bij sync operaties
- Mobile gebruikers kunnen alle features gebruiken

---

## 🔄 Toekomstige Uitbreidingen
- Recepten suggesties op basis van seizoen
- Boodschappen geschiedenis voor terugkerende items
- Integratie met supermarkt APIs voor prijzen
- Meal prep modus met batch cooking
- Delen van weekmenu met gezinsleden
- Restjes management systeem