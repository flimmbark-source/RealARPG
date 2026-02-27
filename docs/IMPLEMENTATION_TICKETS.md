# Implementation Tickets

**Status:** Derived from `docs/MVP_ROADMAP_DRAFT.md` and `docs/MVP_SCOPE_LOCK.md`
**Date:** 2026-02-27
**Rule:** Do not start Phase N+1 until Phase N gate passes.

---

<PHASE_TICKETS>

## Phase 0 — Data Model

### P0-1: Project Scaffold

**Title:** Initialize Vite + React + TypeScript + Vitest project

**Purpose:** Create the runnable project shell so all subsequent work has a build, test, and dev-server environment.

**Dependencies:** None.

**Deliverable:** A working `npm run dev` / `npm run test` setup with empty App component and one passing placeholder test.

**Acceptance Criteria:**
- `npm install` completes without errors
- `npm run dev` starts Vite dev server
- `npm run test` runs Vitest and reports 1 passing test
- `tsconfig.json` targets ES2020+ with strict mode enabled
- Tailwind CSS is installed and configured (utility needed from Phase 4 onward)

---

### P0-2: Core Stat and Combat Types

**Title:** Define Hero, Stat, and BattleResult interfaces

**Purpose:** Establish the combat-facing type contracts that Phase 1 will consume directly.

**Dependencies:** P0-1.

**Deliverable:** `src/types/hero.ts`, `src/types/combat.ts` with exported interfaces.

**Acceptance Criteria:**
- `HeroState` interface includes: hp, maxHp, atk, def, critChance, critMultiplier, haste, equippedItems, tags
- `HeroState` reserves `abilitySlots` field as `MVP_LATER` comment
- `BattleResult` interface includes: winner, durationMs, events (BattleEvent[]), hpRemaining, damageDealt, damageTaken, seed
- `BattleEvent` interface includes: timestamp, source, target, type, value, tags
- All interfaces compile with no errors

---

### P0-3: Item and Affix Types

**Title:** Define Item, ItemBase, Affix, and Rarity interfaces

**Purpose:** Establish the loot-system type contracts that Phase 2 will consume.

**Dependencies:** P0-1.

**Deliverable:** `src/types/item.ts` with exported interfaces.

**Acceptance Criteria:**
- `ItemBase` interface includes: id, name, slot, baseStats, tags, allowedAffixTags
- `Affix` interface includes: id, name, stat, range (min/max), tags, slotRestrictions, rarityWeighting
- `Item` interface includes: baseId, rarity, affixes, finalStats, isLegendary, setId (optional)
- `Rarity` enum: Common, Magic, Rare, Epic, Legendary
- `ItemSlot` enum covers: weapon, offhand, armor, boots, ring, amulet, relic
- `summonPower` reserved in stat fields as `MVP_LATER`
- All interfaces compile with no errors

---

### P0-4: Enemy and Encounter Types

**Title:** Define Enemy, EnemyGroup, Encounter, and MapNode interfaces

**Purpose:** Establish the encounter-system type contracts for Phase 1 (enemies) and Phase 3 (encounters).

**Dependencies:** P0-1.

**Deliverable:** `src/types/enemy.ts`, `src/types/encounter.ts`, `src/types/map.ts` with exported interfaces.

**Acceptance Criteria:**
- `Enemy` interface includes: id, name, hp, atk, def, critChance, critMultiplier, haste, cooldown, tags, tier
- `EnemyGroup` interface includes: enemies array, encounter context
- `Encounter` interface includes: id, type (standard/elite), enemies, rewardTable, dangerRating (optional)
- `Encounter` reserves `retreatPenalty` field as `MVP_LATER`
- `MapNode` interface includes: id, type, position ({x, y}), encounterId (optional), reward (optional), expiresAt (optional), state (available/cleared/expired)
- `ChestType` and `ShrineType` enums defined
- All interfaces compile with no errors

---

### P0-5: Persistence, Feed, and Save Types

**Title:** Define SaveData, FeedEntry, and InventoryState interfaces

**Purpose:** Establish persistence and feed type contracts for Phases 4–5.

**Dependencies:** P0-2, P0-3, P0-4.

**Deliverable:** `src/types/save.ts`, `src/types/feed.ts` with exported interfaces.

**Acceptance Criteria:**
- `SaveData` interface includes: hero, inventory (Item[], max 24), equippedItems, mapState, feedEntries, lastSaveTimestamp, xp, level
- `FeedEntry` interface includes: id, timestamp, type, summary (string), details (optional), loot (optional)
- `InventoryState` includes: items array (max 24 slots), equipped map by slot
- All interfaces compile with no errors

---

### P0-6: Numeric Baseline Constants and Formulas

**Title:** Define stat constants, budget tables, and core formulas

