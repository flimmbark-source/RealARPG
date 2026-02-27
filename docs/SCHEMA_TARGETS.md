# Schema Targets — Minimum Types Before Implementation

**Status:** Pre-implementation schema inventory
**Date:** 2026-02-27
**Source:** `docs/MVP_SCOPE_LOCK.md`, `docs/MVP_ROADMAP_DRAFT.md`, `docs/IMPLEMENTATION_TICKETS.md`
**Rule:** Do not write TypeScript yet. This document defines *what* must exist, not *how*.

---

<SCHEMA_TARGETS>

## Enums and Tag Sets

---

### Rarity

**Purpose:** Classify items into quality tiers that govern affix count and drop probability.

**Values:** Common, Magic, Rare, Epic, Legendary

**Needed by:** Phase 0 (type definitions), Phase 2 (item generation, drop tables)

**MVP_NOW**

**Notes:** Mythic and Event tiers are explicitly disabled (scope lock non-goals). Do not reserve enum values for them.

---

### ItemSlot

**Purpose:** Identify which equipment position an item occupies. Controls equip logic and base-item categorization.

**Values:** weapon, offhand, armor, boots, ring, amulet, relic

**Needed by:** Phase 0 (item types), Phase 2 (equip/unequip), Phase 4 (inventory UI)

**MVP_NOW**

**Notes:** Scope lock content minimums list all 7 slot types. Rings and amulets may allow 2 equipped simultaneously — **HUMAN DECISION NEEDED: does the hero equip 1 ring or 2? 1 amulet or 2?** The scope lock is silent on multi-slot counts per type.

---

### EnemyTier

**Purpose:** Distinguish standard vs elite enemies for stat range validation and drop table routing.

**Values:** standard, elite

**Needed by:** Phase 0 (enemy types), Phase 1 (enemy data), Phase 3 (encounter templates)

**MVP_NOW**

---

### EncounterType

**Purpose:** Classify encounters to route reward tables and passive-mode filtering.

**Values:** standard, elite

**Needed by:** Phase 0 (encounter types), Phase 3 (encounter templates, danger rating)

**MVP_NOW**

---

### NodeType

**Purpose:** Identify what a map node contains so the UI can render the correct icon and the engine can route to the correct resolution logic.

**Values:** standard_fight, elite_fight, common_chest, timed_chest, cursed_chest, shrine

**Needed by:** Phase 0 (map types), Phase 4 (map screen), Phase 6 (active map)

**MVP_NOW**

---

### NodeState

**Purpose:** Track lifecycle of a map node.

**Values:** available, cleared, expired

**Needed by:** Phase 0 (map types), Phase 6 (node state management)

**MVP_NOW**

---

### ChestType

**Purpose:** Distinguish chest behavior — instant open, timer visual, or combat-gated.

**Values:** common, timed, cursed

**Needed by:** Phase 0 (encounter types), Phase 3 (chest definitions)

**MVP_NOW**

**Notes:** Common and timed both open instantly (timed is visual flavor on map). Cursed triggers a fight and uses elite-chest drop rates on win.

---

### ShrineType

**Purpose:** Identify which buff a shrine grants.

**Values:** *3 values — specific names TBD*

**Needed by:** Phase 0 (encounter types), Phase 3 (shrine definitions), Phase 6 (buff application)

**MVP_NOW**

**HUMAN DECISION NEEDED:** The scope lock says "3 shrine types" and tickets suggest ATK boost, DEF boost, haste boost. Are these the final three, or should one be replaced (e.g., crit boost)? The buff stat targets need to be locked before Phase 3.

---

### StatusEffectType

**Purpose:** Classify combat status effects so the engine can resolve ticks, stacking, and interactions.

**Values:** poison, bleed, frost, barrier, thorns

**Needed by:** Phase 0 (combat types), Phase 1 (status effect system)

**MVP_NOW**

**Notes:** These five are the minimum needed to differentiate the 4 archetypes. Poison and bleed are damage-over-time. Frost is a slow. Barrier absorbs damage. Thorns reflects damage.

