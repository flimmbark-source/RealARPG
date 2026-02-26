# MVP Scope Lock — Real-World Ambient ARPG

**Status:** Locked for implementation
**Date:** 2026-02-26
**Purpose:** Freeze MVP scope, resolve open decisions, define guardrails for coding agents

---

## 1. MVP_SCOPE_LOCK

### What the MVP Must Prove

Five things, in priority order:

1. Auto-battle feels strategic through buildcraft (combat sim + item system)
2. Loot and loadout changes are exciting and understandable (itemization + comparison)
3. Passive mode and active mode both feel valid (dual-mode loop)
4. Real-world movement can feed a satisfying game loop (map + encounter layer)
5. The world map feels like a hunt layer, not random icon clutter (presentation)

### Vertical Slice Definition

One complete end-to-end loop:

1. Player has a hero with one of 4 archetype starter builds
2. Map shows 6–10 nearby nodes (3 standard fights, 2 elites, 2 chests, 1 shrine)
3. Player can let some content resolve passively (simulate-on-open)
4. Player can open active map mode and choose a target
5. Fight auto-resolves using the real combat engine (instant sim, event-driven)
6. Player gets loot
7. Player equips an upgrade and sees the build change
8. Player returns to map with updated build identity

### Build Order (Strict)

| Phase | Name | Deliverable |
|-------|------|-------------|
| 0 | Data Model | All schemas: hero, item, enemy, encounter, node, stat definitions |
| 1 | Combat Simulator | Instant-resolve event-driven auto-battle engine + text summary |
| 2 | Itemization | Equipment, affixes, item generation, comparison, loot drops |
| 3 | Encounters | Templates, danger rating, reward tables, chest/shrine definitions |
| 4 | UX Shell | 6 screens: Combat Test, Inventory, Encounter Preview, Home, Map, Feed |
| 5 | Passive Mode | Simulate-on-open passive resolution, feed entries, alerts |
| 6 | Active Map | Node selection, preview, engage, route hint, shrine chaining |
| 7 | Progression | Hero level, XP, 3 mock life-stat inputs, unlock display |
| 8 | Polish | Tuning, pacing, balance, clarity pass |

**Rule: Do not start Phase N+1 until Phase N has a working output.**

### Tech Stack

- **Platform:** Mobile-first web prototype
- **Stack:** React + TypeScript + Vite
- **Data persistence:** localStorage for MVP (no server)
- **Map:** Simulated/mock node layout, not real GPS
- **No backend required for MVP**

### Four Test Archetypes

| Archetype | Tests | Key Tags |
|-----------|-------|----------|
| Thorns Warden | defense scaling, barrier, retaliation, swarm survival | warden, thorns, bleed, barrier |
| Poison Rogue | cooldown tempo, status stacking, kill-chain, execution | rogue, poison, crit, dagger |
| Frost Mystic | control identity, status amplification, splash logic | mystic, frost, control, splash |
| Crit Hunter | elite specialization, opener damage, target priority | hunter, crit, bow, elite |

**Summon Mystic is deferred. Frost Mystic replaces it for MVP.**

### Screen Build Order

1. Combat Test Screen (debug harness for Phase 1)
2. Inventory / Loadout Screen
3. Encounter Preview Screen
4. Home Screen
5. Map Screen
6. Feed Screen
7. Progression Screen

### Content Minimums

- 6–8 weapon bases
- 4 offhand bases
- 6 armor bases
- 4 boot bases
- 8 rings
- 6 amulets
- 4–6 relics (summon relics re-tagged or cut)
- 20–30 procedural affixes
- 8–12 named legendary items (summon legendaries re-tagged to frost/burn)
- 2–4 small sets (3–4 pieces each)
- 4 standard encounter templates
- 4 elite encounter templates
- 3 chest types
- 3 shrine types

---

## 2. OPEN_DECISIONS_RESOLVED

