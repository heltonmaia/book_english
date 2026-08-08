import type { Item, ItemId, Unit } from './types'

export const UNITS: Unit[] = []

export function unitById(id: number): Unit | undefined {
  return UNITS.find((u) => u.id === id)
}
export function allItems(): Item[] {
  return UNITS.flatMap((u) => u.items)
}
export function allItemIds(): ItemId[] {
  return allItems().map((i) => i.id)
}
export function itemById(id: ItemId): Item | undefined {
  return allItems().find((i) => i.id === id)
}
