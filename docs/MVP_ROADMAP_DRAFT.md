# MVP Roadmap — Draft v0.1

**Status:** Draft for review
**Date:** 2026-02-27
**Source:** `docs/MVP_SCOPE_LOCK.md` (locked 2026-02-26)

---

<MOST_RELEVANT_FILES>

| File | Role | Notes |
|------|------|-------|
| `docs/MVP_SCOPE_LOCK.md` | **Only design document in repo** | 426 lines. Covers scope, 12 resolved decisions, 8 risks, 16 non-goals, 13 guardrails, file structure, build order, content minimums. |

**Missing files (not invented):**
- No README or project README
- No package.json / Vite config — project scaffold does not exist yet
- No source code of any kind
- No separate combat design doc, itemization spec, UX wireframes, or map/encounter spec
- No affix tables, enemy data, or item data files
- The scope lock doc references prior "design doc analysis and founder interview" but those source documents are not in this repository

Everything below is derived solely from `MVP_SCOPE_LOCK.md`.

</MOST_RELEVANT_FILES>

---

<FOUNDATIONAL_POINTS>

### MVP goal (Section 1, lines 11–19)
> Five things, in priority order:
> 1. Auto-battle feels strategic through buildcraft
> 2. Loot and loadout changes are exciting and understandable
> 3. Passive mode and active mode both feel valid
> 4. Real-world movement can feed a satisfying game loop
> 5. The world map feels like a hunt layer, not random icon clutter

### Build order (Section 1, lines 36–48)
Strict 9-phase gate (0–8). **"Do not start Phase N+1 until Phase N has a working output."**

### Combat model (R1, lines 100–104)
> Instant-resolve, event-driven continuous-timeline simulator.
> Pure function: `(hero, enemies, rng_seed) => BattleResult`. No side effects, no DOM, no global state.
> Must be fast enough to run 20x per encounter preview call.

### Itemization (R3, lines 123–134)
> Hybrid model: hand-authored static bases + procedural generation from affix tables + named legendaries.
> Affix tables define: stat ranges, tag compatibility, slot restrictions, rarity weighting.

### Abilities are items (R4, line 137)
> No separate ability system for MVP. Equipped items grant timed combat actions via their cooldown/trigger definitions.

### UX screen set (lines 69–77)
7 screens in order: Combat Test (debug), Inventory, Encounter Preview, Home, Map, Feed, Progression.

### Passive vs active loop (R6, lines 149–159)
> Simulate-on-open. No background process. Passive resolves standard enemies + common chests only. Elites/shrines surfaced as alerts, not auto-resolved.

### Map/encounter constraints (G6, lines 325–333)
> Fixed 6–10 mock nodes with hardcoded positions. No real GPS. No proximity calculation. No procedural spawning.

### Danger rating (R9, lines 179–190)
> 20 fast sims, win rate thresholds: Safe ≥85%, Risky 60–84%, Deadly <60%.

### Done criteria (G13, lines 401–412)
> A single tester can complete the full loop with all 4 archetypes and notice they play differently.

</FOUNDATIONAL_POINTS>

---

<MVP_GOAL>

Prove that **auto-battle buildcraft + loot-driven progression + a passive/active dual-mode loop** is fun on a phone, using a mock map and no backend.

Success = one tester can play all 4 archetypes (Thorns Warden, Poison Rogue, Frost Mystic, Crit Hunter) through the full loop — choose node, fight, loot, equip, see build identity change — and each archetype feels distinct.

</MVP_GOAL>

---

<VERTICAL_SLICE>

One complete loop:

```
Hero created (archetype starter build)
  → Map shows 6–10 mock nodes
    → Player selects node, sees danger preview (20-sim rating)
      → Engage: instant-resolve combat → structured result + event log
        → Loot drops (rarity by source type)
          → Equip upgrade, see stat diff
            → Return to map with updated build
              → Close app → Reopen → Passive results in feed
```

Minimum content for the slice:
- 4 starter builds with distinguishable combat behavior
- ~40 item bases across all slots, 20–30 affixes, 8–12 legendaries
- 8 encounter templates (4 standard, 4 elite), 3 chest types, 3 shrine types
- 7 screens (debug-quality for early phases, functional for later)

</VERTICAL_SLICE>

---

<PHASE_ROADMAP>

## Phase 0: Data Model

