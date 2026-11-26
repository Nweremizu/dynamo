import { motion } from "motion/react";
import { useT } from "../../core/i18n";
import { SETTLE } from "../../core/motion";
import type { ModuleEntry } from "../../core/types";

/** Launcher grid: tiles per row, tile height and gap (px). */
const LAUNCHER_COLS = 4;
const TILE_H = 62;
const TILE_GAP = 8;

export function launcherSize(count: number) {
	const rows = Math.max(1, Math.ceil(count / LAUNCHER_COLS));
	return { width: 560, height: 32 + rows * TILE_H + (rows - 1) * TILE_GAP };
}

/** Every enabled module as a grid of tiles, in the chosen order. */
export function Launcher({ entries, onSelect }: { entries: ModuleEntry[]; onSelect: (id: string) => void }) {
	const t = useT();
	return (
		<div
			className="grid h-full"
			style={{ gridTemplateColumns: `repeat(${LAUNCHER_COLS}, 1fr)`, gridAutoRows: TILE_H, gap: TILE_GAP }}
		>
			{entries.map(({ module, view }, i) => (
				<motion.button
					key={module.id}
					className="relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/5 px-2 text-text-dim shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-[background,color,scale] duration-200 hover:bg-white/10 hover:text-text active:scale-95"
					initial={{ opacity: 0, scale: 0.92 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ ...SETTLE, delay: 0.015 * i }}
					onClick={(e) => {
						e.stopPropagation();
						onSelect(module.id);
					}}
				>
					<span className="grid h-5 place-items-center">{view.icon}</span>
					<span className="max-w-full truncate text-[11.5px] font-semibold">{t(module.title)}</span>
					{view.active && <span className="absolute top-2.25 right-2.25 size-1.25 rounded-full bg-ok" />}
				</motion.button>
			))}
		</div>
	);
}
