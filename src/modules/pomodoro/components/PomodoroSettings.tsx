import { BellRingIcon, FlameIcon, PlayIcon, TimerIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Row, Section } from "../../../components/ui/card";
import { NumberField, Segmented, Select } from "../../../components/ui/form";
import { Tile } from "../../../components/ui/tile";
import { useT } from "../../../core/i18n";
import { type SettingDef, setSetting, useSetting } from "../../../core/settings";
import { playAlarm } from "../alarm";
import { formatDuration } from "../format";
import { ALARM_REPEATS, ALARM_SOUNDS, ALARM_VOLUMES, alarmSettings, timerSettings } from "../settings";
import { pomodoro, usePomodoroState } from "../store";
import { statsFor } from "../timer";

const tile = (top: string, bottom: string) => `linear-gradient(180deg, ${top}, ${bottom})`;

/** The timer's lengths, the alarm, and today's count. */
export function PomodoroSettings() {
	const t = useT();
	return (
		<>
			<Section title={t("pomodoro.groups.timer")}>
				<NumberRow
					def={timerSettings.focus}
					unit={t("pomodoro.unit.min")}
					max={240}
					icon={
						<Tile tone={tile("#ff9a7f", "#f0603f")}>
							<TimerIcon />
						</Tile>
					}
				/>
				<NumberRow def={timerSettings.short} unit={t("pomodoro.unit.min")} max={120} />
				<NumberRow def={timerSettings.long} unit={t("pomodoro.unit.min")} max={240} />
				<NumberRow def={timerSettings.longEvery} unit={t("pomodoro.unit.sessions")} max={12} />
			</Section>
			<Alarm />
			<Today />
		</>
	);
}

/** A whole number setting, saved when it's in range (typing "1" on the way to "15" doesn't save 1). */
function NumberRow({
	def,
	unit,
	max,
	icon,
}: {
	def: SettingDef<number>;
	unit: string;
	max: number;
	icon?: React.ReactNode;
}) {
	const t = useT();
	const value = useSetting(def);
	const [draft, setDraft] = useState(String(value));
	useEffect(() => setDraft(String(value)), [value]);
	const commit = () => {
		const n = Math.round(Number(draft));
		if (Number.isFinite(n) && n >= 1 && n <= max) setSetting(def, n);
		else setDraft(String(value));
	};
	return (
		<Row icon={icon} label={t(def.label)} desc={def.description && t(def.description)}>
			<NumberField
				unit={unit}
				min={1}
				max={max}
				step={1}
				value={draft}
				aria-label={t(def.label)}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
			/>
		</Row>
	);
}

function Alarm() {
	const t = useT();
	const sound = useSetting(alarmSettings.sound);
	const volume = useSetting(alarmSettings.volume);
	const repeat = useSetting(alarmSettings.repeat);
	const stop = useRef<(() => void) | null>(null);
	useEffect(() => () => stop.current?.(), []);

	return (
		<Section title={t("pomodoro.groups.alarm")}>
			<Row
				icon={
					<Tile tone={tile("#ffb340", "#f08a00")}>
						<BellRingIcon />
					</Tile>
				}
				label={t("pomodoro.alarm.sound")}
				desc={t("pomodoro.alarm.soundDesc")}
			>
				<span className="flex flex-none items-center gap-2">
					<Button
						size="sm"
						disabled={sound === "none"}
						onClick={() => {
							stop.current?.();
							stop.current = playAlarm(sound, volume, 1);
						}}
					>
						<PlayIcon aria-hidden />
						{t("pomodoro.alarm.test")}
					</Button>
					<Select
						aria-label={t("pomodoro.alarm.sound")}
						value={sound}
						onChange={(e) => setSetting(alarmSettings.sound, e.target.value as (typeof ALARM_SOUNDS)[number])}
					>
						{ALARM_SOUNDS.map((s) => (
							<option key={s} value={s}>
								{t(`pomodoro.alarm.sounds.${s}`)}
							</option>
						))}
					</Select>
				</span>
			</Row>
			<Row label={t("pomodoro.alarm.volume")} disabled={sound === "none"}>
				<Segmented
					label={t("pomodoro.alarm.volume")}
					disabled={sound === "none"}
					value={volume}
					options={ALARM_VOLUMES.map((v) => ({ value: v, label: t(`pomodoro.alarm.volumes.${v}`) }))}
					onChange={(v) => setSetting(alarmSettings.volume, v)}
				/>
			</Row>
			<Row label={t("pomodoro.alarm.repeat")} desc={t("pomodoro.alarm.repeatDesc")} disabled={sound === "none"}>
				<Select
					aria-label={t("pomodoro.alarm.repeat")}
					disabled={sound === "none"}
					value={repeat}
					onChange={(e) => setSetting(alarmSettings.repeat, Number(e.target.value))}
				>
					{ALARM_REPEATS.map((s) => (
						<option key={s} value={s}>
							{t(`pomodoro.alarm.repeats.${s}`)}
						</option>
					))}
				</Select>
			</Row>
		</Section>
	);
}

function Today() {
	const t = useT();
	const stats = statsFor(usePomodoroState().stats, Date.now());
	return (
		<Section title={t("pomodoro.groups.today")}>
			<NumberRow
				def={timerSettings.goal}
				unit={t("pomodoro.unit.sessions")}
				max={24}
				icon={
					<Tile tone={tile("#ff9a7f", "#f0603f")}>
						<FlameIcon />
					</Tile>
				}
			/>
			<Row
				label={t("pomodoro.stats.label")}
				desc={t("pomodoro.stats.desc", { n: stats.sessions, time: formatDuration(stats.focusMs) })}
			>
				<Button disabled={!stats.sessions} onClick={() => pomodoro.clearToday()}>
					{t("pomodoro.stats.reset")}
				</Button>
			</Row>
		</Section>
	);
}