### R1. Combat Resolution Model
**Decision:** Instant-resolve, event-driven continuous-timeline simulator.
Actions use cooldowns, trigger conditions, priorities, and start-of-combat sequencing. The fight resolves immediately in a single function call and returns a structured battle summary plus an optional step-by-step event log.
**Not:** Real-time rendered tick engine. Not a turn-based system.
**Architecture constraint:** The simulator must be a pure function: `(hero, enemies, rng_seed) => BattleResult`. No side effects, no DOM, no global state. Must be fast enough to run 20x per encounter preview call.

### R2. Numeric Combat Baseline
**Decision:** Adopt these seed values. Tune later.

| Stat | Hero Starter | Enemy Range |
|------|-------------|-------------|
| Health | 120 | 40–140 by tier |
| Attack | 12 | 6–18 |
| Defense | 8 | 2–12 |
| Crit Chance | 5% | 0–8% |
| Crit Multiplier | 1.5x | 1.5x |
| Haste | 0 (baseline) | varies |
| Base Cooldown | 2.5s–6.0s | 2.0s–5.0s |

**Defense formula:** `damageTaken = rawDamage * (100 / (100 + defense * 4))`
**Haste formula:** `effectiveCooldown = max(baseCooldown * 0.4, baseCooldown / (1 + haste / 100))`
**Target fight length:** 4–10s standard, 8–20s elite

### R3. Item Pool Architecture
**Decision:** Hybrid model.

| Layer | Method |
|-------|--------|
| Base item templates | Hand-authored static JSON |
| Common / Magic / Rare / Epic items | Procedural generation from base + affix tables |
| Legendary items | Hand-authored named items with fixed effects |
| Mythic / Event items | Disabled for MVP |

Affix tables define: stat ranges, tag compatibility, slot restrictions, rarity weighting.
Item generation picks a base, rolls affixes by rarity count, applies tag-weighted selection.

### R4. Abilities Are Items
**Decision:** No separate ability system for MVP. Equipped items grant timed combat actions via their cooldown/trigger definitions. A weapon IS the hero's primary attack action. Offhands, amulets, and relics may add secondary timed actions.
**Schema note:** Reserve an `abilitySlots` field in the hero schema marked `MVP_LATER`. Do not implement.

### R5. Fourth Archetype: Frost Mystic
**Decision:** Frost Mystic, not Summon Mystic.
**Item pool consequence:** Re-tag or cut summon-primary items from MVP starter pool:
- Emberwake Staff → re-tag to Fire/Burn Mystic (remove summon identity)
- Cinderthread Mantle → re-tag to Fire/Burn (remove summon)
- Graveglass Band → re-tag to Mystic/Death Trigger (remove summon dependency)
- Ember Cage relic → re-tag to Fire/Burn enabler (remove construct requirement)
Keep `summonPower` in the stat schema as `MVP_LATER`. Do not implement summon entity logic.

### R6. Passive Mode: Simulate-on-Open
**Decision:** No background process, no server, no push notifications.
When the player opens the app after time away:
1. Read elapsed time since last session
2. Read mock movement/proximity data (simulated for MVP)
3. Run passive encounter resolution against nearby low-tier nodes
4. Generate passive loot drops
5. Generate feed entries (fights resolved, loot found, opportunities missed, alerts)
6. Present results on Home screen and Feed screen

**Rule:** Passive mode resolves standard enemies and common chests only. Elites, rare chests, shrines, and events are surfaced as alerts, not auto-resolved.

### R7. Life-Derived Stats: Mock Inputs in Phase 7 Only
**Decision:** Three manual slider inputs added in Phase 7:
- Vitality → small max health bonus
- Focus → small crit chance bonus
- Exploration → small luck/find bonus

These appear on the Progression screen only. They do not affect core combat balance. They exist to demonstrate the concept, not to be a real system.
**Rule:** Do not wire life-derived stats into the hero data model before Phase 7. Do not let them affect combat before Phase 7.

### R8. Platform: React + TypeScript + Vite
**Decision:** Mobile-first responsive web app.
- No React Native
- No Unity
- No native mobile
- Phone viewport primary, desktop acceptable for debug
- localStorage for persistence
- No server, no database, no auth for MVP

