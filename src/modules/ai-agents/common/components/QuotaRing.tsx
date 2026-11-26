import { TriangleAlertIcon } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";
import { Meter, MeterLabel } from "../../../../components/coss/meter";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import { SETTLE } from "../../../../core/motion";
import { formatIn } from "../format";
import type { UsageLimit } from "../types";

const WARN = 75;
const CRITICAL = 90;

/**
 * A plan limit as a ring (after devl's Quota Ring): the agent's gradient, amber
 * past 75%, red past 90%, with the % inside and the reset beside it. A coss
 * Meter underneath, so it reads as one to assistive tech. Reads the agent's
 * colors from the `agentPaint` variables around it.
 */
export function QuotaRing({ limit, now, size = 40 }: { limit: UsageLimit; now: number; size?: number }) {
	const t = useT();
	const pct = Math.round(Math.max(0, Math.min(100, limit.usedPct)));
	const level = pct >= CRITICAL ? "critical" : pct >= WARN ? "warn" : "ok";
	const tone = level === "critical" ? "var(--color-destructive)" : level === "warn" ? "var(--color-warning)" : null;
	const paint = `ring-${useId().replace(/[^\w-]/g, "")}`;
	const stroke = size > 36 ? 4 : 3.5;
	const r = (size - stroke) / 2;
	const circ = 2 * Math.PI * r;
	const resets = limit.resetsAt && limit.resetsAt > now ? limit.resetsAt : null;

	return (
		<Meter value={pct} className="min-w-0 flex-row items-center gap-2.5">
			<span className="relative grid flex-none place-items-center" style={{ width: size, height: size }}>
				<svg aria-hidden className="-rotate-90" width={size} height={size}>
					{/* Turned a quarter like the ring, so light sits at the top and deep at the bottom. */}
					<linearGradient id={paint} x1="1" y1="0.5" x2="0" y2="0.5">
						<stop offset="0" style={{ stopColor: "var(--agent-light)" }} />
						<stop offset="0.5" style={{ stopColor: "var(--agent)" }} />
						<stop offset="1" style={{ stopColor: "var(--agent-deep)" }} />
					</linearGradient>
					<circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/10" />
					<motion.circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						strokeWidth={stroke}
						strokeLinecap="round"
						strokeDasharray={circ}
						stroke={tone ?? `url(#${paint})`}
						className="transition-[stroke] duration-300"
						initial={{ strokeDashoffset: circ }}
						animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
						transition={SETTLE}
					/>
				</svg>
				<span
					className={cn("absolute font-semibold tabular-nums", size > 36 ? "text-[11px]" : "text-[10px]")}
					style={tone ? { color: tone } : undefined}
				>
					{pct}
				</span>
			</span>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="flex min-w-0 items-center gap-1">
					<MeterLabel className="truncate text-[13px] font-medium">{limit.label}</MeterLabel>
					{tone && <TriangleAlertIcon aria-hidden className="size-3 flex-none" style={{ color: tone }} />}
				</span>
				<span className="truncate text-[11.5px] text-muted-foreground tabular-nums">
					{resets ? t("agents.limit.resetsIn", { time: formatIn(t, resets, now) }) : `${pct}%`}
				</span>
			</span>
		</Meter>
	);
}
