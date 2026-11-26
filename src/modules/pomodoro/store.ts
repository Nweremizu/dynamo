/**
 * The island's one Pomodoro: the timer, today's stats and what you're focusing
 * on, kept in localStorage so a restart picks up where it left off (a phase
 * that ran out meanwhile rings when the island comes back).
 */
import { useSyncExternalStore } from "react";
import {
	advance,
	applyDurations,
	complete,
	type DayStats,
	type Durations,
	extend,
	initial,
	pause,
	record,
	reset,
	start,
	type Timer,
} from "./timer";

const KEY = "pomodoro.state";

export interface PomodoroState {
	timer: Timer | null;
	stats: DayStats | null;
	/** Counts the phases that ran out, so each one rings its alarm once. */
	rings: number;
}

const EMPTY: PomodoroState = { timer: null, stats: null, rings: 0 };

function load(): PomodoroState {
	try {
		const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as PomodoroState | null;
		if (saved && typeof saved === "object") return { ...EMPTY, ...saved };
	} catch {
		/* unreadable: start fresh */
	}
	return EMPTY;
}

let state: PomodoroState = typeof localStorage === "undefined" ? EMPTY : load();
const listeners = new Set<() => void>();

function set(next: PomodoroState) {
	state = next;
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		/* storage full or blocked: keep it in memory */
	}
	for (const l of listeners) l();
}

// The settings window shares this storage: a change made there (today's count
// reset) reaches the island, and the other way round.
if (typeof window !== "undefined") {
	window.addEventListener("storage", (e) => {
		if (e.key !== KEY) return;
		state = load();
		for (const l of listeners) l();
	});
}

const subscribe = (l: () => void) => {
	listeners.add(l);
	return () => listeners.delete(l);
};

export const usePomodoroState = () => useSyncExternalStore(subscribe, () => state);

/** The timer, made from the current lengths the first time it's needed. */
const timerOf = (d: Durations) => state.timer ?? initial(d);
const update = (d: Durations, f: (t: Timer) => Timer) => set({ ...state, timer: f(timerOf(d)) });

export const pomodoro = {
	start: (d: Durations) => update(d, (t) => start(t, Date.now())),
	pause: (d: Durations) => update(d, (t) => pause(t, Date.now())),
	extend: (d: Durations, ms: number) => update(d, (t) => extend(t, ms, Date.now())),
	reset: (d: Durations) => update(d, (t) => reset(t, d)),
	/** Back to the first focus session of a cycle. */
	restart: (d: Durations) => set({ ...state, timer: initial(d) }),
	sync: (d: Durations) => {
		const t = timerOf(d);
		const next = applyDurations(t, d);
		if (next !== t || !state.timer) set({ ...state, timer: next });
	},
	/** The running phase ran out: it rings, and a finished focus session counts. */
	complete: (d: Durations) => {
		const rang = complete(timerOf(d));
		set({ timer: rang, stats: record(state.stats, rang, Date.now()), rings: state.rings + 1 });
	},
	/** On to the next phase: after it rang, or skipping the current one. */
	next: (d: Durations, autoStart: boolean) => update(d, (t) => advance(t, d, Date.now(), autoStart)),
	/** Today's count back to zero. */
	clearToday: () => set({ ...state, stats: null }),
};
