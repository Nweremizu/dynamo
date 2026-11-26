import { FlameIcon, PauseIcon, PlayIcon, RotateCcwIcon, SkipForwardIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../../core/cn";
import { useT } from "../../../core/i18n";
import { formatDuration, PHASE_COLOR } from "../format";
import type { DayStats, Durations, Timer } from "../timer";
import { Dial } from "./Dial";

export interface PomodoroActions {
	start: () => void;
	pause: () => void;
	extend: () => void;
	reset: () => void;
	skip: () => void;
	/** After it rang: on to the next phase, started. */
	proceed: () => void;
}

const pill =
	"inline-flex h-8 flex-none items-center justify-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold whitespace-nowrap transition-[filter,background-color,scale] duration-150 ease-out active:scale-[0.96] [&_svg]:size-3.5";
const primary = `${pill} bg-(--phase) text-black hover:brightness-110`;
const secondary = `${pill} bg-white/9 text-text hover:bg-white/14`;
const round =
	"grid size-8 flex-none place-items-center rounded-full bg-white/7 text-text-dim transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/12 hover:text-text active:scale-[0.96] [&_svg]:size-3.75";

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
	return (
		<button type="button" className={round} aria-label={label} title={label} onClick={onClick}>
			{children}
		</button>
	);
}

/**
 * The Pomodoro tab: the dial, what phase this is and where it sits in the
 * cycle, today's progress toward the goal, and the controls for the state
 * it's in. When a phase runs out it asks what's next.
 */
export function PomodoroPanel({
	timer,
	durations,
	stats,
	goal,
	actions,
}: {
	timer: Timer;
	durations: Durations;
	stats: DayStats;
	goal: number;
	actions: PomodoroActions;
}) {
	const t = useT();
	const { phase, status } = timer;
	const ringing = status === "ringing";
	const after = phase === "focus" ? (timer.done + 1 >= durations.longEvery ? "long" : "short") : "focus";
	// The session in progress, 1-based, while a focus phase runs.
	const session = Math.min(timer.done + 1, durations.longEvery);

	const eyebrow = ringing
		? t("pomodoro.timesUp")
		: status === "paused"
			? t("pomodoro.status.paused")
			: phase === "focus"
				? t("pomodoro.session", { n: session, total: durations.longEvery })
				: status === "running"
					? t("pomodoro.status.resting")
					: t("pomodoro.status.ready");
	const title = ringing ? t(`pomodoro.done.${phase}`) : t(`pomodoro.phase.${phase}`);

	return (
		<div
			className="flex h-full items-center gap-5 px-2"
			style={{ "--phase": PHASE_COLOR[phase] } as CSSProperties}
			onClick={(e) => e.stopPropagation()}
		>
			<Dial timer={timer} size={112} label={status === "paused" ? t("pomodoro.status.paused") : undefined} />

			<div className="flex min-w-0 flex-1 flex-col gap-2.5">
				<div className="flex items-start gap-3">
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className="truncate text-[11px] font-semibold tracking-[0.06em] text-(--phase) uppercase">
							{eyebrow}
						</span>
						<h2 className="truncate text-[18px]/[1.2] font-semibold tracking-[-0.01em]">{title}</h2>
					</div>
					<Today stats={stats} goal={goal} />
				</div>

				<Cycle timer={timer} every={durations.longEvery} />

				<div className="flex items-center gap-1.5">
					{ringing ? (
						<>
							<button type="button" className={primary} onClick={actions.proceed}>
								<PlayIcon aria-hidden />
								{t(`pomodoro.action.start.${after}`)}
							</button>
							<button type="button" className={secondary} onClick={actions.extend}>
								{t("pomodoro.action.extend")}
							</button>
							<button type="button" className={secondary} onClick={actions.skip}>
								{t("pomodoro.action.later")}
							</button>
						</>
					) : (
						<>
							{status === "running" ? (
								<button type="button" className={secondary} onClick={actions.pause}>
									<PauseIcon aria-hidden />
									{t("pomodoro.action.pause")}
								</button>
							) : (
								<button type="button" className={primary} onClick={actions.start}>
									<PlayIcon aria-hidden />
									{t(status === "paused" ? "pomodoro.action.resume" : "pomodoro.action.start.now")}
								</button>
							)}
							<span className="flex-1" />
							{status !== "idle" && (
								<IconAction label={t("pomodoro.action.extend")} onClick={actions.extend}>
									<span className="text-[11px] font-bold">+5</span>
								</IconAction>
							)}
							{status !== "idle" && (
								<IconAction label={t("pomodoro.action.reset")} onClick={actions.reset}>
									<RotateCcwIcon aria-hidden />
								</IconAction>
							)}
							<IconAction label={t(`pomodoro.action.skip.${after}`)} onClick={actions.skip}>
								<SkipForwardIcon aria-hidden />
							</IconAction>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

/** One dot per focus session of the cycle: done, in progress, still to come. */
function Cycle({ timer, every }: { timer: Timer; every: number }) {
	const t = useT();
	// A focus session that just rang is done already, though the cycle only counts it once you move on.
	const rang = timer.phase === "focus" && timer.status === "ringing";
	const done = timer.done + (rang ? 1 : 0);
	const current = timer.phase === "focus" && !rang && timer.status !== "idle" ? timer.done : -1;
	return (
		<div className="flex items-center gap-2">
			<ol className="flex list-none items-center gap-1.5" aria-label={t("pomodoro.cycle", { n: done, total: every })}>
				{Array.from({ length: every }, (_, i) => (
					<li
						// biome-ignore lint/suspicious/noArrayIndexKey: a fixed row of slots, never reordered
						key={i}
						className={cn(
							"h-1.5 w-5 rounded-full bg-white/12 transition-colors duration-300",
							i < done && "bg-(--phase)",
							i === current && "bg-[color-mix(in_srgb,var(--phase)_45%,transparent)]",
						)}
					/>
				))}
			</ol>
			<span className="text-[11.5px] text-text-dim tabular-nums">{t("pomodoro.cycle", { n: done, total: every })}</span>
		</div>
	);
}

/** Today's sessions against the goal, and the focus time they add up to. */
function Today({ stats, goal }: { stats: DayStats; goal: number }) {
	const t = useT();
	const met = stats.sessions >= goal;
	return (
		<div
			className={cn(
				"flex flex-none items-center gap-1.5 rounded-full bg-white/7 py-1 ps-2 pe-2.5 text-[12px] tabular-nums",
				met && "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-success-foreground",
			)}
			title={t("pomodoro.todayTime", { time: formatDuration(stats.focusMs) })}
		>
			<FlameIcon aria-hidden size={13} className={met ? undefined : "text-(--phase)"} />
			<span className="font-semibold">{t("pomodoro.today", { n: stats.sessions, goal })}</span>
			<span className={met ? undefined : "text-text-dim"}>· {formatDuration(stats.focusMs)}</span>
		</div>
	);
}
