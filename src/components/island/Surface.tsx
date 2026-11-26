import { AnimatePresence, motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import type { Appearance } from "../../core/appearance";
import { cn } from "../../core/cn";
import { SETTLE } from "../../core/motion";
import { GlassProbes } from "./GlassProbes";
import { cornerRadius, type Geo } from "./geometry";
import { glowStyle } from "./Rim";

/** The island's black body; its content blurs out and in whenever `contentKey` changes. */
export function Surface({
	g,
	big,
	look,
	transition,
	contentKey,
	rim,
	children,
}: {
	g: Geo;
	big: boolean;
	look: Appearance;
	transition: Transition;
	contentKey: string;
	rim: ReactNode;
	children: ReactNode;
}) {
	const windows = look.style === "windows";
	return (
		<motion.div
			data-glass
			className={cn(
				// Continuous corners; the glass behind is cut with circular ones.
				look.glass === "off" && "[corner-shape:superellipse(1.4)]",
				"absolute inset-0 overflow-hidden bg-island shadow-[0_14px_34px_-14px_rgba(0,0,0,0.7)] transition-shadow duration-400 ease-[ease]",
				big && "shadow-[0_26px_60px_-18px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.06)]",
			)}
			style={windows ? glowStyle(look) : undefined}
			initial={false}
			animate={cornerRadius(g, windows)}
			transition={transition}
		>
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.div
					key={contentKey}
					className="absolute top-0 left-1/2 origin-top -translate-x-1/2"
					style={{ width: g.width, height: g.height }}
					initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
					animate={{
						opacity: 1,
						scale: 1,
						filter: "blur(0px)",
						transition: {
							...SETTLE,
							opacity: { duration: 0.24, ease: "easeOut" },
							filter: { duration: 0.24, ease: "easeOut" },
						},
					}}
					exit={{
						opacity: 0,
						scale: 0.96,
						filter: "blur(6px)",
						transition: { duration: 0.14, ease: "easeOut" },
					}}
				>
					{children}
				</motion.div>
			</AnimatePresence>
			{rim}
			<GlassProbes />
		</motion.div>
	);
}
