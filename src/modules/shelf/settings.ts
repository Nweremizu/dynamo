import type { SettingDef } from "../../core/settings";

export const shelfSettings = {
	downloads: {
		key: "shelf.downloads",
		label: "shelf.downloads.label",
		description: "shelf.downloads.desc",
		default: true,
	},
} satisfies Record<string, SettingDef>;