**Purpose:** Lock in R2 numeric baselines and formulas so combat and item phases have concrete reference values. Prevents Risk 7 (named items without numbers).

**Dependencies:** P0-2, P0-3.

**Deliverable:** `src/types/constants.ts` with exported constants and formula functions.

**Acceptance Criteria:**
- Hero starter stats: HP=120, ATK=12, DEF=8, CritChance=0.05, CritMultiplier=1.5, Haste=0
- Enemy stat ranges defined as constants
- `calcDamageTaken(rawDamage, defense)` returns `rawDamage * (100 / (100 + defense * 4))`
- `calcEffectiveCooldown(baseCooldown, haste)` returns `max(baseCooldown * 0.4, baseCooldown / (1 + haste / 100))`
- Stat budget table per rarity: defines total affix budget for Common (0-1 affix), Magic (1-2), Rare (2-3), Epic (3-4), Legendary (fixed)
- Drop rate table per source type matching R11 values
- Unit tests verify formula outputs against hand-calculated expected values

---

### P0-7: Type Barrel Exports and Mock Instantiation Test

**Title:** Create index barrel file and validate all types with mock data

**Purpose:** Phase 0 gate check — prove every interface is instantiable with valid test data.

**Dependencies:** P0-2 through P0-6.

**Deliverable:** `src/types/index.ts` barrel export, test file with mock instantiations.

**Acceptance Criteria:**
- `src/types/index.ts` re-exports all types from all type files
- A test file creates one valid instance of: HeroState, Item, ItemBase, Affix, Enemy, EnemyGroup, Encounter, MapNode, BattleResult, BattleEvent, FeedEntry, SaveData
- All mocks compile and the test suite passes
- **Phase 0 gate: PASS**

---

## Phase 1 — Combat Simulator

### P1-1: Combat Timeline Loop

**Title:** Implement core combat resolution loop with timeline and cooldowns

**Purpose:** Build the heart of the engine — an event-driven continuous-timeline that advances cooldowns, resolves actions in priority order, and terminates when one side is dead.

**Dependencies:** P0 complete (all types).

**Deliverable:** `src/engine/combat.ts` exporting `simulateBattle(hero, enemies, seed) => BattleResult`.

**Acceptance Criteria:**
- Pure function: zero imports from React, DOM, or side-effectful modules
- Deterministic: same inputs + seed produce identical BattleResult
- Timeline advances action-by-action based on effective cooldowns
- Fights terminate when hero HP <= 0 or all enemy HP <= 0
- Returns structured BattleResult with winner, durationMs, hpRemaining, events array
- A single standard fight completes in <5ms

---

### P1-2: Damage, Defense, and Crit Resolution

**Title:** Implement damage calculation with defense formula, crit rolls, and haste

**Purpose:** Wire R2 formulas into action resolution so combat math is correct.

**Dependencies:** P1-1.

**Deliverable:** Damage resolution integrated into combat loop.

**Acceptance Criteria:**
- Damage uses `calcDamageTaken` formula from P0-6
- Crit chance is rolled per action using seeded RNG; crit applies multiplier
- Haste modifies effective cooldown per `calcEffectiveCooldown`
- A high-DEF hero takes measurably less damage than a low-DEF hero (unit test)
- A high-crit hero deals measurably more average damage (unit test over 50+ fights)

---

### P1-3: Status Effects and Trigger System

**Title:** Implement status effects (poison, bleed, frost, barrier) and item-triggered actions

**Purpose:** Enable the 4 archetypes to produce distinct combat behavior through their item-granted effects.

**Dependencies:** P1-2.

**Deliverable:** Status effect application, tick resolution, and trigger condition evaluation in combat loop.

**Acceptance Criteria:**
- Poison: deals damage over time, can stack
- Bleed: deals damage over time from physical sources
- Frost: slows enemy cooldowns (increases effective cooldown)
- Barrier: absorbs incoming damage before HP
- Thorns/retaliation: deals damage back to attacker on hit
- Item trigger conditions (e.g., "on hit", "on kill", "on crit", "combat start") fire correctly
- Each effect type has at least one unit test

---

### P1-4: Enemy Template Data

**Title:** Create enemy templates JSON for 8 encounters

**Purpose:** Provide concrete enemy data for combat testing — 4 standard and 4 elite templates with stat values within R2 ranges.

**Dependencies:** P1-1, P0-4.

**Deliverable:** `src/data/enemies.json` with 8 enemy templates.

**Acceptance Criteria:**
- 4 standard enemies with HP 40–80, ATK 6–12, DEF 2–6
- 4 elite enemies with HP 90–140, ATK 12–18, DEF 6–12
- Each enemy has tags, cooldown value, and at least one action definition
- Enemies load and conform to the Enemy type interface
- Standard fights resolve in 4–10s sim time; elite fights in 8–20s

---

### P1-5: Archetype Starter Builds