---

### TriggerCondition

**Purpose:** Define when an item-granted combat action fires.

**Values:** on_hit, on_kill, on_crit, on_take_damage, combat_start

**Needed by:** Phase 0 (item action types), Phase 1 (trigger system)

**MVP_NOW**

**HUMAN DECISION NEEDED:** Is this list complete? The scope lock says items grant "timed combat actions via cooldown/trigger definitions" but does not enumerate all trigger types. The 4 archetypes need at minimum: on_hit (poison, frost), on_take_damage (thorns, barrier), on_kill (rogue chain), on_crit (hunter burst), combat_start (opener). Are there others (e.g., on_low_hp, on_status_applied)?

---

### BattleEventType

**Purpose:** Classify events in the combat log for rendering and filtering.

**Values:** attack, crit, status_apply, status_tick, status_expire, barrier_absorb, thorns_reflect, kill, hero_death

**Needed by:** Phase 0 (combat types), Phase 1 (event logging)

**MVP_NOW**

---

### DangerLabel

**Purpose:** Human-readable combat difficulty classification.

**Values:** Safe, Risky, Deadly

**Needed by:** Phase 0 (encounter types), Phase 3 (danger rating), Phase 4 (encounter preview UI)

**MVP_NOW**

---

### FeedEntryType

**Purpose:** Classify feed log entries for rendering and filtering.

**Values:** fight_won, fight_lost, loot_found, chest_opened, shrine_activated, elite_spotted, shrine_spotted, opportunity_missed, passive_summary

**Needed by:** Phase 0 (feed types), Phase 5 (feed templates)

**MVP_NOW**

---

### ArchetypeId

**Purpose:** Identify the 4 test archetypes for starter build selection and validation.

**Values:** thorns_warden, poison_rogue, frost_mystic, crit_hunter

**Needed by:** Phase 0 (hero types), Phase 1 (starter builds), Phase 2 (archetype loadouts)

**MVP_NOW**

---

### Tag (string union or open set)

**Purpose:** Semantic labels on items, enemies, and affixes that drive compatibility matching and archetype identity.

**Core tag values:** warden, rogue, mystic, hunter, thorns, poison, frost, crit, bleed, barrier, fire, burn, control, splash, bow, dagger, staff, shield, melee, ranged, physical, elemental

**Needed by:** Phase 0 (used across item, enemy, and affix types), Phase 2 (tag-compatibility filtering)

**MVP_NOW**

**Notes:** Tags are the connective tissue between items and archetypes. The scope lock lists per-archetype tags: warden/thorns/bleed/barrier, rogue/poison/crit/dagger, mystic/frost/control/splash, hunter/crit/bow/elite. Items from R5 re-tagging add fire/burn. This list is intentionally open — additional tags may emerge during content authoring, but the compatibility matrix in affix tables (Phase 2) must cover at least these.

---

## Data Objects

---

### HeroState

**Purpose:** Complete snapshot of the hero's current combat-ready state. This is what the combat simulator receives.

**Key fields:**
- id (string)
- name (string)
- archetypeId (ArchetypeId)
- level (number) — default 1
- xp (number) — default 0
- baseStats: { hp, maxHp, atk, def, critChance, critMultiplier, haste }
- computedStats: { hp, maxHp, atk, def, critChance, critMultiplier, haste } — base + gear + buffs
- equippedItems: map of ItemSlot → Item
- activeBuffs: ShrineBuff[] — from shrine activation
- tags: Tag[]
- *abilitySlots — MVP_LATER (R4)*
- *lifeStats: { vitality, focus, exploration } — MVP_LATER until Phase 7 (R7)*

**Required enums/tags:** ArchetypeId, ItemSlot, Tag

**Needed by:** Phase 0 (define), Phase 1 (consumed by combat sim), Phase 2 (stat recalculation on equip)

**MVP_NOW** (abilitySlots and lifeStats are MVP_LATER fields)

---

### CombatAction

