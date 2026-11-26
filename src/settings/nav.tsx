import {
	CommandIcon,
	InfoIcon,
	LayoutGridIcon,
	MousePointerClickIcon,
	PaletteIcon,
	PuzzleIcon,
	SettingsIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { MessageKey } from "../core/i18n";

/** Tile colors: one per page, none sharing a hue with a status color. */
const tone = (top: string, bottom: string) => `linear-gradient(180deg, ${top}, ${bottom})`;

export interface PageMeta {
	path: string;
	title: MessageKey;
	icon: ReactNode;
	tone: string;
	/** Matches sub-pages too (a plugin's page under Plugins). */
	prefix?: boolean;
	/** The labels of the settings on the page, so search finds them. */
	keywords?: MessageKey[];
}

export const PAGES = {
	general: {
		path: "/",
		title: "settings.general",
		icon: <SettingsIcon />,
		tone: tone("#a1a1a7", "#6e6e74"),
		keywords: ["settings.language.label", "settings.autostart.label", "settings.monitor.label"],
	},
	appearance: {
		path: "/appearance",
		title: "appearance.title",
		icon: <PaletteIcon />,
		tone: "linear-gradient(180deg, var(--brand-light), var(--brand) 55%, var(--brand-deep))",
		keywords: [
			"appearance.style.label",
			"appearance.border.label",
			"appearance.thickness.label",
			"appearance.animate.label",
			"appearance.glow.label",
			"appearance.glass.label",
			"appearance.idleClock.label",
			"appearance.tabsPosition.label",
			"appearance.hide.label",
		],
	},
	behavior: {
		path: "/behavior",
		title: "behavior.title",
		icon: <MousePointerClickIcon />,
		tone: tone("#40a4ff", "#0b6ef0"),
		keywords: [
			"behavior.openOn.label",
			"behavior.closeOn.label",
			"settings.hideInFullscreen.label",
			"settings.avoidMaximized.label",
			"settings.returnToCenter.label",
			"settings.returnDelay.label",
		],
	},
	modules: {
		path: "/modules",
		title: "modules.title",
		icon: <LayoutGridIcon />,
		tone: tone("#d17cf7", "#a046dd"),
		keywords: ["layout.place"],
	},
	shortcuts: {
		path: "/shortcuts",
		title: "shortcuts.title",
		icon: <CommandIcon />,
		tone: tone("#86868c", "#58585e"),
	},
	plugins: {
		path: "/plugins",
		title: "plugins.title",
		icon: <PuzzleIcon />,
		tone: tone("#4fd3e9", "#1b9fbc"),
		prefix: true,
		keywords: ["plugins.tabs.marketplace", "plugins.tabs.sources"],
	},
	about: {
		path: "/about",
		title: "settings.about.title",
		icon: <InfoIcon />,
		tone: tone("#a1a1a7", "#6e6e74"),
		keywords: ["settings.about.updates.label", "settings.about.license", "settings.about.source"],
	},
} satisfies Record<string, PageMeta>;

export type PageId = keyof typeof PAGES;

/** Where a sub-page's back button leads: its parent page. */
export function parentOf(pathname: string): PageMeta | null {
	if (pathname.startsWith("/modules/")) return PAGES.modules;
	if (pathname.startsWith("/plugins/")) return PAGES.plugins;
	return null;
}