**Title:** Create 4 hardcoded archetype starter hero states for testing

**Purpose:** Provide testable hero configurations that exercise different combat mechanics before the full item system exists.

**Dependencies:** P1-3.

**Deliverable:** Test fixture or data file with 4 starter HeroState objects.

**Acceptance Criteria:**
- Thorns Warden: high DEF, barrier, thorns/retaliation effect
- Poison Rogue: high crit, fast cooldowns, poison-on-hit
- Frost Mystic: frost slow effect, splash damage, moderate stats
- Crit Hunter: high crit chance + multiplier, opener bonus, single-target focus
- Each starter build loads into `simulateBattle` without errors

---

### P1-6: Archetype Differentiation Tests

**Title:** Validate that 4 archetypes produce distinct combat behavior

**Purpose:** Prove the combat engine can distinguish build identities — the core MVP thesis.

**Dependencies:** P1-4, P1-5.

**Deliverable:** Test suite with archetype comparison assertions.

**Acceptance Criteria:**
- Thorns Warden takes the least damage per fight on average (vs. swarms)
- Poison Rogue has the highest kill speed against single targets
- Frost Mystic applies frost slow in >80% of fights
- Crit Hunter deals the highest single-hit damage
- 100 fights (25 per archetype) complete in <200ms total
- Each archetype's event log contains its signature mechanic

---

### P1-7: Debug Harness Screen

**Title:** Build Combat Test debug screen with form + text output

**Purpose:** Allow a human to run fights and read event logs in a browser. Minimal UI — form and text only (G9, Risk 5).

**Dependencies:** P1-6.

**Deliverable:** React component rendering at root route, form to select archetype and enemy group, run button, text output of BattleResult.

**Acceptance Criteria:**
- Dropdown to pick one of 4 archetypes
- Dropdown to pick one of 8 enemy groups
- "Fight" button runs `simulateBattle` and displays result
- Text output shows: winner, duration, HP remaining, full event log
- No routing, no navigation, no polish — single page only
- **Phase 1 gate: PASS**

---

## Phase 2 — Itemization

### P2-1: Item Base Data

**Title:** Author item base templates JSON

**Purpose:** Provide the hand-authored base item pool — concrete stat values on every base, not just names.

**Dependencies:** P0-3 (item types), P0-6 (stat budgets).

**Deliverable:** `src/data/items.json` with all base item entries.

**Acceptance Criteria:**
- 6–8 weapon bases with ATK values, cooldown, tags
- 4 offhand bases with defensive/utility stats
- 6 armor bases with DEF/HP values
- 4 boot bases with haste/utility values
- 8 ring bases with secondary stat values
- 6 amulet bases with trigger/utility effects
- 4–6 relic bases (summon relics re-tagged per R5)
- Every base has concrete numeric stat values, not placeholders
- All bases conform to ItemBase type

---

### P2-2: Affix Table Data

**Title:** Author procedural affix definitions JSON

**Purpose:** Define the affix pool that procedural item generation draws from, with tag compatibility to prevent garbage items (Risk 2).

**Dependencies:** P0-3 (affix types).

**Deliverable:** `src/data/affixes.json` with 20–30 affix entries.

**Acceptance Criteria:**
- 20–30 affixes covering: flat ATK, flat DEF, flat HP, crit chance, crit multiplier, haste, poison damage, bleed damage, frost slow, barrier amount, thorns
- Each affix declares: stat, min/max range, compatible tags, slot restrictions, rarity weighting
- Tag compatibility prevents mechanical contradictions (e.g., frost affix not compatible with poison-only base)
- All affixes conform to Affix type

---

### P2-3: Item Generation Engine

**Title:** Implement procedural item generation from base + affix rolling

**Purpose:** Given a base and target rarity, produce a complete item with valid affixes.

**Dependencies:** P2-1, P2-2.

**Deliverable:** `src/engine/loot.ts` exporting `generateItem(baseId, rarity, seed) => Item`.

**Acceptance Criteria:**
- Selects affix count by rarity (Common 0–1, Magic 1–2, Rare 2–3, Epic 3–4)
- Rolls affixes filtered by tag compatibility and slot restriction
- Stat values rolled within affix min/max range using seeded RNG
- Rejects incompatible affix rolls (does not produce e.g., frost + poison on same item)
- Deterministic: same inputs + seed produce identical item
- Unit test generates 30 items across 4 rarities — all have valid affixes

---

### P2-4: Named Legendaries and Set Items

**Title:** Author legendary items and small item sets with fixed stats

**Purpose:** Hand-crafted chase items that define archetype identity. Each needs concrete numbers within stat budget (Risk 7).

**Dependencies:** P2-1, P0-6 (stat budgets).

**Deliverable:** Legendary and set entries added to `src/data/items.json` (or companion file).

