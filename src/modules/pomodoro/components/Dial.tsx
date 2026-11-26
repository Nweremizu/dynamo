import { BellRingIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { formatElapsed, useNow } from "../../ai-agents/common/format";
import { progress, remaining, type Timer } from "../timer";

/**
 * The phase as a ring that fills as time passes, the time left in the middle.
 * Ringing, it shows a bell and breathes (still under reduced motion).
 */
export function Dial({ timer, size, label }: { timer: Timer; size: number; label?: string }) {
	const now = useNow(1000, timer.status === "running");
	const still = useReducedMotion();
	const ringing = timer.status === "ringing";
	const stroke = size > 40 ? 7 : 2.5;
	const r = (size - stroke) / 2;
	const circ = 2 * Math.PI * r;
	const done = progress(timer, now);
	const big = size > 40;

	return (
		<motion.span
			className="relative grid flex-none place-items-center"
			style={{ width: size, height: size }}
			animate={ringing && !still ? { scale: [1, 1.04, 1] } : { scale: 1 }}
			transition={ringing ? { duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" } : { duration: 0.2 }}
		>
			<svg aria-hidden className="absolute inset-0 -rotate-90" width={size} height={size}>
				<circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/10" />
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					strokeWidth={stroke}
					strokeLinecap="round"
					stroke="var(--phase)"
					strokeDasharray={circ}
					strokeDashoffset={circ * (1 - (ringing ? 1 : done))}
					className="transition-[stroke-dashoffset] duration-1000 ease-linear"
				/>
			</svg>
			{big && (
				<span className="relative flex flex-col items-center gap-0.5">
					{ringing ? (
						<BellRingIcon aria-hidden size={30} className="text-(--phase)" />
					) : (
						<span className="text-[26px]/none font-semibold tracking-[-0.02em] tabular-nums">
							{formatElapsed(remaining(timer, now) + 999)}
						</span>
					)}
					{label && <span className="text-[11px] font-medium text-text-dim">{label}</span>}
				</span>
			)}
		</motion.span>
	);
}
