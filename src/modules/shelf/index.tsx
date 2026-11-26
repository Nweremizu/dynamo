import { ArrowDownToLineIcon, FolderIcon } from "lucide-react";
/**
 * Shelf — like the notch apps on the Mac: drag files or folders onto the
 * island and it keeps them for a moment (by reference, nothing is copied).
 * Drag them out to any app, double-click to open, or ask Claude about them.
 * It also follows browser downloads and keeps each finished one here.
 * Backend: `src-tauri/src/providers/shelf.rs` and `shelf/downloads.rs`.
 */
import { useProvider } from "../../core/bridge";
import { useLocale, useT } from "../../core/i18n";
import { draggingFiles } from "../../core/island";
import type { IslandModule, ModuleView } from "../../core/types";
import { formatRate } from "../monitor/components/MonitorPanel";
import { SHELF_PROVIDER, type ShelfState } from "./actions";
import { ShelfPanel } from "./components/ShelfPanel";
import { shelfSettings } from "./settings";

const SHELF_BLUE = "#64D2FF";
const PER_ROW = 5;
const ROW = 100;
const DOWNLOAD_ROW = 44;

export const shelfModule: IslandModule = {
	id: "shelf",
	title: "shelf.title",
	settingsIcon: <FolderIcon size={14} />,
	settings: Object.values(shelfSettings),
	useView(): ModuleView {
		const t = useT();
		const locale = useLocale();
		const state = useProvider<ShelfState>(SHELF_PROVIDER);
		const dragging = draggingFiles.use();
		const count = state?.items.length ?? 0;
		const downloads = state?.downloads ?? [];
		const rows = Math.min(2, Math.max(1, Math.ceil(count / PER_ROW)));
		const first = downloads[0];

		return {
			// A download in progress shows in the closed island, behind music and agents.
			active: !!first,
			priority: 25,
			// Shows up once it holds something, or while files are dragged over the island.
			hidden: count === 0 && !dragging && !first,
			accent: SHELF_BLUE,
			icon: <FolderIcon size={14} color={SHELF_BLUE} />,
			compact: first
				? {
						left: (
							<span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
								<ArrowDownToLineIcon size={15} color={SHELF_BLUE} className="flex-none" />
								<span className="truncate">
									{downloads.length > 1 ? t("shelf.downloading", { n: downloads.length }) : first.name}
								</span>
							</span>
						),
						right: (
							<span className="text-[12.5px] font-semibold whitespace-nowrap text-[#9be3ff] tabular-nums">
								{formatRate(
									downloads.reduce((s, d) => s + d.speed, 0),
									locale,
								)}
							</span>
						),
						width: 300,
					}
				: undefined,
			expanded: <ShelfPanel state={state} />,
			expandedSize: { width: 560, height: 54 + rows * ROW + Math.min(downloads.length, 2) * DOWNLOAD_ROW },
			// A finished download peeks, showing it on the shelf.
			activityKey: state?.finished ?? undefined,
		};
	},
};
