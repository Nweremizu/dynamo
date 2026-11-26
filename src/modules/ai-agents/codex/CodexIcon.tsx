import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "../../../core/cn";
import type { AgentStatus } from "../common/types";

/** Codex's mark, split in three so the prompt cut into it can move. */
const OUTLINE =
	"M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457z";
/** The `>` of the prompt. */
const CHEVRON =
	"M7.282 8.307a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393z";
/** The `_` cursor. */
const CURSOR = "M12.728 14.547a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z";

/**
 * Codex's mark in its gradient, its `>_` cut out of it:
 * - working: the cursor blinks and the `>` ticks forward, typing;
 * - waiting: the mark hops, the cursor blinking fast;
 * - done / limits reset: the cursor stretches once, a line finished;
 * - idle: still.
 * The endless loops are CSS (`styles.css`): Motion would tick them in JS every frame.
 */
export function CodexIcon({ size, state = "idle" }: { size: number; state?: AgentStatus }) {
	// The mask and gradient need document-unique ids; `useId`'s may hold characters `url()` dislikes.
	const id = `codex-${useId().replace(/[^\w-]/g, "")}`;
	const mask = `${id}-mask`;
	const paint = `${id}-paint`;
	const busy = state === "working" || state === "waiting";
	const finished = state === "done" || state === "limitsReset";

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden
			className={cn(state === "waiting" && "animate-codex-hop motion-reduce:animate-none")}
		>
			{/* The brand gradient, top to bottom; plain `currentColor` where no agent colors are set. */}
			<linearGradient id={paint} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" style={{ stopColor: "var(--agent-light, currentColor)" }} />
				<stop offset="0.5" style={{ stopColor: "var(--agent, currentColor)" }} />
				<stop offset="1" style={{ stopColor: "var(--agent-deep, currentColor)" }} />
			</linearGradient>
			<mask id={mask}>
				<rect width="24" height="24" fill="#fff" />
				<path
					d={CHEVRON}
					fill="#000"
					className={cn(state === "working" && "animate-codex-type motion-reduce:animate-none")}
				/>
				<motion.path
					key={finished ? state : "cursor"}
					d={CURSOR}
					fill="#000"
					style={{ transformBox: "fill-box", originX: 0, originY: 0.5 }}
					// Blinking in steps, like a terminal cursor; a fill closes the cut.
					className={cn(busy && (state === "waiting" ? "animate-codex-blink-fast" : "animate-codex-blink"))}
					initial={finished ? { scaleX: 0.3 } : false}
					animate={{ scaleX: 1 }}
					transition={{ scaleX: { type: "spring", duration: 0.45, bounce: 0.3 } }}
				/>
			</mask>
			<path d={OUTLINE} fill={`url(#${paint})`} mask={`url(#${mask})`} />
		</svg>
	);
}
