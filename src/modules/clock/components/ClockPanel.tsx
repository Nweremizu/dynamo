import { CalendarCheckIcon, ChevronLeftIcon, ChevronRightIcon, VideoIcon } from "lucide-react";
import { type CSSProperties, useMemo, useState, type WheelEvent } from "react";
import { command } from "../../../core/bridge";
import { cn } from "../../../core/cn";
import { useLocale, useT } from "../../../core/i18n";
import { useNow } from "../../ai-agents/common/format";
import { DAY_MS, dayDots, eventsOn, sameDay, startOfDay } from "../events";
import { type CalEvent, type CalendarState, CLOCK_RED } from "../types";

/** The wheel over the calendar flips months at most this often. */
const WHEEL_STEP_MS = 220;
/** "Join" shows from this long before a call. */
const JOIN_LEAD_MS = 15 * 60_000;
/** "Up next" looks this far ahead. */
const NEXT_WITHIN_MS = 12 * 60 * 60_000;
const GRAY = "#8E8E93";

/** First day of the week for a locale (1 = Monday … 7 = Sunday). */
function firstDayOfWeek(locale: string): number {
	try {
		const l = new Intl.Locale(locale) as Intl.Locale & {
			getWeekInfo?: () => { firstDay: number };
			weekInfo?: { firstDay: number };
		};
		return (l.getWeekInfo?.() ?? l.weekInfo)?.firstDay ?? 1;
	} catch {
		return 1;
	}
}