**Acceptance Criteria:**
- 8–12 named legendaries with fixed stats and unique effects
- Summon-themed legendaries re-tagged per R5 (Emberwake Staff → Fire/Burn, etc.)
- 2–4 item sets with 3–4 pieces each, set bonuses defined
- All stat values within rarity budget tolerances
- Each legendary has at least one tag matching an archetype

---

### P2-5: Drop Table Resolution

**Title:** Implement drop table lookup by source type

**Purpose:** Given a source (standard enemy, elite, common chest, etc.), determine rarity of dropped item per R11 rates.

**Dependencies:** P2-3, P0-6 (drop rate constants).

**Deliverable:** `rollDrop(sourceType, seed) => { rarity, baseId }` in `src/engine/loot.ts`.

**Acceptance Criteria:**
- Standard enemy: 60% common, 28% magic, 10% rare, 2% epic, 0% legendary
- Elite enemy: 0% common, 30% magic, 42% rare, 22% epic, 6% legendary
- Common chest: 0% common, 40% magic, 35% rare, 20% epic, 5% legendary
- Elite/Landmark chest: 0% common, 0% magic, 20% rare, 45% epic, 30% legendary
- Unit test rolls 1000 drops per source type and verifies distribution within ±5% statistical tolerance

---

### P2-6: Equip/Unequip and Stat Recalculation

**Title:** Implement equip, unequip, and hero stat recomputation

**Purpose:** When a player changes gear, hero combat stats must update so the next fight reflects the new build.

**Dependencies:** P2-1, P0-2.

**Deliverable:** `equipItem(hero, item)` and `unequipItem(hero, slot)` functions, stat recalculation logic.

**Acceptance Criteria:**
- Equipping an item updates hero stats (ATK, DEF, HP, crit, haste, etc.)
- Unequipping reverses the stat changes
- Equipped items do not consume backpack inventory slots (R10)
- Swapping an item in an occupied slot unequips the old item first
- Unit test: equip a weapon, run a fight, verify different outcome vs. unarmed

---

### P2-7: Item Comparison Logic

**Title:** Implement stat diff calculation between two items

**Purpose:** Enable the UI (Phase 4) to show green/red stat deltas when comparing a drop to equipped gear.

**Dependencies:** P2-6.

**Deliverable:** `compareItems(current, candidate, hero) => StatDiff[]` function.

**Acceptance Criteria:**
- Returns per-stat delta (positive = upgrade, negative = downgrade)
- Accounts for affix differences, not just base stats
- Handles case where no item is currently equipped in that slot
- Unit test compares two items and verifies correct deltas

---

### P2-8: Archetype Starter Build Definitions

**Title:** Create 4 archetype starter loadouts referencing real item data

**Purpose:** Replace P1-5 hardcoded test fixtures with loadouts built from the authored item pool.

**Dependencies:** P2-1, P2-4, P2-6.

**Deliverable:** `src/data/archetypes.json` with 4 starter build definitions.

**Acceptance Criteria:**
- Each archetype specifies starting equipped items by base ID
- Thorns Warden starts with defensive weapon + high-armor + barrier items
- Poison Rogue starts with fast dagger + poison-tagged gear
- Frost Mystic starts with frost staff + control-tagged gear
- Crit Hunter starts with bow + crit-tagged gear
- Loading each archetype produces a valid HeroState with correct computed stats
- Running fights with real starter builds still shows archetype differentiation (P1-6 tests still pass)
- **Phase 2 gate: PASS**

---

## Phase 3 — Encounters

### P3-1: Encounter Template Data

**Title:** Create 8 encounter template definitions

**Purpose:** Define what the player fights at each node — enemy composition, difficulty tier, and context.

**Dependencies:** P1-4 (enemy data), P0-4 (encounter types).

**Deliverable:** `src/data/encounters.json` with 8 encounter entries.

**Acceptance Criteria:**
- 4 standard encounters using standard-tier enemies
- 4 elite encounters using elite-tier enemies (some multi-enemy)
- Each template references enemy IDs from `enemies.json`
- Each template has a type field (standard or elite)
- All entries conform to Encounter type

---

### P3-2: Chest and Shrine Definitions

**Title:** Define 3 chest types and 3 shrine types with behavior rules

**Purpose:** Non-combat node content that adds variety to the map loop.

**Dependencies:** P0-4 (types for chest/shrine).

**Deliverable:** Chest and shrine data definitions (in encounters data or companion file).

**Acceptance Criteria:**
- Common chest: opens instantly, drops per common-chest rate table
- Timed chest: opens instantly, drops per common-chest rate table (timer is visual/map flavor)
- Cursed chest: triggers a combat encounter, drops per elite-chest rate table on win
- 3 shrine types with distinct buff effects (e.g., ATK boost, DEF boost, haste boost)
- Shrine buff duration: 3 encounters (resolving Appendix Q2)
- All definitions conform to types