**Purpose:** Defines a single action that a combatant (hero or enemy) can perform during a fight. Items grant these to the hero (R4: "abilities are items").

**Key fields:**
- id (string)
- name (string)
- damage (number) — base damage of the action
- cooldown (number) — base cooldown in seconds
- priority (number) — resolution order when simultaneous
- triggerCondition (TriggerCondition | null) — null means cooldown-based auto-action
- statusEffect: { type: StatusEffectType, value: number, duration: number } | null
- tags: Tag[]
- splashTargets (number) — 0 = single target, >0 = hits N additional enemies

**Required enums/tags:** TriggerCondition, StatusEffectType, Tag

**Needed by:** Phase 0 (define), Phase 1 (combat timeline resolution)

**MVP_NOW**

**HUMAN DECISION NEEDED:** The scope lock says actions have "cooldowns, trigger conditions, priorities, and start-of-combat sequencing." Should `priority` be a simple number (lower = first), or does start-of-combat need a separate boolean/phase field? Also: can an item grant multiple actions, or exactly one?

---

### StatusEffect (runtime)

**Purpose:** An active status effect instance during combat. Created when a CombatAction applies one; ticked by the timeline.

**Key fields:**
- type (StatusEffectType)
- source (string — action/item that applied it)
- value (number — damage per tick, slow amount, barrier HP, or thorns damage)
- remainingDuration (number — seconds)
- stacks (number)

**Required enums/tags:** StatusEffectType

**Needed by:** Phase 0 (define), Phase 1 (status effect resolution)

**MVP_NOW**

**HUMAN DECISION NEEDED:** Stacking rules. The scope lock says poison "can stack" (P1-3). Do all DoT effects stack infinitely? Is there a cap? Does barrier stack or refresh? Does frost slow stack or just refresh duration? These rules affect combat balance significantly.

---

### BattleResult

**Purpose:** Complete output of the combat simulator pure function. Consumed by UI, feed, danger rating, and reward systems.

**Key fields:**
- winner ("hero" | "enemies")
- durationMs (number — sim-time in milliseconds)
- events: BattleEvent[]
- heroHpRemaining (number)
- heroDamageDealt (number)
- heroDamageTaken (number)
- enemiesDefeated (number)
- seed (number — RNG seed for reproducibility)

**Required enums/tags:** (none directly, but contains BattleEvent[])

**Needed by:** Phase 0 (define), Phase 1 (combat sim output), Phase 3 (danger rating aggregation), Phase 4 (result display)

**MVP_NOW**

---

### BattleEvent

**Purpose:** Single timestamped event in the combat log. The ordered array of these tells the story of a fight.

**Key fields:**
- timestamp (number — sim-time in ms from fight start)
- type (BattleEventType)
- source (string — who did it: hero or enemy id)
- target (string — who received it)
- actionId (string — which CombatAction fired)
- value (number — damage dealt, barrier absorbed, etc.)
- tags: Tag[]

**Required enums/tags:** BattleEventType, Tag

**Needed by:** Phase 0 (define), Phase 1 (event logging), Phase 4 (combat log display), Phase 8 (clarity pass)

**MVP_NOW**

---

### ItemBase

**Purpose:** Hand-authored static template for a base item. The immutable blueprint from which procedural items are generated.

**Key fields:**
- id (string)
- name (string)
- slot (ItemSlot)
- baseStats: partial stat map { atk?, def?, hp?, critChance?, critMultiplier?, haste? }
- grantedAction: CombatAction | null — the combat action this item provides (R4)
- tags: Tag[]
- allowedAffixTags: Tag[] — which affix tags are compatible with this base
- flavor (string — short description, optional)

**Required enums/tags:** ItemSlot, Tag, CombatAction

**Needed by:** Phase 0 (define), Phase 2 (item base data authoring, generation engine)

**MVP_NOW**

---

### Affix

**Purpose:** Definition of a single procedural modifier that can roll on generated items. The affix table is the core of item diversity.