/** ISO week number (Monday weeks; week 1 holds the first Thursday). */
function isoWeek(d: Date): number {
	const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
	const week1 = new Date(t.getFullYear(), 0, 4);
	return 1 + Math.round(((t.getTime() - week1.getTime()) / DAY_MS - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/** Six rows of seven days covering `month`, starting on the locale's first weekday. */
function monthGrid(month: Date, firstDay: number): Date[] {
	const first = new Date(month.getFullYear(), month.getMonth(), 1);
	const offset = (first.getDay() - (firstDay % 7) + 7) % 7;
	return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i));
}

const openLink = (url: string | null) => {
	if (url?.startsWith("https://")) command("open_external", { url });
};

/**
 * Clock and calendar. Left: the time and the focused day, with what's up
 * next (and a Join button when it's a call) over the rest of that day as a
 * timeline. Right: the month on its own card, a dot per calendar on busy
 * days; click a day to see it, scroll to flip months.
 */
export function ClockPanel({ calendar, highlight }: { calendar?: CalendarState; highlight?: string }) {
	const t = useT();
	const locale = useLocale();
	const now = useNow(1000);
	const today = new Date(now);
	const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
	const [selected, setSelected] = useState<Date | null>(null);

	const events = calendar?.events;
	const calendars = calendar?.calendars;
	const dots = useMemo(() => dayDots(events ?? [], calendars ?? []), [events, calendars]);
	const colors = useMemo(() => new Map((calendars ?? []).map((c) => [c.key, c.color])), [calendars]);
	const colorOf = (e: CalEvent) => colors.get(e.calendar) ?? GRAY;
	const hasSources = !!calendars?.length;

	const focus = selected ?? today;
	const onToday = sameDay(focus, today);
	const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(now);
	const seconds = String(today.getSeconds()).padStart(2, "0");
	const longDate = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" }).format(focus);
	const distance = Math.round((startOfDay(focus).getTime() - startOfDay(today).getTime()) / DAY_MS);
	const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(distance, "day");
	const hour = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

	// Today: the next timed event (or the one on now) leads; the rest of the day follows.
	const dayEvents = eventsOn(events ?? [], focus).filter((e) => !onToday || e.allDay || e.end > now);
	const next = onToday ? dayEvents.find((e) => !e.allDay && e.end > now && e.start - now < NEXT_WITHIN_MS) : undefined;
	const rest = dayEvents.filter((e) => e !== next);
	const room = next ? 2 : 4;
	const shown = rest.slice(0, rest.length > room ? room - 1 : room);

	return (
		<div className="flex h-full items-stretch gap-5 px-1" onClick={(e) => e.stopPropagation()}>
			<div className={cn("flex min-w-0 flex-1 flex-col", hasSources ? "gap-2 pt-1" : "justify-center gap-1.5")}>
				<div className="flex items-baseline gap-1.5">
					<span
						className={cn(
							"font-semibold tracking-[-0.03em] tabular-nums",
							hasSources ? "text-[34px]/none" : "text-[46px]/none",
						)}
					>
						{time}
					</span>
					<span className="text-[15px] font-semibold text-text-faint tabular-nums">{seconds}</span>
				</div>
				<div className="flex min-w-0 items-center gap-2">
					<span className="truncate text-[13.5px] font-semibold text-text-dim first-letter:uppercase">{longDate}</span>
					<span className="flex-none rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-medium text-text-dim first-letter:uppercase">
						{onToday ? t("clock.week", { n: isoWeek(focus) }) : relative}
					</span>
				</div>

				{hasSources && (
					<div className="mt-0.5 flex min-h-0 flex-col gap-1.5">
						{next && <UpNext event={next} now={now} color={colorOf(next)} highlighted={next.id === highlight} />}
						{rest.length ? (
							<ol className="flex list-none flex-col">
								{shown.map((e) => (
									<AgendaRow key={e.id} event={e} now={now} focus={focus} color={colorOf(e)} format={hour} />
								))}
								{rest.length > shown.length && (
									<li className="ps-4 pt-0.5 text-[11px] text-text-faint">
										{t("calendar.more", { n: rest.length - shown.length })}
									</li>
								)}
							</ol>
						) : (
							!next && (
								<p className="flex items-center gap-2 rounded-xl bg-white/4 px-3 py-2.5 text-[12px] text-text-dim">
									<CalendarCheckIcon aria-hidden size={14} className="flex-none text-text-faint" />
									{onToday ? t("clock.nothingLeft") : t("calendar.free")}
								</p>
							)
						)}
					</div>
				)}
			</div>

			<Month
				month={month}
				setMonth={setMonth}
				today={today}
				selected={selected}
				onPick={(d) => setSelected(sameDay(d, today) ? null : d)}
				dots={dots}
				compact={!hasSources}
			/>
		</div>
	);
}

/** The next event, on a card tinted in its calendar's color: how soon, its time, and Join for a call. */
function UpNext({
	event,
	now,
	color,
	highlighted,
}: {
	event: CalEvent;
	now: number;
	color: string;
	highlighted: boolean;
}) {
	const t = useT();
	const locale = useLocale();
	const live = event.start <= now;
	const minutes = Math.max(1, Math.round((event.start - now) / 60_000));
	const soon = new Intl.RelativeTimeFormat(locale, { style: "short", numeric: "auto" }).format(
		minutes < 60 ? minutes : Math.round(minutes / 60),
		minutes < 60 ? "minute" : "hour",
	);
	const range = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).formatRange(
		event.start,
		event.end,
	);
	const joinable = !!event.meetingUrl && event.start - JOIN_LEAD_MS <= now && now < event.end;

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--cal)_12%,transparent)] py-2 ps-3 pe-2 shadow-[inset_3px_0_0_var(--cal)]",
				highlighted && "bg-[color-mix(in_srgb,var(--cal)_20%,transparent)]",
			)}
			style={{ "--cal": color } as CSSProperties}
			title={[event.title, event.location].filter(Boolean).join("\n")}
		>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-[10.5px] font-semibold tracking-[0.06em] text-(--cal) uppercase">
					{live ? t("calendar.now") : `${t("clock.upNext")} · ${soon}`}
				</span>
				<button
					type="button"
					className="truncate text-start text-[13px] font-semibold hover:underline disabled:hover:no-underline"
					disabled={!event.url}
					onClick={() => openLink(event.url)}
				>
					{event.title || t("calendar.untitled")}
				</button>
				<span className="truncate text-[11.5px] text-text-dim tabular-nums">
					{range}
					{event.location && ` · ${event.location}`}
				</span>
			</div>
			{joinable && (
				<button
					type="button"
					className="inline-flex h-7 flex-none items-center gap-1.5 rounded-full bg-(--cal) px-3 text-[12px] font-semibold text-white transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-[0.96]"
					onClick={() => openLink(event.meetingUrl)}
				>
					<VideoIcon aria-hidden size={13} />
					{t("calendar.join")}
				</button>
			)}
		</div>
	);
}

/** One event of the day on the timeline: its start, a dot in its calendar's color, the title. */
function AgendaRow({
	event,
	now,
	focus,
	color,
	format,
}: {
	event: CalEvent;
	now: number;
	focus: Date;
	color: string;
	format: Intl.DateTimeFormat;
}) {
	const t = useT();
	const live = !event.allDay && event.start <= now && now < event.end;
	const past = event.end <= now;
	return (
		<li
			className={cn("group/row relative flex h-6 items-center gap-2.5 ps-4", past && "opacity-50")}
			title={[event.title, event.location].filter(Boolean).join("\n")}
		>
			{/* The timeline's rail, and the event's dot on it. */}
			<span
				aria-hidden
				className="absolute inset-y-0 start-[4.5px] w-px bg-white/10 group-first/row:top-1/2 group-last/row:bottom-1/2"
			/>
			<span
				aria-hidden
				className={cn(
					"absolute start-0.5 size-1.5 rounded-full",
					live && "ring-2 ring-[color-mix(in_srgb,var(--cal)_35%,transparent)]",
				)}
				style={{ background: color, "--cal": color } as CSSProperties}
			/>
			<span className="w-15 flex-none text-[11px] font-medium whitespace-nowrap text-text-faint tabular-nums">
				{event.allDay
					? t("calendar.allDay")
					: event.start < startOfDay(focus).getTime()
						? "…"
						: format.format(event.start)}
			</span>
			<button
				type="button"
				className="min-w-0 flex-1 truncate text-start text-[12.5px] font-medium text-text-dim hover:text-text disabled:hover:text-text-dim"
				disabled={!event.url}
				onClick={() => openLink(event.url)}
			>
				{event.title || t("calendar.untitled")}
			</button>
		</li>
	);
}

