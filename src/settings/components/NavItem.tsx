import { motion } from "motion/react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import { SNAPPY } from "../../core/motion";
import { Tile } from "./Heading";

/** Group heading in the sidebar. */
export function NavSection({ label }: { label: string }) {
	return (
		<span className="px-2 pt-4 pb-1 text-[11px] font-semibold tracking-[0.01em] text-text-faint first:pt-1 max-[40rem]:sr-only">
			{label}
		</span>
	);
}

/**
 * Sidebar entry. `md`: a page, its icon on a colored tile; `sm`: a module
 * folded under Modules, its plain icon lined up with the label above. The
 * selection pill slides to whichever entry is active (`end: false` also
 * matches sub-pages). `detail` adds a second line (a search hit's setting).
 */
export function NavItem({
	to,
	icon,
	tone,
	label,
	detail,
	off,
	end = true,
	size = "md",
	className,
}: {
	to: string;
	icon: ReactNode;
	tone?: string;
	label: string;
	detail?: string;
	off?: boolean;
	end?: boolean;
	size?: "md" | "sm";
	className?: string;
}) {
	const t = useT();
	return (
		<NavLink
			to={to}
			end={end}
			title={label}
			className={({ isActive }) =>
				cn(
					"relative flex cursor-pointer items-center rounded-lg text-start font-medium text-text no-underline transition-colors duration-150 ease-out [-webkit-user-drag:none]",
					size === "sm"
						? "min-h-7 gap-2 ps-9 pe-2 text-[12.5px] max-[40rem]:hidden"
						: "min-h-8 gap-2.5 px-1.5 py-1 text-[13px] max-[40rem]:justify-center",
					!isActive && "hover:bg-(--settings-hover)",
					isActive && "text-white",
					className,
				)
			}
		>
			{({ isActive }) => (
				<>
					{isActive && (
						<motion.span
							layoutId="nav-pill"
							className="absolute inset-0 rounded-[inherit] bg-(image:--settings-selected) shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
							transition={SNAPPY}
						/>
					)}
					{size === "sm" ? (
						<span
							aria-hidden
							className={cn(
								"relative grid w-4 flex-none place-items-center [&_img]:size-3.5 [&_svg]:size-3.5",
								!isActive && "text-text-dim",
								off && "opacity-50",
							)}
						>
							{icon}
						</span>
					) : (
						<span className="relative">
							<Tile tone={tone} size="sm">
								{icon}
							</Tile>
						</span>
					)}
					<span className="relative flex min-w-0 flex-1 flex-col max-[40rem]:sr-only">
						<span className={cn("truncate", off && !isActive && "text-text-dim")}>{label}</span>
						{detail && (
							<span className={cn("truncate text-[11.5px] font-normal", isActive ? "text-white/80" : "text-text-dim")}>
								{detail}
							</span>
						)}
					</span>
					{/* Off is said in words, not only by the dimmed label. */}
					{off && (
						<span
							className={cn(
								"relative flex-none text-[11px] max-[40rem]:sr-only",
								isActive ? "text-white/80" : "text-text-faint",
							)}
						>
							{t("shortcuts.off")}
						</span>
					)}
				</>
			)}
		</NavLink>
	);
}
