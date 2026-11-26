import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChevronLeftIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router";
import { AppLogo } from "../../components/icons";
import { isTauri } from "../../core/bridge";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import type { PageMeta } from "../nav";

/** A Windows 11 caption button: 46×32, its Segoe Fluent glyph at 10px. */
const caption =
	"grid h-8 w-11.5 place-items-center font-glyph text-[10px] text-text transition-colors duration-100 ease-out";

/**
 * The window's title bar, Windows style (the window is frameless, see
 * `settings.rs`), and its drag handle: the app's mark and name over the
 * sidebar; a sub-page's back button and, once the page header has scrolled
 * away, the page's title; minimize and close in the top-right corner.
 */
export function TitleBar({ parent, title, showTitle }: { parent: PageMeta | null; title: string; showTitle: boolean }) {
	const t = useT();
	const navigate = useNavigate();
	const win = () => (isTauri ? getCurrentWindow() : null);

	return (
		<header className="flex h-11 flex-none" data-tauri-drag-region>
			<div
				className="flex w-56 flex-none items-center gap-2.5 bg-(--settings-sidebar) ps-4 shadow-[inset_-1px_0_0_var(--hairline)] max-[40rem]:w-15 max-[40rem]:justify-center max-[40rem]:ps-0"
				data-tauri-drag-region
			>
				<AppLogo size={18} className="pointer-events-none flex-none" />
				<span className="pointer-events-none text-[12px] text-text-dim max-[40rem]:sr-only">
					{t("settings.subtitle")}
				</span>
			</div>
			<div className="flex min-w-0 flex-1 items-center gap-1.5 ps-3" data-tauri-drag-region>
				{parent && (
					<button
						type="button"
						aria-label={t("settings.back", { page: t(parent.title) })}
						title={t("settings.back", { page: t(parent.title) })}
						className="grid size-8 flex-none place-items-center rounded-md text-text-dim transition-[background-color,color,scale] duration-150 ease-out hover:bg-(--settings-hover) hover:text-text active:scale-[0.96]"
						onClick={() => navigate(parent.path)}
					>
						<ChevronLeftIcon aria-hidden size={18} strokeWidth={2} />
					</button>
				)}
				<AnimatePresence initial={false}>
					{showTitle && (
						<motion.span
							key={title}
							aria-hidden
							className={cn("pointer-events-none truncate text-[13px] font-semibold", !parent && "ps-1")}
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 2 }}
							transition={{ duration: 0.15, ease: "easeOut" }}
						>
							{title}
						</motion.span>
					)}
				</AnimatePresence>
			</div>
			<div className="flex flex-none items-start">
				<button
					type="button"
					aria-label={t("settings.minimize")}
					title={t("settings.minimize")}
					className={cn(caption, "hover:bg-white/6 active:bg-white/4 active:text-text-dim")}
					onClick={() => win()?.minimize()}
				>
					{""}
				</button>
				<button
					type="button"
					aria-label={t("settings.close")}
					title={t("settings.close")}
					className={cn(caption, "hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/90 active:text-white/80")}
					onClick={() => win()?.close()}
				>
					{""}
				</button>
			</div>
		</header>
	);
}