/** The month on a card: today in red, the picked day ringed, a dot per calendar on busy days. */
function Month({
	month,
	setMonth,
	today,
	selected,
	onPick,
	dots,
	compact,
}: {
	month: Date;
	setMonth: (m: Date) => void;
	today: Date;
	selected: Date | null;
	onPick: (d: Date) => void;
	dots: Map<string, string[]>;
	compact: boolean;
}) {
	const t = useT();
	const locale = useLocale();
	const [lastWheel, setLastWheel] = useState(0);
	const days = monthGrid(month, firstDayOfWeek(locale));
	// Trim a trailing week that belongs entirely to the next month.
	const rows = days.slice(35).every((d) => d.getMonth() !== month.getMonth()) ? 5 : 6;
	const weekdays = days.slice(0, 7).map((d) => new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(d));
	const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(month);
	const dayName = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
	const onCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

	const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
	const onWheel = (e: WheelEvent) => {
		if (Math.abs(e.deltaY) < 4 || e.timeStamp - lastWheel < WHEEL_STEP_MS) return;
		setLastWheel(e.timeStamp);
		shift(Math.sign(e.deltaY));
	};
	const nav =
		"grid size-6 place-items-center rounded-full text-text-dim transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/10 hover:text-text active:scale-[0.96]";

	return (
		<div
			className={cn(
				"flex w-64 flex-none flex-col gap-1 self-center rounded-2xl bg-white/4 p-2.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]",
				compact && "gap-1.5",
			)}
			data-scroll
			onWheel={onWheel}
		>
			<div className="flex h-6 items-center gap-1 ps-1">
				<span className="flex-1 truncate text-[13px] font-semibold">
					<span className="first-letter:uppercase">{monthName}</span>{" "}
					<span className="font-medium text-text-faint tabular-nums">{month.getFullYear()}</span>
				</span>
				{(!onCurrentMonth || selected) && (
					<button
						type="button"
						className="h-5.5 rounded-full bg-[color-mix(in_srgb,#ff453a_16%,transparent)] px-2.5 text-[11px] font-semibold text-[#ff6961] transition-colors hover:bg-[color-mix(in_srgb,#ff453a_24%,transparent)]"
						onClick={() => {
							setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
							onPick(today);
						}}
					>
						{t("clock.today")}
					</button>
				)}
				<button
					type="button"
					className={nav}
					aria-label={t("clock.prev")}
					title={t("clock.prev")}
					onClick={() => shift(-1)}
				>
					<ChevronLeftIcon aria-hidden size={15} />
				</button>
				<button
					type="button"
					className={nav}
					aria-label={t("clock.next")}
					title={t("clock.next")}
					onClick={() => shift(1)}
				>
					<ChevronRightIcon aria-hidden size={15} />
				</button>
			</div>
			<div className="grid grid-cols-7">
				{weekdays.map((w, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: weekday labels can repeat (narrow format), and the order is fixed
						key={`w${i}`}
						aria-hidden
						className="h-4 text-center text-[10px] font-semibold text-text-faint uppercase"
					>
						{w}
					</span>
				))}
				{days.slice(0, rows * 7).map((d) => {
					const isToday = sameDay(d, today);
					const isSelected = !!selected && sameDay(d, selected);
					const outside = d.getMonth() !== month.getMonth();
					const weekend = d.getDay() === 0 || d.getDay() === 6;
					const marks = dots.get(d.toDateString());
					return (
						<button
							type="button"
							key={d.toDateString()}
							aria-label={dayName.format(d)}
							aria-current={isToday ? "date" : undefined}
							aria-pressed={isSelected}
							className={cn("group/day grid h-5.75 place-items-center", outside && "opacity-35")}
							onClick={() => {
								onPick(d);
								if (outside) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
							}}
						>
							<span
								className={cn(
									"relative grid size-5.5 place-items-center rounded-full text-[11.5px] font-medium text-text-dim tabular-nums transition-colors duration-150 group-hover/day:bg-white/10",
									weekend && "text-text-faint",
									isSelected && "bg-white/14 text-text shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35)]",
									isToday && "font-bold text-white group-hover/day:brightness-110",
								)}
								style={isToday ? { background: CLOCK_RED } : undefined}
							>
								{d.getDate()}
								{marks && (
									<span className="pointer-events-none absolute -bottom-0.5 flex justify-center gap-0.5">
										{marks.map((c) => (
											<i key={c} className="size-0.75 rounded-full" style={{ background: isToday ? "#fff" : c }} />
										))}
									</span>
								)}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
