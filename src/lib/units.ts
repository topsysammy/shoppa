/**
 * Units for item quantities (requirement I3, see note in phase 3 summary).
 * Groups and labels come from Figma screen 30 "Choose unit"; tuber, congo,
 * bunch and basket come from the brief. Any other text is a custom unit.
 * Count units pluralise ("2 tins"); weights and market measures don't
 * ("3 tuber", "2 paint"), matching Figma screens 21 and 33.
 */
export type UnitDef = { id: string; label: string; plural?: string; group: UnitGroup };
export type UnitGroup = 'count' | 'weight' | 'market';

export const unitGroups: Array<{ id: UnitGroup; label: string }> = [
  { id: 'count', label: 'Count' },
  { id: 'weight', label: 'Weight & volume' },
  { id: 'market', label: 'Market measures' },
];

export const units: UnitDef[] = [
  { id: 'piece', label: 'piece', plural: 'pieces', group: 'count' },
  { id: 'pack', label: 'pack', plural: 'packs', group: 'count' },
  { id: 'bottle', label: 'bottle', plural: 'bottles', group: 'count' },
  { id: 'box', label: 'box', plural: 'boxes', group: 'count' },
  { id: 'bag', label: 'bag', plural: 'bags', group: 'count' },
  { id: 'tin', label: 'tin', plural: 'tins', group: 'count' },
  { id: 'kg', label: 'kg', group: 'weight' },
  { id: 'g', label: 'g', group: 'weight' },
  { id: 'litre', label: 'litre', plural: 'litres', group: 'weight' },
  { id: 'ml', label: 'ml', group: 'weight' },
  { id: 'lb', label: 'lb', group: 'weight' },
  { id: 'oz', label: 'oz', group: 'weight' },
  { id: 'mudu', label: 'mudu', group: 'market' },
  { id: 'derica', label: 'derica', group: 'market' },
  { id: 'paint', label: 'paint', group: 'market' },
  { id: 'crate', label: 'crate', group: 'market' },
  { id: 'tuber', label: 'tuber', group: 'market' },
  { id: 'congo', label: 'congo', group: 'market' },
  { id: 'bunch', label: 'bunch', group: 'market' },
  { id: 'basket', label: 'basket', group: 'market' },
];

const byId = new Map(units.map((u) => [u.id, u]));

/** Quick-pick chips on screen 14 (Quick add · details) when the user hasn't chosen any. */
export const quickUnits = ['piece', 'kg', 'bag', 'pack'];

export type UnitPrefs = { quick: string[]; market: string[] };
export type UnitSystem = 'metric' | 'imperial';

/** Screen 59 defaults (Figma "Default units" and "My market measures"). */
export const defaultUnitPrefs: UnitPrefs = {
  quick: ['piece', 'pack', 'bottle', 'kg', 'g', 'litre', 'ml', 'box', 'bag'],
  market: ['mudu', 'derica', 'paint', 'crate', 'tuber', 'congo', 'bunch', 'basket'],
};

/**
 * Units shown in the picker for this user: count units, weight and volume
 * for their measurement system, and their own market measures (including
 * custom ones they added on screen 59).
 */
export function unitsFor(prefs: UnitPrefs | undefined, system: UnitSystem | undefined): UnitDef[] {
  const p = prefs ?? defaultUnitPrefs;
  const imperial = system === 'imperial';
  const weight = imperial ? ['lb', 'oz', 'kg', 'litre'] : ['kg', 'g', 'litre', 'ml'];
  const out: UnitDef[] = units.filter((u) => u.group === 'count');
  for (const id of weight) out.push(byId.get(id)!);
  for (const id of p.market) out.push(byId.get(id) ?? { id, label: id, group: 'market' });
  return out;
}

/** Quick chips for screen 14: the user's first four default units. */
export const quickFor = (prefs: UnitPrefs | undefined) => (prefs?.quick?.length ? prefs.quick.slice(0, 4) : quickUnits);

export function findUnit(id: string | null | undefined): UnitDef | undefined {
  return id ? byId.get(id) : undefined;
}

/** Chip label in the picker: Figma shows count units in the plural. */
export function unitChipLabel(id: string): string {
  const u = byId.get(id);
  return u ? (u.plural ?? u.label) : id;
}

function formatNumber(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(2).replace(/\.?0+$/, '');
}

/** "2 tins", "3 tuber", "1.5 kg", "2" or "" when nothing is set. */
export function formatQuantity(quantity: number | null | undefined, unit: string | null | undefined): string {
  const u = findUnit(unit);
  const label = u ? (quantity != null && quantity !== 1 && u.plural ? u.plural : u.label) : (unit ?? '');
  if (quantity == null) return label;
  return label ? `${formatNumber(quantity)} ${label}` : formatNumber(quantity);
}

/** Stepper step: 0.5 for kg/litre, otherwise 1. */
export function stepFor(unit: string | null | undefined): number {
  return unit === 'kg' || unit === 'litre' ? 0.5 : 1;
}
