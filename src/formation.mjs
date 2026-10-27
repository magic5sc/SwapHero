/** Position 1–3 is the battlefield; 4–8 is the bench. */
export const isField = p => Number.isInteger(p) && p >= 1 && p <= 3;
export const isBench = p => Number.isInteger(p) && p >= 4 && p <= 8;

export function validateFormation(slots) {
  if (!Array.isArray(slots) || slots.length !== 8) throw new Error('Formation requires eight slots');
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
  return actionPoints > 0 && slots.slice(0, 3).includes(null) && slots.slice(3).some(Boolean);
}

/** The caller must resolve the returned entry event before accepting another action. */
export function reinforce(slots, actionPoints, from, to) {
  if (!mustReinforce(slots, actionPoints) || !isBench(from) || !isField(to) || !slots[from - 1] || slots[to - 1] !== null) throw new Error('Illegal reinforcement');
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
