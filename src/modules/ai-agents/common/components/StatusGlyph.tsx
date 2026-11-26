import { CircleAlertIcon, CircleCheckIcon, CircleDashedIcon, RotateCcwIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import { cn } from "../../../../core/cn";
import { agentPaint } from "../paint";
import type { AgentDefinition, AgentStatus } from "../types";

/** Icon swaps: scale, opacity and blur together, no bounce. */
const swap = {
	initial: { scale: 0.25, opacity: 0, filter: "blur(4px)" },
	animate: { scale: 1, opacity: 1, filter: "blur(0px)" },
	exit: { scale: 0.25, opacity: 0, filter: "blur(4px)" },
	transition: { type: "spring", duration: 0.3, bounce: 0 },
} as const;

/** A spinning arc: busy. */
function Spinner({ className, style }: { className?: string; style?: CSSProperties }) {
	return (
		<svg aria-hidden className={cn("animate-spin", className)} style={style} viewBox="0 0 16 16">
			<circle cx="8" cy="8" fill="none" opacity="0.2" r="6" stroke="currentColor" strokeWidth="2" />
			<path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
		</svg>
	);
}

/**
 * A session's state for list rows, where the agent is already known: a
 * spinner in the agent's color while working, an amber alert while it waits
 * for you, a green check when done.
 */
export function StatusIcon({ status, color, label }: { status: AgentStatus; color: string; label: string }) {
	return (
		<span className="relative grid size-4 flex-none place-items-center">
			<AnimatePresence initial={false} mode="popLayout">
				<motion.span key={status} className="grid" {...swap}>
					{status === "working" && <Spinner className="size-4" style={{ color }} />}
					{status === "waiting" && <CircleAlertIcon aria-hidden className="size-4 text-warning" />}
					{status === "done" && <CircleCheckIcon aria-hidden className="size-4 text-success" />}
					{status === "limitsReset" && <RotateCcwIcon aria-hidden className="size-4 text-success" />}
					{status === "idle" && <CircleDashedIcon aria-hidden className="size-4 text-muted-foreground/60" />}
				</motion.span>
			</AnimatePresence>
			<span className="sr-only">{label}</span>
		</span>
	);
}

/**
 * The agent's own icon, still, with its state around it: an orbiting arc
 * while working, a soft amber halo while waiting, a green check when done.
 */
export function StatusGlyph({
	agent,
	status,
	size = 20,
}: {
	agent: AgentDefinition;
	status: AgentStatus;
	size?: number;
}) {
	const ring = size + 8;
	return (
		<span className="relative grid flex-none place-items-center" style={{ width: size, height: size }}>
			{status === "working" && !agent.iconAnimates && (
				<Spinner className="absolute opacity-70" style={{ width: ring, height: ring, color: agent.color }} />
			)}
			{status === "waiting" && (
				<motion.span
					aria-hidden
					className="absolute rounded-full bg-warning/30"
					style={{ width: ring, height: ring }}
					animate={{ opacity: [0.9, 0.25, 0.9] }}
					transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
				/>
			)}
			<span className="relative grid text-(--agent)" style={agentPaint(agent)}>
				<agent.Icon size={size} state={status} />
			</span>
			<AnimatePresence initial={false}>
				{(status === "done" || status === "limitsReset") && (
					<motion.span
						className="absolute -right-1 -bottom-1 grid size-3 place-items-center rounded-full bg-success text-black shadow-[0_0_0_2px_var(--color-island)]"
						{...swap}
					>
						<svg aria-hidden viewBox="0 0 12 12" className="size-2">
							<path
								d="M2.5 6.5l2.2 2.2 4.8-5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.4"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</motion.span>
				)}
			</AnimatePresence>
		</span>
	);
}