---

### P3-3: Danger Rating Calculator

**Title:** Implement 20-sim danger rating preview

**Purpose:** Run 20 fast combat sims to produce Safe/Risky/Deadly labels per R9.

**Dependencies:** P1-1 (combat simulator), P3-1 (encounter templates).

**Deliverable:** `calcDangerRating(hero, encounter) => DangerResult` in `src/engine/encounters.ts`.

**Acceptance Criteria:**
- Runs 20 simulations with varied seeds
- Returns winRate, avgDuration, avgHpRemaining, and danger label
- Safe: winRate >= 0.85 AND avgHpRemaining >= 0.40
- Risky: winRate 0.60–0.84 OR avgHpRemaining 0.15–0.39
- Deadly: winRate < 0.60 OR avgHpRemaining < 0.15
- 20 sims for a standard encounter complete in <100ms
- Unit test: a well-geared hero vs. weak enemies returns Safe; a starter hero vs. elite returns Risky or Deadly

---

### P3-4: Encounter Reward Resolution

**Title:** Implement encounter reward generation using drop tables

**Purpose:** After a fight, generate loot drops using the correct source-type drop rates (R11).

**Dependencies:** P2-5 (drop table), P3-1 (encounter templates).

**Deliverable:** `resolveEncounterReward(encounter, hero, seed) => Item[]` in `src/engine/encounters.ts`.

**Acceptance Criteria:**
- Standard encounters use standard-enemy drop rates
- Elite encounters use elite-enemy drop rates
- Chest rewards use their respective chest-type drop rates
- Returns 1–3 items per encounter (configurable per template)
- Items generated via `generateItem` from P2-3 with correct rarity
- Unit test: resolve 100 standard encounters, verify no legendary drops

---

### P3-5: Encounter Engine Integration Test

**Title:** End-to-end test: pick encounter, preview danger, resolve, receive loot

**Purpose:** Verify the full encounter pipeline works before building UI on top.

**Dependencies:** P3-3, P3-4.

**Deliverable:** Integration test exercising the complete encounter flow.

**Acceptance Criteria:**
- Test picks an encounter template
- Calculates danger rating for a given hero
- Resolves combat
- Generates reward items
- All returned data conforms to types
- Shrine buff application modifies subsequent danger ratings
- **Phase 3 gate: PASS**

---

## Phase 4 — UX Shell

### P4-1: App Routing and Navigation

**Title:** Set up React Router with screen navigation skeleton

**Purpose:** Enable navigation between 6 screens with a shared layout.

**Dependencies:** P0-1 (project scaffold).

**Deliverable:** `src/App.tsx` with routes, bottom nav or tab bar, 6 placeholder screen components.

**Acceptance Criteria:**
- 6 routes: /combat-test, /inventory, /encounter, /home, /map, /feed
- Bottom navigation bar with icons/labels for each screen
- Tapping a nav item navigates to the correct screen
- Mobile-first viewport layout
- Each screen renders a placeholder heading

---

### P4-2: Save/Load Persistence

**Title:** Implement localStorage save/load with auto-save

**Purpose:** Hero state, inventory, and map progress persist across browser refresh (G10).

**Dependencies:** P0-5 (SaveData type), P4-1.

**Deliverable:** `src/persistence/save.ts` exporting `saveGame(state)` and `loadGame() => SaveData | null`.

**Acceptance Criteria:**
- Saves entire game state as single JSON blob to localStorage
- Loads and parses saved state on app open
- Auto-save triggers on: equip, fight complete, passive resolve
- Handles missing/corrupt save gracefully (returns null, starts fresh)
- Unit test: save, load, verify round-trip fidelity

---

### P4-3: Game State Context

**Title:** Create React context for shared game state

**Purpose:** Provide a single state container that screens read from and actions write to, triggering auto-save.

**Dependencies:** P4-2, P2-8 (archetype starters for initial state).

**Deliverable:** `src/ui/GameStateContext.tsx` with provider and hooks.

**Acceptance Criteria:**
- Context holds: hero, inventory, equipped items, map nodes, feed entries
- Exposes action dispatchers: equipItem, resolveEncounter, etc.
- State changes trigger auto-save via P4-2
- New game initializes from a selected archetype starter build
- Screens can read state without prop drilling

---

### P4-4: Combat Test Screen (Upgrade)

**Title:** Upgrade debug harness with item context and routing

**Purpose:** Integrate the Phase 1 debug harness into the routed app, now showing equipped items and their effects.

**Dependencies:** P4-1, P4-3, P1-7 (existing debug harness).

**Deliverable:** Updated Combat Test screen at /combat-test route.

**Acceptance Criteria:**
- Shows current hero stats (derived from equipped items)
- Archetype and enemy selectors still work
- Fight results show item-granted effects in event log
- Navigable from bottom nav

---

