/** Field 1–3, reserve 4–6; pairs are 1↔4, 2↔5, 3↔6. */
export const FIELD_SIZE = 3, SLOT_COUNT = 6;
export function reserveBehind(position) {
  if (!isField(position)) throw Error('Invalid field position');
  return position + FIELD_SIZE;
}
export function fieldAhead(position) {
  if (!isBench(position)) throw Error('Invalid reserve position');
  return position - FIELD_SIZE;
}
// Old eight-slot formations are accepted only when the removed slots are empty.
// Never silently discard or relocate units in positions 7/8.
export function migrateFormation(slots) {
  if (!Array.isArray(slots)) throw Error('Formation must be an array');
  if (slots.length === 8) {
    if (slots.slice(6).some(x => x !== null)) throw Error('旧编队7/8号位有单位，请重新编队；三格备战区不能自动截断单位');
    slots = slots.slice(0, SLOT_COUNT);
  }
  validateFormation(slots);
  return [...slots];
}
export const isField = p => Number.isInteger(p) && p >= 1 && p <= 3;
export const isBench = p => Number.isInteger(p) && p >= 4 && p <= SLOT_COUNT;

export function validateFormation(slots) {
  if (!Array.isArray(slots) || slots.length !== SLOT_COUNT) throw new Error('Formation requires six slots');
  const ids = slots.filter(x => x !== null);
  if (ids.some(x => typeof x !== 'string' || !x) || new Set(ids).size !== ids.length) throw new Error('Units must have unique non-empty IDs');
}

/** During deployment any two positions may be swapped, including empty ones. */
export function deploySwap(slots, a, b) {
  validateFormation(slots);
  if (![a, b].every(p => isField(p) || isBench(p))) throw new Error('Invalid position');
  const next = [...slots];
  [next[a - 1], next[b - 1]] = [next[b - 1], next[a - 1]];
  return next;
}

/** Free bench rearrangement does not emit entry or exit events. */
export function swapBench(slots, a, b) {
  if (!isBench(a) || !isBench(b) || a === b) throw new Error('Select two distinct bench positions');
  validateFormation(slots);
  if (!slots[a - 1] || !slots[b - 1]) throw new Error('Both bench positions must contain a unit');
  return deploySwap(slots, a, b);
}

export function mustReinforce(slots, actionPoints) {
  validateFormation(slots);
  if (!Number.isInteger(actionPoints) || actionPoints < 0) throw new Error('Invalid action points');
  return actionPoints > 0 && !slots.slice(0, 3).some(Boolean) && slots.slice(3).some(Boolean);
}

/** The caller must resolve the returned entry event before accepting another action. */
export function reinforce(slots, actionPoints, from, to) {
  validateFormation(slots);
  if (!Number.isInteger(actionPoints) || actionPoints < 1 || !isBench(from) || !isField(to) || !slots[from - 1] || slots[to - 1] !== null) throw new Error('Illegal reinforcement');
  const unit = slots[from - 1];
  const next = deploySwap(slots, from, to);
  return { slots: next, actionPoints: actionPoints - 1, events: [{ type: 'enter', unit, position: to }], cannotAttackThisTurn: unit };
}

/** Exit and entry are produced in order after the complete exchange. */
export function exchange(slots, actionPoints, from, to) {
  validateFormation(slots);
  if (!Number.isInteger(actionPoints) || actionPoints < 1 || mustReinforce(slots, actionPoints) || !isBench(from) || !isField(to) || !slots[from - 1] || !slots[to - 1]) throw new Error('Illegal exchange');
  const entering = slots[from - 1], exiting = slots[to - 1];
  return { slots: deploySwap(slots, from, to), actionPoints: actionPoints - 1, events: [{ type: 'exit', unit: exiting, position: to }, { type: 'enter', unit: entering, position: to }], cannotAttackThisTurn: entering };
}