**Key fields:**
- id (string)
- name (string — display prefix/suffix, e.g., "of Venom", "Frigid")
- stat (string — which stat this modifies: atk, def, hp, critChance, haste, etc.)
- min (number — minimum roll value)
- max (number — maximum roll value)
- tags: Tag[] — what this affix is thematically associated with
- slotRestrictions: ItemSlot[] | null — null means any slot
- rarityWeighting: partial map { common?, magic?, rare?, epic? } — likelihood per tier
- grantedAction: CombatAction | null — some affixes grant trigger actions (e.g., "poison on hit")

**Required enums/tags:** Tag, ItemSlot, Rarity (for weighting keys), CombatAction

**Needed by:** Phase 0 (define), Phase 2 (affix table data, generation engine)

**MVP_NOW**

---

### Item (instance)

**Purpose:** A concrete item in the player's inventory or equipment. Generated from a base + rolled affixes, or hand-authored (legendaries).

**Key fields:**
- instanceId (string — unique per generated item)
- baseId (string — references ItemBase.id)
- name (string — may differ from base name for legendaries)
- slot (ItemSlot)
- rarity (Rarity)
- affixes: RolledAffix[] — affix id + rolled value pairs
- finalStats: computed stat map — base stats + all affix contributions
- grantedActions: CombatAction[] — base action + any affix-granted actions
- isLegendary (boolean)
- setId (string | null)
- tags: Tag[] — union of base tags + affix tags
- seed (number — generation seed for reproducibility)

**Required enums/tags:** ItemSlot, Rarity, Tag

**Needed by:** Phase 0 (define), Phase 2 (generation output, equip system), Phase 4 (inventory UI)

**MVP_NOW**

---

### RolledAffix

**Purpose:** An affix instance on a generated item — the affix definition plus its concrete rolled value.

**Key fields:**
- affixId (string — references Affix.id)
- stat (string)
- value (number — rolled within min/max range)

**Required enums/tags:** (none)

**Needed by:** Phase 0 (define), Phase 2 (item generation output)

**MVP_NOW**

---

### ItemSet

**Purpose:** Small set bonus definition — wearing N pieces grants a bonus.

**Key fields:**
- id (string)
- name (string)
- pieceIds: string[] — which ItemBase ids belong to this set (3–4 pieces)
- bonuses: { requiredCount: number, stats: partial stat map }[] — e.g., 2-piece: +10 HP, 3-piece: +5% crit

**Required enums/tags:** (none directly)

**Needed by:** Phase 0 (define), Phase 2 (set item authoring, equip stat calculation)

**MVP_NOW**

**HUMAN DECISION NEEDED:** Do set bonuses grant only flat stat bonuses, or can they grant CombatActions (e.g., 3-piece set grants a special triggered effect)? The scope lock does not specify. Flat stat bonuses are simpler and sufficient for MVP.

---

### Enemy

**Purpose:** Template for a single enemy combatant with stats and actions.

**Key fields:**
- id (string)
- name (string)
- tier (EnemyTier)
- stats: { hp, atk, def, critChance, critMultiplier, haste }
- actions: CombatAction[] — at least one per enemy
- tags: Tag[]

**Required enums/tags:** EnemyTier, Tag, CombatAction

**Needed by:** Phase 0 (define), Phase 1 (enemy template data)

**MVP_NOW**

**Notes:** Stat ranges per R2: standard HP 40–80, ATK 6–12, DEF 2–6; elite HP 90–140, ATK 12–18, DEF 6–12.

---

### EnemyGroup

**Purpose:** Composition of enemies for a single fight. An encounter references one of these.

**Key fields:**
- enemies: Enemy[] (or enemy id references + counts)

**Required enums/tags:** (none directly)

**Needed by:** Phase 0 (define), Phase 1 (combat sim input)

**MVP_NOW**

**HUMAN DECISION NEEDED:** Do enemy groups embed full Enemy objects or reference by id + count? Referencing by id is cleaner for data authoring (e.g., `[{ enemyId: "goblin", count: 3 }]`) but the combat sim needs fully resolved objects. Suggest: data files use id references, engine resolves to full objects before sim call.

