// Collapsed lanes: which board lanes the operator folded to their header.
//
// Stored per browser in localStorage under one key as a JSON array of lane
// rank keys (columnRankKey(groupBy, columnId)), so a lane folded under one
// grouping stays independent of a same-named lane under another. Pure
// parse/toggle helpers here; components/board wires them to state.

export const COLLAPSED_LANES_KEY = "focus-board:collapsedLanes";

/** Parse the stored value; anything malformed reads as "nothing collapsed". */
export function parseCollapsedLanes(raw: string | null): ReadonlySet<string> {
  if (raw === null) return new Set();
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter((entry): entry is string => typeof entry === "string"));
  } catch {
    return new Set();
  }
}

/** The set with `key` flipped, and its serialized form for storage. */
export function toggleCollapsedLane(
  current: ReadonlySet<string>,
  key: string,
): { next: ReadonlySet<string>; serialized: string } {
  const next = new Set(current);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return { next, serialized: JSON.stringify([...next].sort()) };
}