### R9. Danger Rating: Sim-Derived Preview
**Decision:** Encounter preview runs 20 fast combat simulations with varied RNG seeds.
Output:
- `winRate`: wins / 20
- `avgDuration`: average sim duration
- `avgHpRemaining`: average hero HP% at victory
- Danger label thresholds:
  - **Safe:** winRate >= 0.85 AND avgHpRemaining >= 0.40
  - **Risky:** winRate 0.60–0.84 OR avgHpRemaining 0.15–0.39
  - **Deadly:** winRate < 0.60 OR avgHpRemaining < 0.15

**Architecture constraint:** This means the combat simulator MUST complete a standard fight in <5ms. Target: <2ms per sim for standard encounters.

### R10. Inventory Capacity: 24 Slots
**Decision:** 24 item slots in backpack. Currencies and materials are separate counters, not inventory items. Equipped items do not consume backpack slots.

### R11. Rarity Drop Rates

| Source | Common | Magic | Rare | Epic | Legendary |
|--------|--------|-------|------|------|-----------|
| Standard enemy | 60% | 28% | 10% | 2% | 0% |
| Elite enemy | 0% | 30% | 42% | 22% | 6% |
| Common chest | 0% | 40% | 35% | 20% | 5% |
| Elite/Landmark chest | 0% | 0% | 20% | 45% | 30% |

**Rule:** Legendaries drop only from elites, elite chests, and landmark reward nodes. Never from standard enemies or common chests. Mythic/Event tier disabled for MVP.

### R12. No Retreat in MVP
**Decision:** Once engaged, combat resolves to completion. No mid-fight abort.
Player's strategic choice is **before** combat: Engage / Ignore / Route Toward / Save for Later.
**Schema note:** Reserve a `retreatPenalty` field in encounter schema marked `MVP_LATER`.

---

## 3. IMPLEMENTATION_RISKS

### Risk 1: Combat Simulator Performance
The danger-rating system requires 20 sim runs per encounter preview. If the simulator is not pure-function and fast (<2ms per standard fight), the UX will lag on every map interaction.
**Mitigation:** Build the simulator as a standalone pure module with zero DOM/React dependencies. Benchmark on Phase 1 completion. If >5ms per fight, optimize before proceeding.

### Risk 2: Item Generation Producing Garbage
Procedural affix selection can produce nonsensical items (e.g., frost affixes on a poison-tagged dagger base). The docs warn about this but don't give hard exclusion rules.
**Mitigation:** Define tag-compatibility matrices in the affix tables. Each affix declares which base tags it is compatible with. Generation rejects incompatible rolls. Accept some surprising crossovers but prevent mechanical contradictions.

### Risk 3: Premature Map Complexity
The map/encounter spec is the largest document and contains regional themes, time modifiers, weather effects, cluster logic, route generation, and proximity bands. A coding agent could easily spend 70% of effort here.
**Mitigation:** MVP map is a fixed mock layout of 6–10 nodes with hardcoded positions and types. No real GPS. No proximity calculation. No route optimization. No regional theming. Just nodes on a screen with type labels.

### Risk 4: Passive Mode Overshadowing Active
If simulate-on-open gives too much loot, active play feels pointless. The docs warn about this repeatedly.
**Mitigation:** Passive mode uses a reduced loot quality multiplier (e.g., 0.6x rarity roll). Passive mode never resolves elites. Passive mode never triggers shrine buffs. Passive loot caps at 3–5 items per simulated session.

### Risk 5: Overbuilding UI Before Engine
The screen list is 7 screens. A coding agent may start with pretty UI and never finish the combat engine.
**Mitigation:** Phase 1's "Combat Test Screen" is a debug harness, not a polished screen. It should be a single-page form: pick hero build, pick enemy group, run fight, see text log. No routing, no navigation, no animations. Enforce this.

### Risk 6: Stat/Schema Drift
If the hero schema, item schema, and enemy schema are not locked in Phase 0, every subsequent phase will redefine fields and break prior work.
**Mitigation:** Phase 0 outputs TypeScript interfaces that are the source of truth. All subsequent phases import these types. Schema changes require explicit versioning rationale.

### Risk 7: Named Items Without Numbers
The design docs list ~40 named items with flavor text but no concrete stat values. A coding agent will either skip them or invent inconsistent numbers.
**Mitigation:** Phase 0 must include a stat budget table per rarity tier. Phase 2 must produce a complete item data file with actual numbers for every MVP item.

