import type { NotificationItem } from "./types";

/** One app's notifications, newest first: shown as a single card with the rest stacked under it. */
export interface AppStack {
	key: string;
	app: string;
	logo: string | null;
	items: NotificationItem[];
	unread: number;
}

/** Groups notifications by the app that sent them; the app with the newest one comes first. */
export function stacksOf(items: NotificationItem[]): AppStack[] {
	const stacks = new Map<string, AppStack>();
	for (const item of [...items].sort((a, b) => b.receivedAt - a.receivedAt)) {
		const key = item.aumid || item.app;
		const stack = stacks.get(key) ?? { key, app: item.app, logo: item.logo, items: [], unread: 0 };
		stack.items.push(item);
		stack.logo ??= item.logo;
		if (!item.read) stack.unread++;
		stacks.set(key, stack);
	}
	return [...stacks.values()];
}

/** Brand colors for the monogram drawn when Windows has no icon for the app. */
const BRANDS: [string, string][] = [
	["whatsapp", "#25D366"],
	["discord", "#5865F2"],
	["outlook", "#0F78D4"],
	["teams", "#5B5FC7"],
	["telegram", "#2AABEE"],
	["slack", "#E01E5A"],
	["gmail", "#EA4335"],
	["signal", "#3A76F0"],
	["spotify", "#1DB954"],
	["zoom", "#0B5CFF"],
];
const OTHERS = ["#0A84FF", "#30D158", "#FFD60A", "#FF9F0A", "#64D2FF"];

/** A steady color per app: its brand's, or one picked from its name. */
export function appColor(app: string): string {
	const name = app.toLowerCase();
	const brand = BRANDS.find(([key]) => name.includes(key));
	if (brand) return brand[1];
	let hash = 0;
	for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	return OTHERS[hash % OTHERS.length];
}

/** Black or white, whichever reads on `hex`. */
export function inkOn(hex: string): string {
	const n = Number.parseInt(hex.slice(1), 16);
	const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
	return lum > 0.62 ? "#000" : "#fff";
}
