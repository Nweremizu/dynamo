/**
 * Pomodoro — focus sessions and breaks on a timer, with an alarm when each
 * one runs out. The time left shows in the closed island while it runs; a
 * phase that ran out takes the island over until you say what's next (or the
 * next one starts on its own, per the settings).
 *
 * All front end: the timer lives in `store.ts` (persisted), the rules in
 * `timer.ts`, the sounds in `alarm.ts`.
 */
import { TimerIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { moduleEnabled, useSetting } from "../../core/settings";
import type { IslandModule, ModuleView } from "../../core/types";
import { playAlarm } from "./alarm";
import { PomodoroCompactLeft, PomodoroCompactRight } from "./components/PomodoroCompact";
import { PomodoroPanel } from "./components/PomodoroPanel";
import { PomodoroSettings } from "./components/PomodoroSettings";
import { PHASE_COLOR } from "./format";
import { alarmSettings, durationsOf, pomodoroSettings, timerSettings } from "./settings";
import { pomodoro, usePomodoroState } from "./store";
import { initial, MINUTE, statsFor } from "./timer";

export const pomodoroModule: IslandModule = {
	id: "pomodoro",
	title: "pomodoro.title",
	settingsIcon: <TimerIcon size={15} />,
	enabledByDefault: false,
	settings: Object.values(pomodoroSettings),
	SettingsSection: PomodoroSettings,
	settingsSectionCards: true,
	useView(): ModuleView {
		const enabled = useSetting(moduleEnabled(pomodoroModule));
		const autoBreaks = useSetting(pomodoroSettings.autoBreaks);
		const autoFocus = useSetting(pomodoroSettings.autoFocus);
		const showCompact = useSetting(pomodoroSettings.showCompact);
		const focus = useSetting(timerSettings.focus);
		const short = useSetting(timerSettings.short);
		const long = useSetting(timerSettings.long);
		const longEvery = useSetting(timerSettings.longEvery);
		const goal = useSetting(timerSettings.goal);
		const sound = useSetting(alarmSettings.sound);
		const volume = useSetting(alarmSettings.volume);
		const repeat = useSetting(alarmSettings.repeat);
		const d = useMemo(() => durationsOf(focus, short, long, longEvery), [focus, short, long, longEvery]);

		const state = usePomodoroState();
		const timer = state.timer ?? initial(d);
		const ringing = timer.status === "ringing";
		// Whether the phase after the one that rang starts on its own.
		const auto = timer.phase === "focus" ? autoBreaks : autoFocus;

		// New lengths reach an idle timer right away.
		useEffect(() => pomodoro.sync(d), [d]);

		// One timeout to the end of the running phase (also catches one that ran out while the app was closed).
		useEffect(() => {
			if (!enabled || timer.status !== "running" || timer.endsAt === null) return;
			const id = window.setTimeout(() => pomodoro.complete(d), Math.max(0, timer.endsAt - Date.now()));
			return () => window.clearTimeout(id);
		}, [enabled, timer.status, timer.endsAt, d]);

		// Each phase that runs out rings once: a single ring when the next phase
		// starts on its own, otherwise for the chosen time (or until it's handled).
		const rung = useRef(state.rings);
		const stop = useRef<(() => void) | null>(null);
		useEffect(() => {
			if (state.rings === rung.current) return;
			rung.current = state.rings;
			stop.current?.();
			stop.current = null;
			if (auto) {
				playAlarm(sound, volume, 1);
				pomodoro.next(d, true);
			} else {
				stop.current = playAlarm(sound, volume, repeat);
			}
		}, [state.rings, auto, sound, volume, repeat, d]);
		useEffect(() => {
			if (!ringing) {
				stop.current?.();
				stop.current = null;
			}
		}, [ringing]);

		const running = timer.status === "running";
		const color = PHASE_COLOR[timer.phase];
		const actions = {
			start: () => pomodoro.start(d),
			pause: () => pomodoro.pause(d),
			extend: () => pomodoro.extend(d, 5 * MINUTE),
			reset: () => pomodoro.reset(d),
			skip: () => pomodoro.next(d, false),
			proceed: () => pomodoro.next(d, true),
		};

		return {
			active: enabled && (ringing || (showCompact && running)),
			// Ringing, it wants you now; running, it steps aside for music and agents.
			priority: ringing ? 70 : 20,
			accent: color,
			icon: <TimerIcon size={15} color={color} />,
			compact: {
				left: <PomodoroCompactLeft timer={timer} />,
				right: <PomodoroCompactRight timer={timer} />,
				width: 250,
			},
			expanded: (
				<PomodoroPanel
					timer={timer}
					durations={d}
					stats={statsFor(state.stats, Date.now())}
					goal={goal}
					actions={actions}
				/>
			),
			expandedSize: { width: 560, height: 152 },
			activityKey: ringing ? `ring:${state.rings}` : undefined,
			attention: ringing,
			forceExpanded: ringing,
		};
	},
};