### P4-5: Inventory Screen

**Title:** Build 24-slot inventory grid with equip/unequip and comparison

**Purpose:** Let the player manage gear — the core buildcraft interaction.

**Dependencies:** P4-3, P2-6 (equip/unequip), P2-7 (comparison logic).

**Acceptance Criteria:**
- 24-slot backpack grid showing held items
- Equipped items displayed separately by slot
- Tap item to see stats; tap equip/unequip button
- Comparison overlay: green/red stat deltas when comparing to equipped item
- Inventory full state handled (cannot pick up more items)

---

### P4-6: Encounter Preview Screen

**Title:** Build encounter preview with danger label and engage button

**Purpose:** Show the player what they're about to fight and how risky it is.

**Dependencies:** P4-3, P3-3 (danger rating).

**Deliverable:** Encounter Preview screen at /encounter route.

**Acceptance Criteria:**
- Displays encounter name, enemy list, enemy stats
- Shows danger label (Safe/Risky/Deadly) with color coding
- Shows win rate and average HP remaining
- "Engage" button resolves combat and navigates to result view
- Result view shows BattleResult summary and loot drops

---

### P4-7: Home Screen

**Title:** Build home screen with summary and passive results alert

**Purpose:** Landing screen showing nearby opportunities and passive mode results.

**Dependencies:** P4-3.

**Deliverable:** Home screen at /home route (default route).

**Acceptance Criteria:**
- Displays hero name, level, key stats summary
- Shows count of available map nodes by type
- Passive results alert area (populated in Phase 5, placeholder for now)
- Acts as the app entry point on load

---

### P4-8: Map Screen

**Title:** Build mock map with 6–10 positioned nodes

**Purpose:** Visual map with tappable nodes that link to encounter preview (G6).

**Dependencies:** P4-3, P0-4 (MapNode type).

**Deliverable:** Map screen at /map route.

**Acceptance Criteria:**
- Renders 6–10 nodes at hardcoded x/y positions
- Each node shows type icon (fight, elite, chest, shrine)
- Node state reflected visually (available, cleared, expired)
- Tapping a node navigates to Encounter Preview with that node's data
- No GPS, no tile rendering, no procedural spawning — positioned divs only

---

### P4-9: Feed Screen

**Title:** Build chronological event feed

**Purpose:** Show the player a log of recent events — fights, loot, alerts.

**Dependencies:** P4-3, P0-5 (FeedEntry type).

**Deliverable:** Feed screen at /feed route.

**Acceptance Criteria:**
- Displays feed entries in reverse-chronological order
- Each entry shows timestamp, summary text, and optional loot icon
- Capped at most recent entries (visual cap, underlying data managed by engine)
- Entries appear after combat resolution and loot pickup
- **Phase 4 gate: PASS** (all 6 screens render with real data, navigation works, save/load persists across refresh)

---

## Phase 5 — Passive Mode

### P5-1: Elapsed Time and Mock Movement

**Title:** Calculate elapsed time since last session and generate simulated movement data

**Purpose:** Determine what happened "while the player was away" using `Date.now() - lastSaveTimestamp`.

**Dependencies:** P4-2 (save system for lastSaveTimestamp).

**Deliverable:** Elapsed time calculation and mock movement generator in `src/engine/passive.ts`.

**Acceptance Criteria:**
- Reads `lastSaveTimestamp` from saved state
- Calculates elapsed seconds since last save
- Generates mock "nodes encountered" count proportional to elapsed time (e.g., 1 node per 10 minutes, capped)
- Does not use real GPS or background process (R6)

---

### P5-2: Passive Encounter Resolution

**Title:** Resolve passive encounters against standard enemies and common chests only

**Purpose:** Simulate what the hero did while away, respecting all G8 constraints.

**Dependencies:** P5-1, P3-4 (encounter rewards), P1-1 (combat sim).

**Deliverable:** `resolvePassiveSession(hero, elapsedTime, seed) => PassiveResult` in `src/engine/passive.ts`.

**Acceptance Criteria:**
- Resolves only standard enemies and common chests (never elites — G8)
- Applies 0.6x rarity quality multiplier
- Never generates legendary drops (G8)
- Caps at 3–5 items per session
- Produces at most 8 feed entries
- Completes in <100ms
- Unit test: run 100 passive sessions, verify zero legendaries, zero elite encounters

---

### P5-3: Feed Entry Templates

**Title:** Define 8–10 text templates for passive feed entries

**Purpose:** Give passive results readable, varied descriptions (resolving Appendix Q4).

**Dependencies:** P0-5 (FeedEntry type).

**Deliverable:** Feed template definitions and formatter function.

**Acceptance Criteria:**
- 8–10 distinct templates covering: fight won, fight lost, loot found, common chest opened, opportunity missed, elite spotted (alert), shrine spotted (alert), session summary
- Each template produces 1–2 lines of text (Risk 8 mitigation)
- Templates accept dynamic values (enemy name, item name, danger level)

