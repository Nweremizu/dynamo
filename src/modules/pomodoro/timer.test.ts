import { describe, expect, test } from "bun:test";
import {
	advance,
	applyDurations,
	complete,
	type Durations,
	dayKey,
	extend,
	initial,
	MINUTE,
	pause,
	progress,
	record,
	remaining,
	reset,
	start,
	statsFor,
} from "./timer";

const d: Durations = { focus: 25 * MINUTE, short: 5 * MINUTE, long: 15 * MINUTE, longEvery: 2 };
const T0 = new Date(2026, 10, 25, 9, 0).getTime();

describe("running a phase", () => {
	test("starts idle with the full focus length", () => {
		const t = initial(d);
		expect(t).toMatchObject({ phase: "focus", status: "idle", left: 25 * MINUTE, done: 0 });
		expect(remaining(t, T0)).toBe(25 * MINUTE);
	});

	test("counts down while running and freezes while paused", () => {
		const running = start(initial(d), T0);
		expect(remaining(running, T0 + 10 * MINUTE)).toBe(15 * MINUTE);
		expect(progress(running, T0 + 10 * MINUTE)).toBeCloseTo(0.4);
		const paused = pause(running, T0 + 10 * MINUTE);
		expect(paused.status).toBe("paused");
		expect(remaining(paused, T0 + 60 * MINUTE)).toBe(15 * MINUTE);
		const resumed = start(paused, T0 + 60 * MINUTE);
		expect(remaining(resumed, T0 + 65 * MINUTE)).toBe(10 * MINUTE);
	});

	test("+5 min adds to the phase, or reopens one that rang", () => {
		const running = extend(start(initial(d), T0), 5 * MINUTE, T0);
		expect(remaining(running, T0)).toBe(30 * MINUTE);
		expect(running.total).toBe(30 * MINUTE);
		const rang = complete(start(initial(d), T0));
		const again = extend(rang, 5 * MINUTE, T0 + 25 * MINUTE);
		expect(again.status).toBe("running");
		expect(remaining(again, T0 + 25 * MINUTE)).toBe(5 * MINUTE);
	});

	test("reset goes back to the start of the same phase", () => {
		const t = reset(pause(start(initial(d), T0), T0 + MINUTE), d);
		expect(t).toMatchObject({ phase: "focus", status: "idle", left: 25 * MINUTE });
	});
});

describe("the cycle", () => {
	const finish = (t: ReturnType<typeof initial>) => complete(start(t, T0));

	test("focus, short break, focus, then a long break after `longEvery` sessions", () => {
		let t = advance(finish(initial(d)), d, T0, false);
		expect(t).toMatchObject({ phase: "short", done: 1, status: "idle", left: 5 * MINUTE });
		t = advance(finish(t), d, T0, false);
		expect(t).toMatchObject({ phase: "focus", done: 1 });
		t = advance(finish(t), d, T0, false);
		expect(t).toMatchObject({ phase: "long", done: 2, left: 15 * MINUTE });
		t = advance(finish(t), d, T0, false);
		expect(t).toMatchObject({ phase: "focus", done: 0 });
	});

	test("a skipped focus session doesn't count toward the long break", () => {
		const t = advance(start(initial(d), T0), d, T0, false);
		expect(t).toMatchObject({ phase: "short", done: 0 });
	});

	test("autoStart runs the next phase right away", () => {
		const t = advance(finish(initial(d)), d, T0, true);
		expect(t.status).toBe("running");
		expect(remaining(t, T0 + MINUTE)).toBe(4 * MINUTE);
	});

	test("new lengths reach an idle timer, not a running one", () => {
		const longer = { ...d, focus: 50 * MINUTE };
		expect(applyDurations(initial(d), longer).left).toBe(50 * MINUTE);
		const running = start(initial(d), T0);
		expect(applyDurations(running, longer)).toBe(running);
	});
});

describe("today's stats", () => {
	test("count focus sessions that ran out, not skipped ones or breaks", () => {
		const rang = complete(start(initial(d), T0));
		const s = record(null, rang, T0);
		expect(s).toEqual({ day: dayKey(T0), sessions: 1, focusMs: 25 * MINUTE });
		expect(record(s, start(initial(d), T0), T0).sessions).toBe(1);
		const breakRang = complete(start(advance(rang, d, T0, false), T0));
		expect(record(s, breakRang, T0).sessions).toBe(1);
	});

	test("start over on a new day", () => {
		const s = { day: dayKey(T0), sessions: 4, focusMs: 100 * MINUTE };
		expect(statsFor(s, T0 + 24 * 60 * MINUTE).sessions).toBe(0);
		expect(statsFor(s, T0 + MINUTE)).toBe(s);
	});
});
