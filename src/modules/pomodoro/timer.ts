/**
 * The Pomodoro timer as plain data and pure transitions, so the island, the
 * store and the tests share one set of rules.
 *
 * A cycle is `longEvery` focus sessions, each followed by a short break, the
 * last by a long one. A phase that runs out "rings" until the user moves on
 * (or the next phase starts on its own); only a focus session that ran out
 * counts toward the day's total.
 */

export type Phase = "focus" | "short" | "long";
export type Status = "idle" | "running" | "paused" | "ringing";

export interface Durations {
	/** Lengths in ms. */
	focus: number;
	short: number;
	long: number;
	/** Focus sessions before a long break. */
	longEvery: number;
}

export interface Timer {
	phase: Phase;
	status: Status;
	/** Unix ms the running phase ends; null unless running. */
	endsAt: number | null;
	/** Ms left while idle or paused. */
	left: number;
	/** The phase's full length (grows with +5 min), for the progress ring. */
	total: number;
	/** Focus sessions finished in the current cycle. */
	done: number;
}

export const MINUTE = 60_000;

export const lengthOf = (phase: Phase, d: Durations) => d[phase];

export function initial(d: Durations): Timer {
	return { phase: "focus", status: "idle", endsAt: null, left: d.focus, total: d.focus, done: 0 };
}

/** Ms left at `now`. */
export function remaining(t: Timer, now: number): number {
	if (t.status === "running" && t.endsAt !== null) return Math.max(0, t.endsAt - now);
	if (t.status === "ringing") return 0;
	return t.left;
}

/** How far the phase has gone, 0–1. */
export function progress(t: Timer, now: number): number {
	if (t.total <= 0) return 0;
	return Math.min(1, Math.max(0, 1 - remaining(t, now) / t.total));
}

export function start(t: Timer, now: number): Timer {
	if (t.status === "running" || t.status === "ringing") return t;
	return { ...t, status: "running", endsAt: now + t.left };
}

export function pause(t: Timer, now: number): Timer {
	if (t.status !== "running") return t;
	return { ...t, status: "paused", endsAt: null, left: remaining(t, now) };
}

/** Adds `ms` to the phase; on a ringing phase it runs again for just `ms` ("5 more minutes"). */
export function extend(t: Timer, ms: number, now: number): Timer {
	if (t.status === "ringing") return { ...t, status: "running", endsAt: now + ms, left: ms, total: t.total + ms };
	if (t.status === "running" && t.endsAt !== null) return { ...t, endsAt: t.endsAt + ms, total: t.total + ms };
	return { ...t, left: t.left + ms, total: t.total + ms };
}

/** The running phase ran out. */
export function complete(t: Timer): Timer {
	if (t.status !== "running") return t;
	return { ...t, status: "ringing", endsAt: null, left: 0 };
}

/** The phase after this one, and the cycle count once it's over. */
export function nextPhase(t: Timer, d: Durations, finished: boolean): { phase: Phase; done: number } {
	if (t.phase !== "focus") return { phase: "focus", done: t.phase === "long" ? 0 : t.done };
	const done = finished ? t.done + 1 : t.done;
	return { phase: finished && done >= d.longEvery ? "long" : "short", done };
}

/**
 * Moves on to the next phase: after it rang (`finished`) or skipped. It waits
 * idle unless `autoStart`.
 */
export function advance(t: Timer, d: Durations, now: number, autoStart: boolean): Timer {
	const finished = t.status === "ringing";
	const { phase, done } = nextPhase(t, d, finished);
	const length = lengthOf(phase, d);
	const next: Timer = { phase, status: "idle", endsAt: null, left: length, total: length, done };
	return autoStart ? start(next, now) : next;
}

/** Back to the start of the current phase. */
export function reset(t: Timer, d: Durations): Timer {
	const length = lengthOf(t.phase, d);
	return { ...t, status: "idle", endsAt: null, left: length, total: length };
}

/** New lengths from the settings reach an idle timer at once; a running one keeps its own. */
export function applyDurations(t: Timer, d: Durations): Timer {
	if (t.status !== "idle") return t;
	const length = lengthOf(t.phase, d);
	return t.left === length && t.total === length ? t : { ...t, left: length, total: length };
}

/** Today's focus, kept per local day. */
export interface DayStats {
	/** Local date, `YYYY-MM-DD`. */
	day: string;
	sessions: number;
	focusMs: number;
}

export const dayKey = (now: number) => {
	const d = new Date(now);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** The stats for `now`'s day: yesterday's start over at zero. */
export const statsFor = (s: DayStats | null, now: number): DayStats =>
	s && s.day === dayKey(now) ? s : { day: dayKey(now), sessions: 0, focusMs: 0 };

/** Counts a focus session that ran out. */
export function record(s: DayStats | null, t: Timer, now: number): DayStats {
	const today = statsFor(s, now);
	if (t.phase !== "focus" || t.status !== "ringing") return today;
	return { ...today, sessions: today.sessions + 1, focusMs: today.focusMs + t.total };
}