**Purpose:** Establish the single source of truth for all game data types. Every subsequent phase imports from here. Prevents schema drift (Risk 6).

**Key deliverables:**
- Project scaffold: `npm create vite`, React + TypeScript + Vitest setup
- `src/types/` directory with all TypeScript interfaces: Hero, Item, ItemBase, Affix, Enemy, EnemyGroup, Encounter, MapNode, BattleResult, BattleEvent, FeedEntry, SaveData
- Stat budget table per rarity tier (needed to prevent Risk 7)
- Numeric baseline constants matching R2 (HP 120, ATK 12, DEF 8, etc.)
- Defense formula, haste formula, damage formula as typed utility functions
- `MVP_LATER` reserved fields for summonPower, abilitySlots, retreatPenalty

**Dependencies:** None.

**Non-goals:**
- No game logic. No combat resolution. No item generation.
- No UI components. No React rendering.
- No data files (JSON) yet — just the shapes.

**Done criteria:** All TypeScript interfaces compile. A test can instantiate every schema type with valid mock data. (G1)

---

## Phase 1: Combat Simulator

**Purpose:** Build and validate the core engine — the pure-function instant-resolve battle simulator. This is the single most critical system; if it doesn't work, nothing else matters.

**Key deliverables:**
- `src/engine/combat.ts`: pure function `simulateBattle(hero, enemies, seed) => BattleResult`
- Continuous-timeline event model with cooldowns, trigger conditions, priorities
- Structured BattleResult: winner, duration, event log, HP remaining, damage dealt/taken
- `src/data/enemies.json`: enemy templates for 4 standard + 4 elite encounters (minimum viable set)
- Debug harness screen (Combat Test): form to pick archetype + enemy group, run button, text output of event log
- Unit tests: all 4 archetypes produce distinguishable combat behavior, 100 fights in <200ms

**Dependencies:** Phase 0 schemas.

**Non-goals:**
- No loot drops from combat yet
- No item equip/swap
- No danger rating (needs item system context)
- Debug harness is NOT a polished UI — form + text output only (G9, Risk 5)

**Done criteria:** A test runs 100 fights and produces structured BattleResult objects in <200ms total. Each archetype shows distinct behavior in event logs. Single fight completes in <5ms (target <2ms). (G1, G2)

---

## Phase 2: Itemization

**Purpose:** Build the loot engine — item generation, equipping, comparison, and drop tables. This is what makes combat results matter.

**Key deliverables:**
- `src/data/items.json`: 6–8 weapon bases, 4 offhands, 6 armor, 4 boots, 8 rings, 6 amulets, 4–6 relics — all with concrete stat values
- `src/data/affixes.json`: 20–30 procedural affixes with stat ranges, tag compatibility, slot restrictions, rarity weighting
- `src/data/archetypes.json`: 4 starter build definitions (which items each archetype begins with)
- 8–12 named legendaries with fixed effects (summon items re-tagged per R5)
- 2–4 small item sets (3–4 pieces each)
- `src/engine/loot.ts`: item generation (base + affix rolling), drop table resolution, rarity calculation
- Item comparison logic: stat diff calculation
- Equip/unequip modifying hero combat stats
- Unit tests: generate 30 items across 4 rarities with valid affixes, equipping items changes combat outcomes

**Dependencies:** Phase 0 schemas, Phase 1 combat sim (to verify equip changes affect outcomes).