---

### P5-4: Home Screen Passive Integration

**Title:** Surface passive results on Home screen when app reopens

**Purpose:** The player sees what happened while away as the first thing on app open.

**Dependencies:** P5-2, P5-3, P4-7 (Home screen).

**Deliverable:** Updated Home screen showing passive results.

**Acceptance Criteria:**
- On app open, if elapsed time > threshold, passive simulation runs automatically
- Home screen displays passive result summary: fights resolved, loot found, alerts
- Passive loot added to inventory (respecting 24-slot cap)
- Feed entries from passive session appear in Feed screen
- Elite/shrine encounters surfaced as "opportunities" alerts, not auto-resolved

---

### P5-5: Passive Mode Constraint Validation

**Title:** Test that passive mode never violates G8 guardrails

**Purpose:** Ensure passive never overshadows active play (Risk 4).

**Dependencies:** P5-2.

**Deliverable:** Dedicated test suite for passive constraints.

**Acceptance Criteria:**
- 500 passive sessions produce zero legendary items
- 500 passive sessions produce zero elite encounters
- No passive session exceeds 5 items
- No passive session exceeds 8 feed entries
- Average passive item rarity is measurably lower than active (0.6x multiplier effect)
- **Phase 5 gate: PASS**

---

## Phase 6 — Active Map

### P6-1: Node Selection to Encounter Flow

**Title:** Wire map node tap → encounter preview → engage → combat → result → loot

**Purpose:** Complete the active play loop end-to-end in the UI.

**Dependencies:** P4-8 (Map screen), P4-6 (Encounter Preview), P4-5 (Inventory), P4-3 (state context).

**Deliverable:** Connected flow across Map, Encounter Preview, and result screens.

**Acceptance Criteria:**
- Tap map node → navigate to Encounter Preview with node data
- Engage button → combat resolves → result screen shows summary + loot
- Player can equip loot from result screen or navigate to inventory
- Return to map → node state updated to "cleared"
- Feed entry created for the resolved encounter

---

### P6-2: Node State Management

**Title:** Implement node lifecycle: available → cleared/expired

**Purpose:** Nodes should reflect their status after the player interacts with them.

**Dependencies:** P6-1, P4-3 (state context).

**Deliverable:** Node state transitions in game state context.

**Acceptance Criteria:**
- Cleared nodes show visually distinct state on map
- Expired nodes (if expiresAt passed) show as unavailable
- State persists across save/load
- Cannot engage a cleared or expired node

---

### P6-3: Shrine Buff Application and Chaining

**Title:** Implement shrine activation with buff applied to subsequent fights

**Purpose:** Shrines add pre-combat strategy — activating a shrine before a hard fight is a meaningful choice.

**Dependencies:** P6-1, P3-2 (shrine definitions).

**Deliverable:** Shrine activation flow and buff tracking in hero state.

**Acceptance Criteria:**
- Activating a shrine node applies buff to hero (e.g., +ATK, +DEF, +haste)
- Buff lasts for 3 subsequent encounters (per resolved Q2)
- Buff reflected in danger rating previews for upcoming fights
- Buff expires after 3 encounters and is removed from hero state
- Feed entry created for shrine activation

---

### P6-4: Nearest Interesting Node Hint

**Title:** Show a simple "nearest interesting node" indicator on map

**Purpose:** Light guidance without route optimization (G6).

**Dependencies:** P6-2.

**Deliverable:** Visual indicator on map highlighting the nearest uncleared node of interest.

**Acceptance Criteria:**
- Identifies the nearest available node by Euclidean distance from a fixed "player position"
- Highlights with a subtle visual indicator (border, glow, or label)
- No route path drawn, no optimization algorithm
- Updates when nodes are cleared

---

### P6-5: Active Map Integration Test

**Title:** Full loop test: select node → preview → engage → loot → equip → verify next preview changes

**Purpose:** Prove the complete active gameplay loop works end-to-end.

**Dependencies:** P6-1 through P6-3.

**Deliverable:** Manual test script or integration test covering the full loop.

**Acceptance Criteria:**
- Player selects a node, sees danger preview
- Engages, fights, receives loot
- Equips an upgrade
- Next danger preview for a different node reflects the stat change
- Shrine buff modifies danger preview for subsequent nodes
- **Phase 6 gate: PASS**

---

## Phase 7 — Progression

### P7-1: XP Accumulation and Level-Up

**Title:** Implement XP gain from encounters and level thresholds

**Purpose:** Add the lightest meta-progression — XP from fights leading to level-ups.

**Dependencies:** P6-1 (complete game loop to earn XP from).

**Deliverable:** XP tracking and level-up logic in game state.

