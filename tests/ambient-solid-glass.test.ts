// @vitest-environment jsdom
// While a board is mounted, Ambient's frosted glass drops to its solid tier so
// the GPU stops re-blurring the whole board on every scene frame. The rule is
// injected once however many boards mount, and removed with the last one.
import { afterEach, describe, expect, it } from "vitest";
import {
  AMBIENT_SOLID_GLASS_RULE,
  AMBIENT_SOLID_GLASS_STYLE_ID,
  holdAmbientSolidGlass,
} from "../components/ambient-solid-glass";

const style = () => document.getElementById(AMBIENT_SOLID_GLASS_STYLE_ID);

describe("ambient solid glass", () => {
  afterEach(() => style()?.remove());

  it("injects one rule while held and removes it with the last holder", () => {
    const first = holdAmbientSolidGlass();
    const second = holdAmbientSolidGlass();
    expect(document.querySelectorAll(`#${AMBIENT_SOLID_GLASS_STYLE_ID}`)).toHaveLength(1);
    first();
    expect(style()).not.toBeNull();
    first();
    expect(style()).not.toBeNull();
    second();
    expect(style()).toBeNull();
  });

  it("only turns off Ambient's blur while a board is on the page", () => {
    expect(AMBIENT_SOLID_GLASS_RULE).toContain("--ambient-blur: none");
    expect(AMBIENT_SOLID_GLASS_RULE).toContain("[data-columns-board]");
    expect(AMBIENT_SOLID_GLASS_RULE).toContain("[data-parent-board]");
  });
});
