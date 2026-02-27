import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { ENEMY_GROUPS } from '../data/combatFixtures'
import { calcDangerRating, resolveEncounterReward, resolveEncounterTemplate } from '../engine/encounters'
import { compareItems, equipItem as applyEquipItem, generateItem, unequipItem as applyUnequipItem } from '../engine/loot'
import { simulateBattle } from '../engine/combat'
import { loadGame, saveGame } from '../persistence/save'
import type { FeedEntry, Item, ItemSlot, MapNode, SaveData } from '../types'
import { ARCHETYPE_STARTERS } from '../data/combatFixtures'
import { Rarity, type HeroState } from '../types'

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
  feedEntries: FeedEntry[]
  selectedNodeId: string | null
  selectedEncounter: EncounterPreviewState | null
  canAddInventoryItem: boolean
  selectMapNode: (nodeId: string) => void
  clearSelectedNode: () => void
  equipItem: (itemId: string) => void
  unequipItem: (slot: ItemSlot) => void
  resolveSelectedEncounter: () => ResolveEncounterOutcome | null
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

const createInitialState = (): SaveData => {
  const hero = ARCHETYPE_STARTERS.thorns_warden
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
    xp: 0,
    level: 1,
  }
}

const GameStateContext = createContext<GameStateContextValue | null>(null)

const addFeedEntry = (entries: FeedEntry[], entry: Omit<FeedEntry, 'id' | 'timestamp'>): FeedEntry[] => [
  {
    ...entry,
    id: `feed_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    timestamp: Date.now(),
  },
  ...entries,
].slice(0, 30)

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SaveData>(() => loadGame() ?? createInitialState())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

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

      const heroWithItem = applyEquipItem(current.hero, candidate)
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

      const heroWithoutItem = applyUnequipItem(current.hero, slot)
      return {
        ...current,
        hero: heroWithoutItem,
        inventory: [...current.inventory, equipped],
        equippedItems: heroWithoutItem.equippedItems,
      }
    })
  }, [])

  const selectedEncounter = useMemo(() => {
    if (!selectedNodeId) return null
    const node = state.mapState.find((entry) => entry.id === selectedNodeId)
    if (!node || !node.encounterId || node.state !== 'available') return null

    const encounter = resolveEncounterTemplate(node.encounterId)
    return {
      node,
      danger: calcDangerRating(state.hero, encounter, 40),
      encounterName: encounter.name ?? node.id,
      enemies: encounter.enemies.enemies,
    }
  }, [selectedNodeId, state.hero, state.mapState])

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

      return {
        ...current,
        inventory: [...current.inventory, ...lootToAdd],
        mapState: current.mapState.map((entry) => (entry.id === node.id ? { ...entry, state: 'cleared' } : entry)),
        feedEntries: addFeedEntry(
          addFeedEntry(current.feedEntries, {
            type: result.winner === 'hero' ? 'fight_won' : 'fight_lost',
            summary:
              result.winner === 'hero'
                ? `${encounter.name} cleared. HP left: ${Math.round(result.hpRemaining)}.`
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

  const getItemComparison = useCallback(
    (candidate: Item) => compareItems(state.equippedItems[candidate.slot], candidate, state.hero),
    [state.equippedItems, state.hero],
  )

  const value = useMemo<GameStateContextValue>(
    () => ({
      state,
      mapNodes: state.mapState,
      feedEntries: state.feedEntries,
      selectedNodeId,
      selectedEncounter,
      canAddInventoryItem: state.inventory.length < INVENTORY_CAP,
      selectMapNode,
      clearSelectedNode,
      equipItem,
      unequipItem,
      resolveSelectedEncounter,
      getItemComparison,
    }),
    [
      clearSelectedNode,
      equipItem,
      getItemComparison,
      resolveSelectedEncounter,
      selectMapNode,
      selectedEncounter,
      selectedNodeId,
      state,
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
