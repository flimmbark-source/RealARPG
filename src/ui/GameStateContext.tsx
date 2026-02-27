import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { ARCHETYPE_STARTERS, ENEMY_GROUPS } from '../data/combatFixtures'
import { simulateBattle } from '../engine/combat'
import { calcDangerRating, resolveEncounterReward, resolveEncounterTemplate } from '../engine/encounters'
import { compareItems, equipItem as applyEquipItem, generateItem, recalculateHeroStats, unequipItem as applyUnequipItem } from '../engine/loot'
import { applyProgressionToHero, createDefaultProgression, gainXp, getEncounterXpReward, setLifeStat } from '../engine/progression'
import { loadGame, saveGame } from '../persistence/save'
import { Rarity, type FeedEntry, type HeroState, type Item, type ItemSlot, type MapNode, type ProgressionState, type SaveData } from '../types'

type PlayerMode = 'active' | 'passive' | 'dev'
type DevEncounterFilter = Record<MapNode['type'], boolean>

interface EncounterPreviewState {
  node: MapNode
  danger: ReturnType<typeof calcDangerRating>
  encounterName: string
  enemies: ReturnType<typeof resolveEncounterTemplate>['enemies']['enemies']
}

interface ResolveEncounterOutcome {
  result: ReturnType<typeof simulateBattle>
  loot: Item[]
}

interface GameStateContextValue {
  state: SaveData
  mapNodes: MapNode[]
  visibleMapNodes: MapNode[]
  feedEntries: FeedEntry[]
  selectedNode: MapNode | null
  selectedNodeId: string | null
  selectedEncounter: EncounterPreviewState | null
  canAddInventoryItem: boolean
  playerMode: PlayerMode
  devEncounterFilters: DevEncounterFilter
  devPlayerPosition: { x: number; y: number }
  selectMapNode: (nodeId: string) => void
  clearSelectedNode: () => void
  setPlayerMode: (mode: PlayerMode) => void
  setDevEncounterFilter: (type: MapNode['type'], enabled: boolean) => void
  setDevPlayerPosition: (position: { x: number; y: number }) => void
  regenerateMapNodes: () => void
  equipItem: (itemId: string) => void
  unequipItem: (slot: ItemSlot) => void
  setLifeSlider: (stat: keyof ProgressionState['lifeStats'], value: number) => void
  resolveSelectedEncounter: () => ResolveEncounterOutcome | null
  resolveSelectedNodeDirectly: () => ResolveEncounterOutcome | null
  getItemComparison: (candidate: Item) => ReturnType<typeof compareItems>
}

const INVENTORY_CAP = 24

const initialMapNodes = (): MapNode[] => [
  { id: 'node_1', type: 'standard_fight', state: 'available', position: { x: 15, y: 20 }, encounterId: 'street_scavenger_pack' },
  { id: 'node_2', type: 'elite_fight', state: 'available', position: { x: 50, y: 18 }, encounterId: 'warehouse_enforcer' },
  { id: 'node_3', type: 'standard_fight', state: 'available', position: { x: 74, y: 30 }, encounterId: 'alley_hunters' },
  { id: 'node_4', type: 'common_chest', state: 'available', position: { x: 30, y: 42 }, reward: 'Salvage Cache' },
  { id: 'node_5', type: 'shrine', state: 'available', position: { x: 61, y: 46 }, reward: 'Haste Shrine' },
  { id: 'node_6', type: 'standard_fight', state: 'available', position: { x: 18, y: 64 }, encounterId: 'broken_rotor_swarm' },
  { id: 'node_7', type: 'elite_fight', state: 'available', position: { x: 49, y: 72 }, encounterId: 'night_market_duelists' },
  { id: 'node_8', type: 'timed_chest', state: 'expired', position: { x: 78, y: 67 }, reward: 'Timed Spoils' },
]

