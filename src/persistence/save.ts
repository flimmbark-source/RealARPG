import type { SaveData } from '../types'

const STORAGE_KEY = 'realarpg_save_v1'

export const saveGame = (state: SaveData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const loadGame = (): SaveData | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as SaveData
  } catch {
    return null
  }
}

export const clearSavedGame = (): void => {
  localStorage.removeItem(STORAGE_KEY)
}
