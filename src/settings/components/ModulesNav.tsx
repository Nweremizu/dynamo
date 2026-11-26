import { ChevronRightIcon, PuzzleIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import { useOrderedModules } from "../../core/plugins/modules";
import { moduleEnabled, readSetting } from "../../core/settings";
import { usePersisted } from "../../core/usePersisted";
import { PAGES } from "../nav";
import { NavItem } from "./NavItem";

/** Whether the list is unfolded; folded at first, so the sidebar stays short. */
const OPEN_KEY = "settings.nav.modulesOpen";

/**
 * "Modules" in the sidebar, with every module folded under it: each module's
 * settings one click away instead of behind the modules list.
 */
export function ModulesNav({ values }: { values: Record<string, unknown> }) {
	const t = useT();
	const ordered = useOrderedModules(values);
	const [open, setOpen] = usePersisted(OPEN_KEY, false);
	const list = useId();

	return (
		<>
			<div className="relative">
				{/* Folded, "Modules" stays highlighted on a module's page; unfolded, the module is. */}
				<NavItem
					to={PAGES.modules.path}
					end={open}
					icon={PAGES.modules.icon}
					tone={PAGES.modules.tone}
					label={t(PAGES.modules.title)}
					className="pe-9 max-[40rem]:pe-1.5"
				/>
				<button
					type="button"
					aria-expanded={open}
					aria-controls={list}
					aria-label={t(open ? "settings.nav.fold" : "settings.nav.unfold")}
					title={t(open ? "settings.nav.fold" : "settings.nav.unfold")}
					className="absolute end-1 top-1/2 grid size-6 max-[40rem]:hidden -translate-y-1/2 place-items-center rounded-md text-text-dim transition-colors duration-150 hover:bg-white/10 hover:text-text"
					onClick={() => setOpen(!open)}
				>
					<ChevronRightIcon
						aria-hidden
						size={14}
						className={cn("transition-transform duration-200 ease-out", open && "rotate-90")}
					/>
				</button>
			</div>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						id={list}
						className="flex flex-col gap-px overflow-hidden"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
					>
						{ordered.map((m) => (
							<NavItem
								key={m.id}
								to={`/modules/${m.id}`}
								size="sm"
								icon={m.settingsIcon ?? <PuzzleIcon />}
								label={t(m.title)}
								off={!readSetting(values, moduleEnabled(m))}
							/>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