**Acceptance Criteria:**
- Standard encounters award base XP (e.g., 20 XP)
- Elite encounters award 3x XP (e.g., 60 XP)
- 10 levels total with ~5 standard fights per level (100 XP per level, scaling mildly)
- Level-up grants minor stat increases (e.g., +5 HP, +1 ATK per level)
- XP and level persist in save data

---

### P7-2: Progression Screen

**Title:** Build Progression screen with XP bar, level, and life-stat sliders

**Purpose:** 7th screen showing meta-progression and life-stat concept (R7).

**Dependencies:** P7-1, P4-1 (routing).

**Deliverable:** Progression screen at /progression route, added to navigation.

**Acceptance Criteria:**
- Displays current level and XP progress bar
- Shows stat bonuses from leveling
- 3 life-stat sliders: Vitality, Focus, Exploration
- Sliders are manual inputs (mock — not derived from real data)
- Navigation updated to include 7th screen

---

### P7-3: Life-Stat Slider Effects

**Title:** Wire life-stat sliders to minor hero stat bonuses

**Purpose:** Demonstrate the concept that real-world activity could influence the game, without affecting core balance (R7).

**Dependencies:** P7-2.

**Deliverable:** Slider values modify hero stats.

**Acceptance Criteria:**
- Vitality slider: small max HP bonus (e.g., +1–10 HP)
- Focus slider: small crit chance bonus (e.g., +0.5–2%)
- Exploration slider: small luck/find bonus (affects rarity roll slightly)
- Bonuses are intentionally small — must NOT alter fight outcomes dramatically
- Changes reflected in hero stats and danger rating previews
- **Phase 7 gate: PASS**

---

## Phase 8 — Polish

### P8-1: Fight Length Balance Pass

**Title:** Tune combat numbers so fight durations hit targets

**Purpose:** Standard fights should be 4–10s sim time, elite fights 8–20s (R2).

**Dependencies:** All prior phases.

**Deliverable:** Adjusted stat values in data files if needed; balance test report.

**Acceptance Criteria:**
- 100 standard fights across 4 archetypes average 4–10s duration
- 100 elite fights across 4 archetypes average 8–20s duration
- No fights end in <2s (too trivial) or >30s (too slow)
- Adjustments documented in commit message

---

### P8-2: Loot Pacing Review

**Title:** Tune drop rates and item budgets so loot feels rewarding

**Purpose:** Too sparse = boring, too generous = trivializes progression. Find the sweet spot.

**Dependencies:** All prior phases.

**Deliverable:** Adjusted drop rates or item counts if needed; pacing test observations.

**Acceptance Criteria:**
- A fresh archetype finds at least one meaningful upgrade within 3 encounters
- Legendary items feel rare but attainable over a full session (~10+ encounters)
- Passive mode loot is noticeably weaker than active mode loot
- No encounter produces zero loot

---

### P8-3: Combat Log Clarity Pass

**Title:** Ensure combat event logs and feed entries are readable

**Purpose:** A player should understand what happened in a fight and why they won or lost (Risk 8).

**Acceptance Criteria:**
- Event log entries are human-readable (not raw data dumps)
- Key moments highlighted: crits, status applications, kills, barrier breaks
- Feed entries are 1–2 lines, not walls of text
- Item comparison deltas are obvious (green = better, red = worse)

**Dependencies:** All prior phases.

**Deliverable:** Formatting improvements to event log rendering and feed templates.

---

### P8-4: Four-Archetype Validation

**Title:** Full playthrough with all 4 archetypes — verify distinct feel

**Purpose:** The MVP done criterion (G13): each archetype must feel different.

**Dependencies:** P8-1, P8-2, P8-3.

**Deliverable:** Validation test report.

**Acceptance Criteria:**
- Each archetype completes the full loop: map → preview → fight → loot → equip → return
- Thorns Warden excels against swarms, survives through retaliation
- Poison Rogue kills fast via status stacking and crits
- Frost Mystic controls fights via slows and splash
- Crit Hunter dominates elites with high single-target burst
- Loot preferences differ: each archetype values different affixes/bases
- A tester can distinguish archetypes from combat logs alone

---

### P8-5: Edge Case Cleanup

**Title:** Handle boundary conditions across all systems

**Purpose:** Prevent crashes or nonsensical states at system boundaries.

**Dependencies:** All prior phases.

**Deliverable:** Bug fixes for identified edge cases.

**Acceptance Criteria:**
- Inventory full: player informed, excess loot discarded or blocked
- All map nodes cleared: app doesn't crash, shows "area cleared" state
- Zero-damage fights (very high DEF): still resolve, don't infinite loop
- Hero dies in passive mode: passive result reflects loss, no items gained from that fight
- Empty save / first launch: clean new-game flow works
- **Phase 8 gate: PASS — MVP DONE (G13)**

</PHASE_TICKETS>
