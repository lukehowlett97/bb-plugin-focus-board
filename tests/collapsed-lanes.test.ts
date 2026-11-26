import { describe, expect, it } from "vitest";
import { parseCollapsedLanes, toggleCollapsedLane } from "../lib/collapsed-lanes";

describe("collapsed lanes storage", () => {
  it("reads absent or malformed storage as nothing collapsed", () => {
    expect([...parseCollapsedLanes(null)]).toEqual([]);
    expect([...parseCollapsedLanes("not json")]).toEqual([]);
    expect([...parseCollapsedLanes('{"a":1}')]).toEqual([]);
    expect([...parseCollapsedLanes('["a", 3, "b"]')]).toEqual(["a", "b"]);
  });

  it("toggles a lane in and out, serializing sorted", () => {
    const once = toggleCollapsedLane(new Set(["z"]), "a");
    expect(once.serialized).toBe('["a","z"]');
    const twice = toggleCollapsedLane(once.next, "a");
    expect([...twice.next]).toEqual(["z"]);
  });
});
