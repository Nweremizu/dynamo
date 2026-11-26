/**
 * Sizes of the AI Agents panel's parts (px). The island sizes itself from
 * `panelHeight`, so the components draw at exactly these heights.
 */
export const PANEL = {
	/** The island's padding around a module's panel. */
	padding: 32,
	gap: 12,
	header: 28,
	overview: 128,
	usage: 96,
	/** "Sessions" over the list, with its gap. */
	sectionLabel: 22,
	row: 40,
	/** The permission card with and without a command to show. */
	permission: 160,
	permissionBare: 98,
	width: 620,
} as const;

export function panelHeight(o: { rows: number; usage: boolean; permission?: "detail" | "bare" }) {
	const list = PANEL.sectionLabel + Math.max(1, o.rows) * PANEL.row;
	if (o.permission) {
		return PANEL.padding + (o.permission === "detail" ? PANEL.permission : PANEL.permissionBare) + PANEL.gap + list;
	}
	return (
		PANEL.padding +
		PANEL.header +
		PANEL.gap +
		PANEL.overview +
		PANEL.gap +
		(o.usage ? PANEL.usage + PANEL.gap : 0) +
		list
	);
}