---

### Encounter

**Purpose:** A complete encounter template that defines what happens at a node — who you fight, what you get.

**Key fields:**
- id (string)
- name (string)
- type (EncounterType)
- enemyGroup: EnemyGroup reference
- rewardTable: { dropCount: number, sourceType: DropSourceType }
- *retreatPenalty — MVP_LATER (R12)*

**Required enums/tags:** EncounterType

**Needed by:** Phase 0 (define), Phase 3 (encounter template data)

**MVP_NOW** (retreatPenalty is MVP_LATER)

---

### DropSourceType

**Purpose:** Enum routing key for the R11 drop rate tables.

**Values:** standard_enemy, elite_enemy, common_chest, elite_chest

**Needed by:** Phase 0 (constants), Phase 2 (drop table resolution), Phase 3 (reward generation)

**MVP_NOW**

---

### DropTable

**Purpose:** Drop probability distribution per source type. A constant lookup table, not a per-instance object.

**Key fields:**
- sourceType (DropSourceType)
- rates: { common: number, magic: number, rare: number, epic: number, legendary: number } — must sum to 1.0

**Required enums/tags:** DropSourceType, Rarity

**Needed by:** Phase 0 (constants), Phase 2 (drop table resolution)

**MVP_NOW**

**Notes:** Exact values locked in R11 of scope lock. These are constants, not authored data.

---

### ChestDefinition

**Purpose:** Behavior rules for a chest type — what happens on interaction and which drop table to use.

**Key fields:**
- type (ChestType)
- dropSourceType (DropSourceType) — which drop table to use
- triggersEncounter (boolean) — true only for cursed chests
- encounterId (string | null) — encounter to trigger if cursed

**Required enums/tags:** ChestType, DropSourceType

**Needed by:** Phase 0 (define), Phase 3 (chest definitions)

**MVP_NOW**

---

### ShrineDefinition

**Purpose:** What buff a shrine grants and how long it lasts.

**Key fields:**
- type (ShrineType)
- name (string)
- buff: { stat: string, value: number }
- durationEncounters (number) — number of encounters the buff lasts (resolved: 3)

**Required enums/tags:** ShrineType

**Needed by:** Phase 0 (define), Phase 3 (shrine definitions), Phase 6 (buff application)

**MVP_NOW**

---

### ShrineBuff (runtime)

**Purpose:** An active shrine buff on the hero, counting down encounters.

**Key fields:**
- shrineType (ShrineType)
- stat (string)
- value (number)
- encountersRemaining (number) — decrements on each encounter resolution

**Required enums/tags:** ShrineType

**Needed by:** Phase 0 (define, as part of HeroState), Phase 6 (shrine chaining)

**MVP_NOW**

---

### MapNode

**Purpose:** A single node on the mock map — position, type, and lifecycle state.

**Key fields:**
- id (string)
- type (NodeType)
- position: { x: number, y: number } — hardcoded coordinates
- state (NodeState)
- encounterId (string | null) — for fight nodes
- chestType (ChestType | null) — for chest nodes
- shrineType (ShrineType | null) — for shrine nodes
- expiresAt (number | null) — timestamp, optional

**Required enums/tags:** NodeType, NodeState, ChestType, ShrineType

**Needed by:** Phase 0 (define), Phase 4 (map screen), Phase 6 (node state management)

**MVP_NOW**

**Notes:** Per G6 — 6–10 hardcoded nodes. Positions are arbitrary screen coordinates, not geo coordinates.

---

### DangerResult

**Purpose:** Output of the 20-sim danger rating preview.

**Key fields:**
- winRate (number — 0.0 to 1.0)
- avgDurationMs (number)
- avgHpRemainingPercent (number — 0.0 to 1.0)
- label (DangerLabel)

**Required enums/tags:** DangerLabel

**Needed by:** Phase 0 (define), Phase 3 (danger rating calculator), Phase 4 (encounter preview UI)

**MVP_NOW**

---

