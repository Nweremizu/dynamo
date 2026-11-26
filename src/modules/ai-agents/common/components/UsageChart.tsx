import { type KeyboardEvent, memo, type PointerEvent, useRef, useState } from "react";
import { cn } from "../../../../core/cn";
import { useLocale, useT } from "../../../../core/i18n";
import { formatTokens } from "../format";
import { PANEL } from "../layout";
import { agentPaint, gradientAt } from "../paint";
import type { AgentDefinition, UsageHistory } from "../types";
import { RollingText } from "./Rolling";

/** Notches per gauge. */
const NOTCHES = 15;
/** Each notch's color: the gradient sampled at its height, the same in every column. */
const SHADES = Array.from({ length: NOTCHES }, (_, n) => gradientAt(n / (NOTCHES - 1)));

/**
 * The week as one vertical gauge per day (after bklit's notched gauge): its
 * notches light from the bottom, each in the agent's gradient at its height
 * (deep low, light high), the busiest day full.
 * The readout on the leading side holds the week's total; pointing at a day,
 * or arrowing along them, rolls it to that day's numbers (after devl's
 * Uptime Bars).
 */
// Memoized: the island re-renders on every provider update; `usage` only changes with the history.
export const UsageChart = memo(function UsageChart({ usage, agent }: { usage: UsageHistory; agent: AgentDefinition }) {
	const t = useT();
	const locale = useLocale();
	const days = usage.daily;
	const [active, setActive] = useState<number | null>(null);
	const gauges = useRef<HTMLDivElement>(null);
	if (!days.length) return null;

	const peak = Math.max(1, ...days.map((d) => d.tokens));
	const week = days.reduce((n, d) => n + d.tokens, 0);
	const weekResponses = days.reduce((n, d) => n + d.responses, 0);
	const last = days.length - 1;
	// Noon keeps the date from shifting across time zones.
	const dateOf = (i: number) => new Date(`${days[i].date}T12:00:00`);
	const dayName = new Intl.DateTimeFormat(locale, { weekday: "short" });
	const fullDate = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });
	const responses = (n: number) => t(n === 1 ? "agents.usage.response" : "agents.usage.responses", { n });

	const day = active === null ? null : days[active];
	const readout = day
		? {
				label: active === last ? t("agents.usage.today") : fullDate.format(dateOf(active as number)),
				value: formatTokens(day.tokens),
				sub: responses(day.responses),
			}
		: { label: t("agents.usage.week"), value: formatTokens(week), sub: responses(weekResponses) };

	/** The day under the pointer: the column whose leading edge it last passed. */
	const pick = (e: PointerEvent<HTMLDivElement>) => {
		const columns = Array.from(gauges.current?.children ?? []);
		let best = 0;
		columns.forEach((c, i) => {
			if (e.clientX >= c.getBoundingClientRect().left - 3) best = i;
		});
		setActive(best);
	};
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		const cur = active ?? last;
		const next =
			e.key === "ArrowLeft"
				? cur - 1
				: e.key === "ArrowRight"
					? cur + 1
					: e.key === "Home"
						? 0
						: e.key === "End"
							? last
							: null;
		if (e.key === "Escape") return setActive(null);
		if (next === null) return;
		e.preventDefault();
		setActive(Math.max(0, Math.min(last, next)));
	};

	return (
		<section
			className="flex items-stretch gap-5 rounded-2xl bg-card px-3.5 py-2.5 shadow-[inset_0_0_0_1px_var(--hairline)]"
			style={{ height: PANEL.usage, ...agentPaint(agent) }}
		>
			{/* Readout: the week, or the day being inspected. */}
			<div className="flex w-36 flex-none flex-col justify-between" aria-live="polite">
				<div className="flex flex-col gap-1.5">
					<span className="truncate text-[12px] font-medium text-muted-foreground first-letter:uppercase">
						{readout.label}
					</span>
					<span className="flex min-w-0 items-baseline gap-2">
						<RollingText text={readout.value} className="text-[24px] font-semibold tracking-[-0.02em]" />
						<span className="truncate text-[11px] text-muted-foreground tabular-nums">{readout.sub}</span>
					</span>
				</div>
				<span className="flex items-baseline gap-1.5 text-[11.5px] text-muted-foreground">
					{t("agents.usage.last5h")}
					<span className="font-medium text-foreground/85 tabular-nums">{formatTokens(usage.last5hTokens)}</span>
				</span>
			</div>

			<div
				ref={gauges}
				// A slider over the days: arrow keys move along them, the readout says the day.
				role="slider"
				tabIndex={0}
				aria-label={t("agents.usage.week")}
				aria-valuemin={0}
				aria-valuemax={last}
				aria-valuenow={active ?? last}
				aria-valuetext={`${readout.label}: ${readout.value}, ${readout.sub}`}
				className="flex min-w-0 flex-1 cursor-default justify-between gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onPointerMove={pick}
				onPointerDown={pick}
				onPointerLeave={() => setActive(null)}
				onKeyDown={onKeyDown}
				onBlur={() => setActive(null)}
			>
				{days.map((d, i) => (
					<Gauge
						key={d.date}
						index={i}
						level={d.tokens / peak}
						today={i === last}
						dimmed={active !== null && active !== i}
						label={i === last ? t("agents.usage.todayShort") : dayName.format(dateOf(i)).replace(".", "")}
					/>
				))}
			</div>
		</section>
	);
});

/**
 * One day: a column of notches lit up to `level` (0–1), the topmost lit one in part.
 * CSS transitions, not Motion: a chart is 105 notches, and Motion's per-element cost showed in profiles.
 */
const Gauge = memo(function Gauge({
	index,
	level,
	today,
	dimmed,
	label,
}: {
	index: number;
	level: number;
	today: boolean;
	dimmed: boolean;
	label: string;
}) {
	const lit = level * NOTCHES;
	return (
		<div
			className={cn(
				"flex min-w-0 flex-1 flex-col items-center gap-1.5 transition-opacity duration-150 ease-out",
				dimmed && "opacity-40",
			)}
		>
			<div className="flex w-full max-w-5.5 flex-1 flex-col-reverse gap-0.5">
				{Array.from({ length: NOTCHES }, (_, n) => {
					// Full, partly lit (the top of the reading) or off.
					const fill = Math.max(0, Math.min(1, lit - n));
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: a fixed stack of notches, never reordered
						<span key={n} className="relative min-h-0 flex-1 overflow-hidden rounded-[0.5px] max-h-0.5 bg-white/7">
							<span
								// Lights from the bottom up, day after day (`starting:` fades it in on first paint).
								className="absolute inset-0 rounded-[inherit] transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] starting:opacity-0 motion-reduce:transition-none"
								style={{ background: SHADES[n], opacity: fill, transitionDelay: `${index * 30 + n * 20}ms` }}
							/>
						</span>
					);
				})}
			</div>
			<span
				className={cn("text-[10.5px] leading-none text-muted-foreground", today && "font-semibold text-foreground")}
			>
				{label}
			</span>
		</div>
	);
});
