// Parked-record helpers for the board's Parked lane: threads the operator
// wants to come back to, set aside out of the age lanes.
//
// Parked = per-thread plugin metadata in the board's own namespace: key
// "parked" → { parkedAt: ISO-8601 string }. Absent key = not parked. Parked
// and Done are mutually exclusive: writing one clears the other (server.ts
// writeDoneRecord / writeParkedRecord). Not to be confused with the pin-park
// record (lib/pin-park.ts, key "pin"), which remembers a pin a lane exit
// took away. Pure helpers, no host or SDK, so the RPC layer and tests drive
// them directly.
import type { JsonValue } from "@get-bb/plugin-sdk";

/** The board's Parked key inside its thread plugin-metadata namespace. */
export const PARKED_METADATA_KEY = "parked";

/** The settled record shape: key "parked" → { parkedAt: ISO-8601 }. */
export type ParkedRecord = { parkedAt: string };

/**
 * Parse a metadata value into a ParkedRecord. Absent and null mean "not
 * parked" → null. A malformed present value throws, the same fail-loud
 * contract parseDoneRecord holds.
 */
export function parseParkedRecord(value: JsonValue | undefined): ParkedRecord | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    const got = Array.isArray(value) ? "array" : typeof value;
    throw new Error(`parked metadata: expected object, got ${got}`);
  }
  const parkedAt = (value as { [key: string]: JsonValue })["parkedAt"];
  if (typeof parkedAt !== "string" || Number.isNaN(Date.parse(parkedAt))) {
    throw new Error(`parked metadata: invalid parkedAt ${JSON.stringify(parkedAt)}`);
  }
  return { parkedAt };
}

/** Stamp a fresh parked record: parkedAt = now. */
export function stampParked(now: Date): ParkedRecord {
  return { parkedAt: now.toISOString() };
}