**Non-goals:**
- No inventory UI yet (that's Phase 4)
- No salvage/crafting
- No Mythic/Event rarity tier
- Do not exceed content minimums by >20% (G7)

**Done criteria:** A test generates 30 items across 4 rarity tiers with valid affixes. Equipping items measurably changes combat outcomes for all 4 archetypes. Tag-compatibility validation rejects bad rolls. (G1, G7)

---

## Phase 3: Encounters

**Purpose:** Define what the player fights and what they get. Connect combat sim + loot engine into encounter resolution with preview ratings.

**Key deliverables:**
- `src/data/encounters.json`: 4 standard + 4 elite encounter templates
- 3 chest types (common, timed, cursed — cursed triggers a fight)
- 3 shrine types with buff definitions
- `src/engine/encounters.ts`: encounter template resolution, danger rating (20-sim preview), reward table lookup
- Danger label logic: Safe/Risky/Deadly thresholds per R9
- Reward distribution by source type per R11 drop rate table

**Dependencies:** Phase 1 combat sim (for danger rating sims), Phase 2 loot engine (for reward generation).

**Non-goals:**
- No map integration yet
- No node spawning or expiration logic
- No regional theming
- Shrine buff duration question (Appendix Q2) should be resolved here — suggest 3 encounters

**Done criteria:** A test generates 8 encounter templates with correct danger ratings. Reward tables produce drops matching R11 rates within statistical tolerance. (G1)

---

## Phase 4: UX Shell

**Purpose:** Make the game playable by a human. Wire engine outputs into screens with navigation.

**Key deliverables:**
- Tailwind CSS setup
- App routing / navigation between screens
- `src/persistence/`: saveGame() / loadGame() with localStorage, auto-save on equip/fight/passive (G10)
- 6 screens (Progression deferred to Phase 7):
  - **Combat Test**: existing debug harness, improved with item context
  - **Inventory**: 24-slot grid, equip/unequip, item comparison (green/red stat deltas)
  - **Encounter Preview**: selected node details, danger label, enemy info, engage button
  - **Home**: summary of nearby opportunities, passive results alert
  - **Map**: 6–10 positioned nodes with type icons, tap to select
  - **Feed**: list of recent events (fight results, loot, alerts)

**Dependencies:** Phases 0–3 (all engine work).

**Non-goals:**
- No custom animations or canvas rendering (G9)
- No Progression screen yet (Phase 7)
- No polish — functional wireframe quality is fine
- No map tile rendering library — nodes are positioned divs (G6)

**Done criteria:** All 6 screens render with real (not mock) data. Navigation works between all screens. Save/load persists hero + inventory across browser refresh. (G1)

---

## Phase 5: Passive Mode

**Purpose:** Prove the dual-mode loop. When a player reopens the app, they see meaningful results from time away.

**Key deliverables:**
- `src/engine/passive.ts`: simulate-on-open logic
  - Read elapsed time, generate mock movement data
  - Resolve standard enemies + common chests only (never elites, shrines, legendaries — G8)
  - 0.6x rarity quality multiplier
  - Cap 3–5 items per session, max 8 feed entries
  - Complete in <100ms
- Feed entry templates (8–10 text templates)
- Home screen integration: passive results surfaced on open
- Feed screen: chronological passive + active event display
- Active-only alerts: elites/shrines/rare chests shown as "opportunities you missed / can still reach"

**Dependencies:** Phase 4 UX shell (screens to display results), Phase 3 encounters (resolution logic).

**Non-goals:**
- No background process, no push notifications (R6)
- No server
- Passive should NOT give better loot than active play (Risk 4)

**Done criteria:** Close the app, reopen, and see passive results in the feed with correct loot quality constraints. Passive never produces legendaries or elite encounters. (G1, G8)

---

## Phase 6: Active Map

**Purpose:** Make the map interactive — the player chooses where to go rather than just seeing results.

**Key deliverables:**
- Node selection → Encounter Preview flow
- Engage button → combat resolution → loot → return to map
- Node state changes after resolution (cleared, available, expired)
- Simple "nearest interesting node" hint (not route optimization — G6)
- Shrine chaining: activate shrine, see buff reflected in subsequent fights

**Dependencies:** Phase 5 passive mode (to contrast active vs passive), Phase 4 UX shell.

**Non-goals:**
- No real GPS (G6)
- No route optimization algorithm
- No procedural node spawning
- No proximity calculation based on device location
- No regional theming

**Done criteria:** Player can tap a map node, see danger preview, engage, fight, receive loot, equip, and see the change reflected in the next danger preview. Shrine buffs apply to subsequent encounters. (G1)

---

## Phase 7: Progression

**Purpose:** Add the lightest viable meta-layer — XP, leveling, and the mock life-stat concept.

**Key deliverables:**
- Progression screen (7th screen)
- XP accumulation from encounters (suggest: ~5 standard fights per level, elites 3x, 10 levels total — per Appendix Q1)
- Level-up: minor stat increases
- 3 life-stat sliders (Vitality → HP, Focus → crit, Exploration → luck) as manual mock inputs
- Unlock display showing progression milestones

**Dependencies:** Phase 6 (complete game loop to accumulate XP from).

**Non-goals:**
- Life-derived stats must NOT affect core combat balance (R7) — small bonuses only
- No world tier scaling
- No prestige / endgame systems

**Done criteria:** XP accumulates from fights. Level increases. Life-stat sliders modify hero stats. Progression screen displays all of the above. (G1)

---

## Phase 8: Polish

**Purpose:** Tune the game until it feels right. This is NOT a feature phase.

**Key deliverables:**
- Balance pass: fight lengths within target (4–10s standard, 8–20s elite per R2)
- Pacing pass: loot drops feel rewarding, not too sparse or too generous
- Clarity pass: combat logs readable, item comparisons obvious, danger labels accurate
- 4-archetype validation: each archetype produces distinguishable combat behavior and loot preferences
- Edge case cleanup: inventory full, all nodes cleared, zero-damage fights, etc.

**Dependencies:** All prior phases.

**Non-goals:**
- No new features
- No new screens
- No new systems
- No visual polish beyond readability

**Done criteria:** G13 — a single tester can complete the full vertical slice loop with all 4 archetypes on a phone browser, and each archetype feels distinct.

</PHASE_ROADMAP>

---

<ASSUMPTIONS>

1. **Greenfield repo.** No source code exists. Phase 0 includes project scaffolding (Vite + React + TS + Vitest).
2. **Single design source.** `MVP_SCOPE_LOCK.md` is the only spec. The referenced "design doc analysis and founder interview" source documents are not available in this repo. If they exist elsewhere, they may contain details not captured here.
3. **Appendix questions are non-blocking.** The 5 open questions (XP curve, shrine duration, chest interaction, feed format, comparison display) can be resolved during implementation. Suggested answers from the doc are reasonable defaults.
4. **Content authoring is part of implementation.** The ~40 item bases, 20–30 affixes, 8–12 legendaries, and 8 encounter templates need actual stat values written. This is real work inside Phases 1–3, not a separate content pipeline.
5. **No designer-in-the-loop assumed.** The roadmap assumes a coding agent can make reasonable numeric choices within the stat budget framework. Balance tuning happens in Phase 8.
6. **"Mock map" means hardcoded node positions.** No procedural generation, no GPS, no tile rendering. Literally positioned elements on screen.
7. **Passive mode elapsed time is faked.** Since there's no real background process, "elapsed time" is `Date.now() - lastSaveTimestamp`. Movement data is simulated/random.

</ASSUMPTIONS>

---

<RISK_AREAS>

### High risk
- **Combat sim performance (Risk 1).** The danger rating system multiplies every perf issue by 20x. If a single fight takes >5ms, map interaction will lag. Must benchmark at end of Phase 1 before proceeding.
- **Item generation quality (Risk 2).** Without careful tag-compatibility matrices, procedural items will be nonsensical. The affix table design in Phase 2 is load-bearing — bad affixes will make loot feel broken for every phase after.
- **Stat authoring for named items (Risk 7).** 8–12 legendaries need concrete numbers, not just flavor text. The stat budget table from Phase 0 is critical scaffolding. If skipped, named items will be wildly over/underpowered.

### Medium risk
- **Scope creep into map complexity (Risk 3).** The scope lock explicitly warns about this. The map is 6–10 hardcoded nodes. Any impulse to add procedural spawning, proximity bands, or route optimization must be resisted.
- **Passive mode loot balance (Risk 4).** Too generous = active play feels pointless. Too stingy = passive mode feels broken. The 0.6x multiplier and caps are guardrails, but tuning will matter in Phase 8.
- **UI time sink (Risk 5).** 7 screens is a lot. The guardrail "no screen should take more than 1 day" is aggressive. Keeping screens at wireframe quality through Phase 6 is important.

### Low risk (but worth noting)
- **Schema drift (Risk 6).** Mitigated by Phase 0's type-first approach, but any schema change after Phase 0 needs discipline.
- **Feed verbosity (Risk 8).** Mitigated by the 8-entry cap and 1–2 line format rule. Defer real tuning to Phase 8.

### Conflict / ambiguity notes
- The build order table (line 42) lists Phase 4 as "6 screens" but the screen list (line 69) shows 7 screens. The 7th (Progression) is clearly Phase 7 work. The table's "6 screens" is correct for Phase 4 scope.
- Content minimums list "4–6 relics (summon relics re-tagged or cut)" — the final count depends on how many summon relics survive re-tagging vs. being cut entirely.

</RISK_AREAS>