const addFeedEntry = (entries: FeedEntry[], entry: Omit<FeedEntry, 'id' | 'timestamp'>): FeedEntry[] => [
  {
    ...entry,
    id: `feed_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    timestamp: Date.now(),
  },
  ...entries,
].slice(0, 30)

const applyProgressionLayer = (hero: HeroState, progression: ProgressionState): HeroState =>
  applyProgressionToHero(recalculateHeroStats(hero), progression)

const createInitialState = (): SaveData => {
  const baseHero = ARCHETYPE_STARTERS.thorns_warden
  const progression = createDefaultProgression()
  const hero = applyProgressionLayer(baseHero, progression)
  const starterInventory = [
    generateItem('weapon_iron_sword', Rarity.Common, 91),
    generateItem('armor_bastion_plate', Rarity.Magic, 92),
    generateItem('ring_precision', Rarity.Rare, 93),
  ]

  return {
    hero,
    inventory: starterInventory,
    equippedItems: hero.equippedItems,
    mapState: initialMapNodes(),
    feedEntries: [
      {
        id: 'feed_boot',
        timestamp: Date.now() - 60_000,
        type: 'passive_summary',
        summary: 'You patrolled nearby streets. 3 opportunities are available.',
      },
    ],
    lastSaveTimestamp: Date.now(),
    progression,
  }
}

const normalizeState = (saveData: SaveData | null): SaveData => {
  if (!saveData) return createInitialState()

  const rawProgression = (saveData as SaveData & { level?: number; xp?: number }).progression
    ?? {
      level: (saveData as SaveData & { level?: number }).level ?? 1,
      xp: (saveData as SaveData & { xp?: number }).xp ?? 0,
      lifeStats: { vitality: 0, focus: 0, exploration: 0 },
    }

  return {
    ...saveData,
    hero: applyProgressionLayer({ ...saveData.hero, equippedItems: saveData.equippedItems }, rawProgression),
    progression: {
      level: rawProgression.level,
      xp: rawProgression.xp,
      lifeStats: {
        vitality: rawProgression.lifeStats?.vitality ?? 0,
        focus: rawProgression.lifeStats?.focus ?? 0,
        exploration: rawProgression.lifeStats?.exploration ?? 0,
      },
    },
  }
}

const GameStateContext = createContext<GameStateContextValue | null>(null)

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SaveData>(() => normalizeState(loadGame()))
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [playerMode, setPlayerMode] = useState<PlayerMode>('active')
  const [devPlayerPosition, setDevPlayerPosition] = useState({ x: 50, y: 50 })
  const [devEncounterFilters, setDevEncounterFilters] = useState<DevEncounterFilter>({
    standard_fight: true,
    elite_fight: true,
    common_chest: true,
    timed_chest: true,
    cursed_chest: true,
    shrine: true,
  })

  useEffect(() => {
    saveGame({ ...state, lastSaveTimestamp: Date.now() })
  }, [state])

  const selectMapNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  const clearSelectedNode = useCallback(() => setSelectedNodeId(null), [])

  const equipItem = useCallback((itemId: string) => {
    setState((current) => {
      const candidate = current.inventory.find((item) => item.instanceId === itemId)
      if (!candidate) return current

      const baseHeroWithItem = applyEquipItem({ ...current.hero, equippedItems: current.equippedItems }, candidate)
      const heroWithItem = applyProgressionToHero(baseHeroWithItem, current.progression)
      const nextInventory = current.inventory.filter((item) => item.instanceId !== itemId)
      const replaced = current.equippedItems[candidate.slot]
      if (replaced && nextInventory.length < INVENTORY_CAP) {
        nextInventory.push(replaced)
      }

      return {
        ...current,
        hero: heroWithItem,
        inventory: nextInventory,
        equippedItems: heroWithItem.equippedItems,
      }
    })
  }, [])

  const unequipItem = useCallback((slot: ItemSlot) => {
    setState((current) => {
      const equipped = current.equippedItems[slot]
      if (!equipped || current.inventory.length >= INVENTORY_CAP) {
        return current
      }

      const baseHeroWithoutItem = applyUnequipItem({ ...current.hero, equippedItems: current.equippedItems }, slot)
      const heroWithoutItem = applyProgressionToHero(baseHeroWithoutItem, current.progression)
      return {
        ...current,
        hero: heroWithoutItem,
        inventory: [...current.inventory, equipped],
        equippedItems: heroWithoutItem.equippedItems,
      }
    })
  }, [])

  const setLifeSlider = useCallback((stat: keyof ProgressionState['lifeStats'], value: number) => {
    setState((current) => {
      const progression = setLifeStat(current.progression, stat, value)
      return {
        ...current,
        progression,
        hero: applyProgressionToHero(recalculateHeroStats({ ...current.hero, equippedItems: current.equippedItems }), progression),
      }
    })
  }, [])

  const setDevEncounterFilter = useCallback((type: MapNode['type'], enabled: boolean) => {
    setDevEncounterFilters((current) => ({ ...current, [type]: enabled }))
  }, [])

  const regenerateMapNodes = useCallback(() => {
    setState((current) => ({
      ...current,
      mapState: initialMapNodes().map((node) => ({
        ...node,
        state: 'available',
        position: {
          x: Math.min(90, Math.max(10, node.position.x + Math.round((Math.random() - 0.5) * 12))),
          y: Math.min(90, Math.max(10, node.position.y + Math.round((Math.random() - 0.5) * 12))),
        },
      })),
      feedEntries: addFeedEntry(current.feedEntries, {
        type: 'passive_summary',
        summary: 'Dev Mode map refresh complete. Local test nodes regenerated.',
      }),
    }))
    setSelectedNodeId(null)
  }, [])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return state.mapState.find((entry) => entry.id === selectedNodeId) ?? null
  }, [selectedNodeId, state.mapState])

  const selectedEncounter = useMemo(() => {
    if (!selectedNode) return null
    const node = selectedNode
    if (!node || !node.encounterId || node.state !== 'available') return null

    const encounter = resolveEncounterTemplate(node.encounterId)
    return {
      node,
      danger: calcDangerRating(state.hero, encounter, 40),
      encounterName: encounter.name ?? node.id,
      enemies: encounter.enemies.enemies,
    }
  }, [selectedNode, state.hero])

  const resolveSelectedEncounter = useCallback((): ResolveEncounterOutcome | null => {
    if (!selectedNodeId) return null

    let outcome: ResolveEncounterOutcome | null = null

    setState((current) => {
      const node = current.mapState.find((entry) => entry.id === selectedNodeId)
      if (!node || !node.encounterId || node.state !== 'available') {
        return current
      }

      const encounter = resolveEncounterTemplate(node.encounterId)
      const result = simulateBattle(current.hero, encounter.enemies.enemies, Date.now())
      const loot = result.winner === 'hero' ? resolveEncounterReward(encounter, current.hero, Date.now()) : []
      const freeSlots = Math.max(0, INVENTORY_CAP - current.inventory.length)
      const lootToAdd = loot.slice(0, freeSlots)
      outcome = { result, loot: lootToAdd }

      const xpReward = result.winner === 'hero' ? getEncounterXpReward(node.type) : 0
      const progression = gainXp(current.progression, xpReward)
      const heroWithProgression = progression === current.progression
        ? current.hero
        : applyProgressionToHero(recalculateHeroStats({ ...current.hero, equippedItems: current.equippedItems }), progression)

      return {
        ...current,
        progression,
        hero: heroWithProgression,
        inventory: [...current.inventory, ...lootToAdd],
        mapState: current.mapState.map((entry) => (entry.id === node.id ? { ...entry, state: 'cleared' } : entry)),
        feedEntries: addFeedEntry(
          addFeedEntry(current.feedEntries, {
            type: result.winner === 'hero' ? 'fight_won' : 'fight_lost',
            summary:
              result.winner === 'hero'
                ? `${encounter.name} cleared. HP left: ${Math.round(result.hpRemaining)}. +${xpReward} XP.`
                : `${encounter.name} failed. Regroup before retrying.`,
          }),
          lootToAdd.length > 0
            ? {
                type: 'loot_found',
                summary: `Loot recovered: ${lootToAdd.map((entry) => entry.name).join(', ')}.`,
                loot: lootToAdd,
              }
            : {
                type: 'opportunity_missed',
                summary: 'No loot recovered from this encounter.',
              },
        ),
      }
    })

    return outcome
  }, [selectedNodeId])

  const resolveSelectedNodeDirectly = useCallback((): ResolveEncounterOutcome | null => {
    if (!selectedNodeId) return null

    let directOutcome: ResolveEncounterOutcome | null = null

    setState((current) => {
      const node = current.mapState.find((entry) => entry.id === selectedNodeId)
      if (!node || node.state !== 'available') {
        return current
      }

      if (node.encounterId) {
        const encounter = resolveEncounterTemplate(node.encounterId)
        const result = simulateBattle(current.hero, encounter.enemies.enemies, Date.now())
        const loot = result.winner === 'hero' ? resolveEncounterReward(encounter, current.hero, Date.now()) : []
        const freeSlots = Math.max(0, INVENTORY_CAP - current.inventory.length)
        const lootToAdd = loot.slice(0, freeSlots)
        directOutcome = { result, loot: lootToAdd }

        const xpReward = result.winner === 'hero' ? getEncounterXpReward(node.type) : 0
        const progression = gainXp(current.progression, xpReward)
        const heroWithProgression = progression === current.progression
          ? current.hero
          : applyProgressionToHero(recalculateHeroStats({ ...current.hero, equippedItems: current.equippedItems }), progression)

        return {
          ...current,
          progression,
          hero: heroWithProgression,
          inventory: [...current.inventory, ...lootToAdd],
          mapState: current.mapState.map((entry) => (entry.id === node.id ? { ...entry, state: 'cleared' } : entry)),
          feedEntries: addFeedEntry(current.feedEntries, {
            type: result.winner === 'hero' ? 'fight_won' : 'fight_lost',
            summary: `${encounter.name} force-resolved in Dev Mode (${result.winner}). +${xpReward} XP.`,
          }),
        }
      }

      if (node.type.includes('chest')) {
        const freeSlots = Math.max(0, INVENTORY_CAP - current.inventory.length)
        const chestLoot = freeSlots > 0 ? [generateItem('ring_precision', Rarity.Magic, Date.now())] : []
        directOutcome = {
          result: {
            winner: 'hero',
            turns: [],
            hpRemaining: current.hero.hp,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
          },
          loot: chestLoot,
        }

        return {
          ...current,
          inventory: [...current.inventory, ...chestLoot],
          mapState: current.mapState.map((entry) => (entry.id === node.id ? { ...entry, state: 'cleared' } : entry)),
          feedEntries: addFeedEntry(current.feedEntries, {
            type: 'loot_found',
            summary: `${node.reward ?? node.id} opened in Dev Mode.`,
            loot: chestLoot,
          }),
        }
      }

      if (node.type === 'shrine') {
        directOutcome = {
          result: {
            winner: 'hero',
            turns: [],
            hpRemaining: current.hero.hp,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
          },
          loot: [],
        }

        return {
          ...current,
          mapState: current.mapState.map((entry) => (entry.id === node.id ? { ...entry, state: 'cleared' } : entry)),
          feedEntries: addFeedEntry(current.feedEntries, {
            type: 'passive_summary',
            summary: `${node.reward ?? node.id} activated in Dev Mode.`,
          }),
        }
      }

      return current
    })

    return directOutcome
  }, [selectedNodeId])

  const visibleMapNodes = useMemo(
    () => (playerMode === 'dev' ? state.mapState.filter((node) => devEncounterFilters[node.type]) : state.mapState),
    [devEncounterFilters, playerMode, state.mapState],
  )

  const getItemComparison = useCallback(
    (candidate: Item) => compareItems(state.equippedItems[candidate.slot], candidate, state.hero),
    [state.equippedItems, state.hero],
  )

  const value = useMemo<GameStateContextValue>(
    () => ({
      state,
      mapNodes: state.mapState,
      visibleMapNodes,
      feedEntries: state.feedEntries,
      selectedNode,
      selectedNodeId,
      selectedEncounter,
      canAddInventoryItem: state.inventory.length < INVENTORY_CAP,
      playerMode,
      devEncounterFilters,
      devPlayerPosition,
      selectMapNode,
      clearSelectedNode,
      setPlayerMode,
      setDevEncounterFilter,
      setDevPlayerPosition,
      regenerateMapNodes,
      equipItem,
      unequipItem,
      setLifeSlider,
      resolveSelectedEncounter,
      resolveSelectedNodeDirectly,
      getItemComparison,
    }),
    [
      devEncounterFilters,
      devPlayerPosition,
      clearSelectedNode,
      equipItem,
      getItemComparison,
      playerMode,
      regenerateMapNodes,
      resolveSelectedNodeDirectly,
      resolveSelectedEncounter,
      selectedNode,
      selectMapNode,
      setDevEncounterFilter,
      setDevPlayerPosition,
      setLifeSlider,
      setPlayerMode,
      selectedEncounter,
      selectedNodeId,
      state,
      unequipItem,
      visibleMapNodes,
    ],
  )

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>
}

export const useGameState = (): GameStateContextValue => {
  const context = useContext(GameStateContext)
  if (!context) {
    throw new Error('useGameState must be used within GameStateProvider')
  }
  return context
}

export const useCombatSandbox = (): { archetypes: Record<string, HeroState>; enemies: typeof ENEMY_GROUPS } => ({
  archetypes: ARCHETYPE_STARTERS,
  enemies: ENEMY_GROUPS,
})