### Risk 8: Feed/Log Becoming Verbose Noise
The battle feed is critical for passive mode satisfaction but could become a wall of text.
**Mitigation:** Feed entries should be 1–2 lines max. Group consecutive standard-enemy results. Highlight only exceptional events (legendary drop, elite defeated, opportunity missed).

---

## 4. NON_GOALS

These are explicitly not goals for the MVP. A coding agent must not build toward these.

| Non-Goal | Reason |
|----------|--------|
| Real GPS / geolocation integration | Fake infrastructure, not fun. Mock map only. |
| Summon entity system | Frost Mystic chosen over Summon Mystic. Deferred. |
| Separate ability system | Abilities are items. No ability slots for MVP. |
| Real-time PvP | Out of scope per design docs. |
| Guilds / co-op / social systems | Out of scope per design docs. |
| Crafting beyond salvage | Nice-to-have only. Not in must-have list. |
| Weather integration | Stubbed early per design docs. |
| Push notifications | No background process. Simulate-on-open only. |
| Server / database / auth | localStorage only. No backend. |
| AR camera features | Out of scope per design docs. |
| Narrative / questlines | Out of scope per design docs. |
| Advanced cosmetics | Out of scope per design docs. |
| Loadout presets | Nice-to-have. Not MVP-critical. |
| Daily modifiers / rotating events | Nice-to-have. Not MVP-critical. |
| Merchant / shop system | Out of scope for first vertical slice. |
| World tier scaling | Phase 7+ at earliest. Not in combat or item phases. |
| Route optimization algorithm | MVP map is too small. Simple "nearest interesting node" only. |
| Build Lab screen | Not in the 7-screen MVP list. Combat Test Screen serves this role. |
| Collection log / bestiary | Retention feature, not core loop validation. |
| Mythic / Event rarity tier | Disabled. No drop sources exist in MVP. |
| Retreat / mid-fight abort | Deferred. Fights resolve to completion. |

---

## 5. CODING_AGENT_GUARDRAILS

### G1. Phase Gate Enforcement
Do not begin Phase N+1 until Phase N has a demonstrable working output.
- Phase 0: All TypeScript interfaces compile. A test can instantiate every schema.
- Phase 1: A test can run 100 fights and produce structured BattleResult objects in <200ms total.
- Phase 2: A test can generate 30 items across 4 rarity tiers with valid affixes. Equipping items changes combat outcomes.
- Phase 3: A test can generate 8 encounter templates with correct danger ratings.
- Phase 4: All 6 screens render with mock data and navigation works.
- Phase 5: Passive simulate-on-open produces feed entries and loot.
- Phase 6: Map nodes are clickable, previews show danger rating, engage triggers combat.
- Phase 7: XP accumulates, level increases, life-stat sliders modify hero stats.

### G2. Simulator Purity
The combat simulator module must:
- Be a pure function: `simulateBattle(hero: HeroState, enemies: EnemyGroup, seed: number) => BattleResult`
- Import ZERO React, DOM, or UI dependencies
- Have ZERO side effects (no localStorage, no global mutation)
- Be independently testable without any UI framework
- Complete a standard fight in <5ms (target <2ms)

### G3. Schema Source of Truth
All game data types must be defined in a single `src/types/` directory in Phase 0.
All other modules import from this directory.
Schema changes after Phase 0 require adding a comment explaining why.
Do not duplicate type definitions across modules.

### G4. No Summon Entities
Do not implement:
- Entity spawning during combat
- Independent summon health tracking
- Summon AI / targeting
- Summon duration management
- `summonPower` stat calculations

Reserve these fields in schemas with `// MVP_LATER` comments. Do not build logic for them.

### G5. No Ability Slots
Do not implement:
- Separate ability equip UI
- Ability cooldown management distinct from item cooldowns
- Ability unlock trees
- Ability slot limits

Items ARE abilities. A weapon's combat action IS the hero's primary attack.

