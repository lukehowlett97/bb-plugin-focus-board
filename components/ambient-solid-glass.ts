// Ambient (brsbl/bb-plugins) paints a live WebGL scene behind bb and frosts
// bb's panes with `backdrop-filter: var(--ambient-blur)`. The scene moves, so
// the GPU re-blurs every frosted pane on every frame. Behind the board that is
// the whole content shell, under ~11k elements, and on a Retina screen it made
// the board lag while Ambient was on.
//
// While a board is mounted, this switches Ambient's glass to the solid tier it
// already defines for slow devices (`[data-ambient-glass="solid"]`): no blur,
// a near-opaque tint. The scene still shows at the window's edges; only the
// per-frame blur goes. It only sets Ambient's own custom properties, so with
// Ambient off it does nothing, and it is removed when the last board unmounts.
import { useEffect } from "react";

/** DOM id of the injected `<style>` element. */
export const AMBIENT_SOLID_GLASS_STYLE_ID = "focus-board-ambient-solid-glass";

/** `!important` because Ambient's own tier rules match with equal specificity. */
export const AMBIENT_SOLID_GLASS_RULE = `body.bb-app-shell:has(:is([data-columns-board], [data-parent-board])) {
  --ambient-blur: none !important;
  --ambient-glass-fill: var(--ambient-glass-solid) !important;
}`;

let mounted = 0;

/** Add the rule; returns a release that removes it when the last holder releases. */
export function holdAmbientSolidGlass(): () => void {
  mounted += 1;
  if (document.getElementById(AMBIENT_SOLID_GLASS_STYLE_ID) === null) {
    const style = document.createElement("style");
    style.id = AMBIENT_SOLID_GLASS_STYLE_ID;
    style.textContent = AMBIENT_SOLID_GLASS_RULE;
    document.head.append(style);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    mounted = Math.max(0, mounted - 1);
    if (mounted === 0) document.getElementById(AMBIENT_SOLID_GLASS_STYLE_ID)?.remove();
  };
}

/** Hold Ambient's solid glass for as long as the calling board is mounted. */
export function useAmbientSolidGlass(): void {
  useEffect(() => holdAmbientSolidGlass(), []);
}
