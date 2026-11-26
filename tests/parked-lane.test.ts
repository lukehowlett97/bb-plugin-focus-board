// The Parked lane: threads set aside to come back to. Pins the record
// parser, the lane's place on the board (after the idle lanes, before Done,
// on every grouping), Done winning over Parked, the bare rank key, and the
// card menu's Park / Unpark entry.
import { describe, expect, it, vi } from "vitest";
import { buildColumns } from "../components/grouping";
import { cardMenuActions, type CardMenuHandlers } from "../lib/card-menu";
import { parseParkedRecord, stampParked } from "../lib/parked-metadata";
import { columnRankKey } from "../lib/rank";
import { thread } from "./thread-fixture";

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const context = { projects: [], providers: [] };

describe("parked metadata", () => {
  it("absent and null read as not parked", () => {
    expect(parseParkedRecord(undefined)).toBeNull();
    expect(parseParkedRecord(null)).toBeNull();
  });

  it("round-trips a stamped record", () => {
    const record = stampParked(new Date(NOW));
    expect(parseParkedRecord(record)).toEqual({ parkedAt: new Date(NOW).toISOString() });
  });

  it("fails loud on a malformed record", () => {
    expect(() => parseParkedRecord("yes")).toThrow(/parked metadata/);
    expect(() => parseParkedRecord({ parkedAt: "not a date" })).toThrow(/parkedAt/);
  });
});

describe("the Parked column", () => {
  const threads = [
    thread({ id: "w", status: "active", updatedAt: NOW - 1000 }),
    thread({ id: "recent", updatedAt: NOW - 5 * 1000 }),
    thread({ id: "old", updatedAt: NOW - 3 * DAY }),
    thread({ id: "p1", updatedAt: NOW - 2 * HOUR }),
    thread({ id: "p2", updatedAt: NOW - 10 * DAY }),
    thread({ id: "d", updatedAt: NOW - 4 * DAY }),
  ];

  it("sits after the idle lanes and before Done under the attention grouping", () => {
    const columns = buildColumns(
      threads,
      "status",
      { ...context, parkedIds: new Set(["p1", "p2"]) },
      new Map(),
      new Set(["d"]),
      NOW,
    );
    expect(columns.map((column) => column.id)).toEqual([
      "working",
      "idle-recent",
      "idle-earlier",
      "parked",
      "done",
    ]);
    const parked = columns.find((column) => column.id === "parked");
    expect(parked?.label).toBe("Parked");
    expect(parked?.threads.map((entry) => entry.id)).toEqual(["p1", "p2"]);
  });

  it("shows a parked thread in Working while it runs, and keeps the mark", () => {
    const columns = buildColumns(
      threads,
      "status",
      { ...context, parkedIds: new Set(["w"]) },
      new Map(),
      new Set(),
      NOW,
    );
    expect(columns.find((column) => column.id === "parked")).toBeUndefined();
    expect(
      columns.find((column) => column.id === "working")?.threads.map((t) => t.id),
    ).toContain("w");
  });

  it("shows a done thread in Working while it runs", () => {
    const columns = buildColumns(
      threads,
      "status",
      context,
      new Map(),
      new Set(["w"]),
      NOW,
    );
    expect(columns.find((column) => column.id === "done")?.threads ?? []).toEqual([]);
    expect(
      columns.find((column) => column.id === "working")?.threads.map((t) => t.id),
    ).toContain("w");
  });

  it("Done wins when a thread carries both marks", () => {
    const columns = buildColumns(
      threads,
      "status",
      { ...context, parkedIds: new Set(["d"]) },
      new Map(),
      new Set(["d"]),
      NOW,
    );
    expect(columns.some((column) => column.id === "parked")).toBe(false);
    expect(columns.find((column) => column.id === "done")?.threads.map((t) => t.id)).toEqual([
      "d",
    ]);
  });

  it("appears on other groupings too, and not at all when nothing is parked", () => {
    const recency = buildColumns(
      threads,
      "recency",
      { ...context, parkedIds: new Set(["p1"]) },
      new Map(),
      new Set(),
      NOW,
    );
    expect(recency.at(-1)?.id).toBe("parked");
    const none = buildColumns(threads, "status", context, new Map(), new Set(), NOW);
    expect(none.some((column) => column.id === "parked")).toBe(false);
  });

  it("orders with a bare rank key, like Done and Pinned", () => {
    expect(columnRankKey("status", "parked")).toBe("parked");
    expect(columnRankKey("recency", "parked")).toBe("parked");
  });
});

describe("the card menu's Park entry", () => {
  const inputs = (isParked: boolean) => ({
    thread: {
      id: "thr_1",
      href: "/threads/thr_1",
      isPinned: false,
      isUnread: false,
      isArchived: false,
      parentThreadId: null,
    },
    isDone: false,
    isParked,
    isSnoozed: false,
    isKept: false,
    grouped: false,
    canClearError: false,
    inFamily: false,
  });
  const handlers = (togglePark?: () => void) =>
    ({
      zoomToFamily: vi.fn(),
      togglePinned: vi.fn(),
      toggleRead: vi.fn(),
      toggleDone: vi.fn(),
      togglePark,
      retryError: vi.fn(),
      ignoreError: vi.fn(),
      toggleSweepKeep: vi.fn(),
      makeTopLevel: vi.fn(),
      archive: vi.fn(),
      requestDelete: vi.fn(),
      revealBrowserTabs: vi.fn(),
      clearSnooze: vi.fn(),
      openSnoozePicker: vi.fn(),
      openGroupPicker: vi.fn(),
      openNewChild: vi.fn(),
      openInBrowser: vi.fn(),
    }) satisfies CardMenuHandlers;

  it("follows Mark Done and flips its label with the state", () => {
    const toggle = vi.fn();
    const ids = cardMenuActions(inputs(false), handlers(toggle)).map((entry) => entry.id);
    expect(ids.indexOf("park")).toBe(ids.indexOf("done") + 1);
    const park = cardMenuActions(inputs(false), handlers(toggle)).find((e) => e.id === "park")!;
    expect(park.label).toBe("Park");
    park.run();
    expect(toggle).toHaveBeenCalledTimes(1);
    const unpark = cardMenuActions(inputs(true), handlers(toggle)).find((e) => e.id === "park")!;
    expect(unpark.label).toBe("Unpark");
  });

  it("is absent when the surface wires no park handler", () => {
    const ids = cardMenuActions(inputs(false), handlers()).map((entry) => entry.id);
    expect(ids).not.toContain("park");
  });
});