### G6. Map Simplicity
The MVP map is:
- A fixed set of 6–10 mock nodes with hardcoded positions
- No real GPS
- No proximity calculation based on device location
- No procedural node spawning
- No regional theming logic
- No route optimization algorithm
- Nodes are objects with: `{ id, type, position: {x, y}, encounter?, reward?, expiresAt? }`

### G7. Item Pool Discipline
- All summon-primary items must be re-tagged before implementation (see R5)
- Procedural items must pass tag-compatibility validation
- Every named legendary must have concrete stat values, not just flavor text
- Do not exceed the content minimums by more than 20%. More items ≠ better MVP.
- Do not add Mythic/Event tier items

### G8. Passive Mode Constraints
Passive mode must:
- Never resolve elite encounters
- Never apply shrine buffs
- Never generate legendary drops
- Cap at 3–5 items per simulate-on-open call
- Use a 0.6x rarity quality multiplier
- Produce at most 8 feed entries per simulation
- Complete simulation in <100ms

### G9. UI Minimalism
- Phase 1 Combat Test Screen is a debug harness: form inputs, run button, text output. No animations, no polish.
- No screen should take more than 1 day of implementation effort
- Use a single CSS framework or utility library (Tailwind recommended)
- No custom animation library
- No canvas-based rendering
- No map tile rendering library (nodes are positioned divs/SVG)

### G10. Data Persistence
- localStorage only
- Single JSON blob per save
- No IndexedDB
- No server sync
- No cloud save
- Implement a simple `saveGame()` / `loadGame()` pair in a `src/persistence/` module
- Auto-save on every meaningful state change (equip, fight complete, passive resolve)

### G11. Testing Requirements
- Combat simulator must have unit tests covering all 4 archetypes
- Item generation must have tests validating affix compatibility
- Danger rating must have tests confirming label thresholds
- No E2E or integration test framework required for MVP
- Use Vitest (compatible with Vite)

### G12. File Structure

```
src/
  types/           # Phase 0: All TypeScript interfaces
  engine/
    combat.ts      # Phase 1: Pure combat simulator
    loot.ts        # Phase 2: Item generation and drop logic
    encounters.ts  # Phase 3: Encounter templates and danger rating
    passive.ts     # Phase 5: Simulate-on-open logic
  data/
    items.json     # Phase 2: Static item bases and legendaries
    affixes.json   # Phase 2: Affix tables
    enemies.json   # Phase 1: Enemy templates
    encounters.json # Phase 3: Encounter templates
    archetypes.json # Phase 2: Starter build definitions
  ui/
    screens/       # Phase 4+: React screen components
    components/    # Phase 4+: Shared UI components
  persistence/     # Phase 4: Save/load
  App.tsx          # Phase 4: Root with navigation
```

Do not create directories or files before their phase.

### G13. What "Done" Looks Like
The MVP is done when a single tester can:
1. Open the app on a phone browser
2. See a home screen with nearby opportunities
3. Tap a map node and see a danger preview
4. Engage and see a combat summary with clear build impact
5. Receive loot and equip an upgrade
6. See the build change reflected in subsequent previews
7. Close the app, reopen, and see passive results in the feed
8. Do this with all 4 archetypes and notice they play differently

The MVP is NOT done until all 4 archetypes produce distinguishable combat behavior and loot preferences.

---

## Appendix: Remaining Questions for Pre-Implementation

These are lower-priority but should be answered before Phase 2:

1. **XP curve:** How much XP per encounter type? How many encounters per level? How many levels in MVP? (Suggest: 10 levels, ~5 standard fights per level, elites worth 3x)
2. **Shrine buff duration:** How long do shrine effects last in simulated time? (Suggest: 3 encounters or 60 seconds of sim time)
3. **Chest interaction model:** Tap to open instantly, or does opening trigger a mini-encounter? (Suggest: instant open for common/timed, cursed chest triggers a fight)
4. **Feed entry format:** What's the actual text template? (Suggest: define 8–10 templates in Phase 5)
5. **Equipment comparison display:** Side-by-side stat diff? Highlight green/red changes? (Suggest: green/red stat deltas + build summary change preview)

These can be resolved during implementation without blocking Phase 0.