### FeedEntry

**Purpose:** A single entry in the event log shown on the Feed and Home screens.

**Key fields:**
- id (string)
- timestamp (number — real-world ms)
- type (FeedEntryType)
- summary (string — 1–2 lines of human-readable text)
- details (string | null — optional expanded text)
- lootItems: Item[] | null — items associated with this event
- isPassive (boolean) — whether this came from passive mode

**Required enums/tags:** FeedEntryType

**Needed by:** Phase 0 (define), Phase 4 (feed screen), Phase 5 (passive feed generation)

**MVP_NOW**

---

### InventoryState

**Purpose:** The player's backpack — up to 24 items plus the equipped item map.

**Key fields:**
- backpack: Item[] — max 24 slots (R10)
- equipped: map of ItemSlot → Item

**Required enums/tags:** ItemSlot

**Needed by:** Phase 0 (define), Phase 2 (equip/unequip), Phase 4 (inventory screen)

**MVP_NOW**

**Notes:** Equipped items do NOT consume backpack slots (R10). Currencies/materials are separate counters if ever added — not inventory items.

---

### StatDiff

**Purpose:** Result of comparing two items — per-stat deltas for the comparison UI.

**Key fields:**
- stat (string)
- currentValue (number)
- candidateValue (number)
- delta (number — positive = upgrade)

**Required enums/tags:** (none)

**Needed by:** Phase 0 (define), Phase 2 (comparison logic), Phase 4 (inventory UI green/red display)

**MVP_NOW**

---

### ArchetypeDefinition

**Purpose:** Starter build for one of the 4 test archetypes — which items the hero begins with.

**Key fields:**
- id (ArchetypeId)
- name (string)
- description (string)
- startingItemIds: string[] — references to ItemBase ids for initial equipped gear
- startingBaseStats: stat overrides if any differ from R2 defaults

**Required enums/tags:** ArchetypeId

**Needed by:** Phase 0 (define), Phase 1 (hardcoded test fixtures), Phase 2 (real item-based loadouts)

**MVP_NOW**

---

### PassiveResult

**Purpose:** Output of the simulate-on-open passive session.

**Key fields:**
- encountersResolved (number)
- feedEntries: FeedEntry[]
- lootGained: Item[]
- heroHpAfter (number)
- alerts: FeedEntry[] — elites/shrines spotted but not resolved
- elapsedSeconds (number)

**Required enums/tags:** (none directly)

**Needed by:** Phase 5 (passive engine output, home screen integration)

**MVP_NOW**

---

### SaveData

**Purpose:** Single JSON blob persisted to localStorage. The entire game state.

**Key fields:**
- version (number — schema version for future migration)
- hero: HeroState
- inventory: InventoryState
- mapNodes: MapNode[]
- feedEntries: FeedEntry[]
- lastSaveTimestamp (number — ms, used for passive elapsed time)
- selectedArchetype (ArchetypeId)
- *progression: { level, xp, lifeStats } — MVP_LATER until Phase 7*

**Required enums/tags:** ArchetypeId

**Needed by:** Phase 0 (define), Phase 4 (save/load persistence)

**MVP_NOW** (progression sub-object is MVP_LATER until Phase 7)

---

### ProgressionState

**Purpose:** XP, level, and life-stat slider values. Added in Phase 7 only (R7).

**Key fields:**
- level (number — 1–10)
- xp (number)
- xpToNextLevel (number)
- lifeStats: { vitality: number, focus: number, exploration: number } — slider values 0–100

**Required enums/tags:** (none)

**Needed by:** Phase 7 only

**MVP_LATER** — do not define until Phase 7. Do not wire into hero stats before Phase 7. Reserve a `progression` field in SaveData as MVP_LATER.

---

## Constant Tables (not objects, but load-bearing data)

---

### HERO_STARTER_STATS

**Purpose:** R2 numeric baselines for a fresh hero before equipment.

**Key values:** HP=120, ATK=12, DEF=8, CritChance=0.05, CritMultiplier=1.5, Haste=0, BaseCooldown=2.5s–6.0s

