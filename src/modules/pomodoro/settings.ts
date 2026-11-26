import type { SettingDef } from "../../core/settings";
import { type Durations, MINUTE } from "./timer";

/** Switches rendered directly on the module's settings page. */
export const pomodoroSettings = {
	autoBreaks: {
		key: "pomodoro.autoBreaks",
		label: "pomodoro.autoBreaks.label",
		description: "pomodoro.autoBreaks.desc",
		default: false,
	},
	autoFocus: {
		key: "pomodoro.autoFocus",
		label: "pomodoro.autoFocus.label",
		description: "pomodoro.autoFocus.desc",
		default: false,
	},
	showCompact: {
		key: "pomodoro.showCompact",
		label: "pomodoro.showCompact.label",
		description: "pomodoro.showCompact.desc",
		default: true,
	},
} satisfies Record<string, SettingDef>;

const minutes = (key: string, label: SettingDef["label"], value: number): SettingDef<number> => ({
	key: `pomodoro.${key}`,
	label,
	default: value,
});

/** Phase lengths in minutes, the cycle and the day's goal. */
export const timerSettings = {
	focus: minutes("focusMinutes", "pomodoro.focus.label", 25),
	short: minutes("shortMinutes", "pomodoro.short.label", 5),
	long: minutes("longMinutes", "pomodoro.long.label", 15),
	longEvery: { ...minutes("longEvery", "pomodoro.longEvery.label", 4), description: "pomodoro.longEvery.desc" },
	goal: { ...minutes("dailyGoal", "pomodoro.goal.label", 8), description: "pomodoro.goal.desc" },
} satisfies Record<string, SettingDef<number>>;

export const ALARM_SOUNDS = ["chime", "bell", "digital", "none"] as const;
export type AlarmSound = (typeof ALARM_SOUNDS)[number];
export const ALARM_VOLUMES = ["low", "medium", "high"] as const;
export type AlarmVolume = (typeof ALARM_VOLUMES)[number];
/** How long the alarm rings: seconds, or 0 until stopped. */
export const ALARM_REPEATS = [1, 30, 60, 0] as const;

export const alarmSettings = {
	sound: { key: "pomodoro.alarmSound", label: "pomodoro.alarm.sound", default: "chime" } as SettingDef<AlarmSound>,
	volume: { key: "pomodoro.alarmVolume", label: "pomodoro.alarm.volume", default: "medium" } as SettingDef<AlarmVolume>,
	repeat: { key: "pomodoro.alarmRepeat", label: "pomodoro.alarm.repeat", default: 30 } as SettingDef<number>,
};

/** Settings (minutes) → the timer's durations (ms), each kept in a sane range. */
export function durationsOf(focus: number, short: number, long: number, longEvery: number): Durations {
	const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n) || lo));
	return {
		focus: clamp(focus, 1, 240) * MINUTE,
		short: clamp(short, 1, 120) * MINUTE,
		long: clamp(long, 1, 240) * MINUTE,
		longEvery: clamp(longEvery, 1, 12),
	};
}
