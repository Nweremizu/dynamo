import type { Transition } from "motion/react";
import type { Appearance } from "../../core/appearance";
import { OPEN, SETTLE } from "../../core/motion";
import type { IslandMode, ModuleEntry } from "../../core/types";

export interface Geo {
	width: number;
	height: number;
	radius: number;
	ear: number;
}

/** Everything that differs between the two looks (see `IslandStyle`). */
export interface Variant {
	idle: Geo;
	compact: Geo;
	expanded: Geo;
	tabBar: number;
	/** Gap between the top of the screen and the island. */
	top: number;
	tabsAtBottom: boolean;
	shellSpring: Transition;
	expandSpring: Transition;
}

/** Hangs from the top edge, notch-like, with concave ears. */
const DYNAMIC: Variant = {
	idle: { width: 180, height: 30, radius: 12, ear: 6 },
	compact: { width: 265, height: 38, radius: 16, ear: 8 },
	expanded: { width: 560, height: 190, radius: 32, ear: 18 },
	tabBar: 46,
	top: 0,
	tabsAtBottom: false,
	shellSpring: SETTLE,
	expandSpring: OPEN,
};

/** Windows Island: a floating pill, tabs at the bottom. */
const WINDOWS: Variant = {
	idle: { width: 140, height: 34, radius: 17, ear: 0 },
	compact: { width: 265, height: 38, radius: 19, ear: 0 },
	expanded: { width: 560, height: 190, radius: 34, ear: 0 },
	tabBar: 44,
	top: 8,
	tabsAtBottom: true,
	shellSpring: SETTLE,
	expandSpring: OPEN,
};
/** Windows Island at rest without the clock: a small, empty pill. */
const WINDOWS_BARE_IDLE: Geo = { width: 110, height: 30, radius: 15, ear: 0 };

/**
 * Tallest the island may grow (px). The window is `STRIP_HEIGHT` (640, see
 * `window.rs`) tall; the rest is room for the top gap, the shadow and the
 * spring's overshoot, so the bottom corners never get cut off.
 */
export const MAX_HEIGHT = 560;

export const BUBBLE = 38;
export const BUBBLE_GAP = 10;
/** Gap between ambient bubbles (px). */
const AMBIENT_GAP = 8;

export function variantOf(look: Appearance): Variant {
	return look.style === "windows" ? { ...WINDOWS, tabsAtBottom: look.tabsPosition === "bottom" } : DYNAMIC;
}

/** How much the resting island swells under the pointer, before it opens. */
const HOVER_GROW = { width: 14, height: 4 };

/** The resting island swells a little as soon as the pointer touches it. */
export function swell(g: Geo, hovered: boolean): Geo {
	return hovered ? { ...g, width: g.width + HOVER_GROW.width, height: g.height + HOVER_GROW.height } : g;
}

/** The island's size and shape in a given mode. */
export function geometry(
	v: Variant,
	look: Appearance,
	mode: IslandMode,
	bigSize: { width: number; height: number } | undefined,
	primary: ModuleEntry | undefined,
): Geo {
	switch (mode) {
		case "hidden":
		case "swallowed":
		case "idle":
			return look.style === "windows" && !look.idleClock ? WINDOWS_BARE_IDLE : v.idle;
		case "compact":
			return { ...v.compact, width: primary?.view.compact?.width ?? v.compact.width };
		case "peek":
		case "expanded": {
			const size = bigSize ?? v.expanded;
			const extra = mode === "expanded" ? v.tabBar : 0;
			return { ...v.expanded, width: size.width, height: Math.min(size.height + extra, MAX_HEIGHT) };
		}
	}
}

/** Width taken by the ambient bubbles left of the island. */
export function ambientWidth(count: number) {
	return count ? BUBBLE_GAP + count * BUBBLE + (count - 1) * AMBIENT_GAP : 0;
}

/** CSS corner radii: the notch-like look hangs from the top, so only its bottom is round. */
export function cornerRadius(g: Geo, windows: boolean) {
	const top = windows ? g.radius : 0;
	return {
		borderTopLeftRadius: top,
		borderTopRightRadius: top,
		borderBottomLeftRadius: g.radius,
		borderBottomRightRadius: g.radius,
	};
}