**Needed by:** Phase 0

**MVP_NOW**

---

### ENEMY_STAT_RANGES

**Purpose:** Valid stat ranges for enemy authoring validation.

**Key values:** Standard: HP 40–80, ATK 6–12, DEF 2–6, Crit 0–5%; Elite: HP 90–140, ATK 12–18, DEF 6–12, Crit 3–8%

**Needed by:** Phase 0

**MVP_NOW**

---

### RARITY_AFFIX_COUNTS

**Purpose:** How many affixes each rarity tier rolls.

**Key values:** Common: 0–1, Magic: 1–2, Rare: 2–3, Epic: 3–4, Legendary: fixed (hand-authored)

**Needed by:** Phase 0

**MVP_NOW**

---

### DROP_RATE_TABLES

**Purpose:** R11 drop probability per source type. 4 tables (standard_enemy, elite_enemy, common_chest, elite_chest).

**Needed by:** Phase 0 (as constants), Phase 2 (drop resolution)

**MVP_NOW**

---

### FORMULAS

**Purpose:** Core combat math.

**Key formulas:**
- Defense: `rawDamage * (100 / (100 + defense * 4))`
- Haste: `max(baseCooldown * 0.4, baseCooldown / (1 + haste / 100))`

**Needed by:** Phase 0

**MVP_NOW**

---

### PASSIVE_MODE_CONSTRAINTS

**Purpose:** G8 guardrail values as named constants.

**Key values:** rarityMultiplier=0.6, maxItemsPerSession=5, maxFeedEntries=8, neverElite=true, neverLegendary=true, performanceBudgetMs=100

**Needed by:** Phase 0 (as constants), Phase 5 (passive engine)

**MVP_NOW**

---

### DANGER_THRESHOLDS

**Purpose:** R9 danger label cutoffs.

**Key values:** Safe: winRate>=0.85 AND hpRemaining>=0.40; Risky: winRate 0.60–0.84 OR hpRemaining 0.15–0.39; Deadly: winRate<0.60 OR hpRemaining<0.15; simCount=20

**Needed by:** Phase 0 (as constants), Phase 3 (danger rating)

**MVP_NOW**

---

## Summary of Human Decisions Needed

| # | Area | Question | Impact | Suggested Default |
|---|------|----------|--------|-------------------|
| 1 | ItemSlot | Can the hero equip 2 rings and/or 2 amulets simultaneously? | Affects InventoryState equipped map, equip logic, item budget | 2 rings, 1 amulet (common ARPG convention) |
| 2 | ShrineType | What are the 3 shrine buff targets? ATK/DEF/Haste, or substitute one for Crit? | Affects shrine data authoring, archetype balance | ATK boost, DEF boost, Haste boost |
| 3 | TriggerCondition | Is {on_hit, on_kill, on_crit, on_take_damage, combat_start} the complete trigger list? | Affects CombatAction schema completeness | Yes, this set is sufficient for 4 archetypes |
| 4 | StatusEffect stacking | Do all effects stack infinitely? Is there a stack cap? Does barrier refresh or stack? | Affects combat balance, potential infinite loops | Poison/bleed stack up to 5, frost refreshes duration, barrier stacks |
| 5 | CombatAction priority | Is priority a simple number, or does combat_start need a separate phase? | Affects timeline loop complexity | Simple number; combat_start actions get priority 0 (fire first at t=0) |
| 6 | CombatAction multiplicity | Can a single item grant multiple CombatActions? | Affects ItemBase and Affix schemas | Yes — a weapon grants a primary action, some affixes add triggered secondary actions |
| 7 | ItemSet bonuses | Flat stat bonuses only, or can sets grant CombatActions? | Affects ItemSet schema | Flat stat bonuses only for MVP |
| 8 | EnemyGroup format | Embed full Enemy objects or reference by id + count? | Affects data file structure and engine resolution | Reference by id + count in data files; resolve to full objects before sim |

</SCHEMA_TARGETS>
