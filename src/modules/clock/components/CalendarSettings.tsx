import { BellIcon, CalendarIcon, LinkIcon, XIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button, IconButton, LinkButton } from "../../../components/ui/button";
import { Block, Desc, List, ListItem, Row, RowText, Section } from "../../../components/ui/card";
import { Input, Select } from "../../../components/ui/form";
import { Tile } from "../../../components/ui/tile";
import { command, providerAction, useProvider } from "../../../core/bridge";
import { cn } from "../../../core/cn";
import { useT } from "../../../core/i18n";
import { setSetting, useSetting } from "../../../core/settings";
import { Toggle } from "../../../settings/components/Toggle";
import {
	calendarSettings,
	calendarVisibility,
	eventReminders,
	leadList,
	remindMinutes,
	remindSound,
} from "../settings";
import { CALENDAR_PROVIDER, type CalendarState } from "../types";

const CLOUD_CONSOLE_URL = "https://console.cloud.google.com/apis/credentials";
const LEAD_OPTIONS = [0, 1, 5, 10, 15, 30, 60, 120, 1440];

const errorText = (t: ReturnType<typeof useT>, code: string) =>
	[
		"unauthorized",
		"notFound",
		"invalid",
		"network",
		"http",
		"noClient",
		"denied",
		"timeout",
		"duplicate",
		"tooMany",
	].includes(code)
		? t(`calendar.error.${code}` as Parameters<typeof t>[0])
		: code;

/** Reminder times, Google account, iCal links and which calendars show. */
export function CalendarSettings() {
	return (
		<>
			<Section>
				<Reminder />
			</Section>
			<Section>
				<GoogleAccount />
			</Section>
			<Section>
				<IcalLinks />
			</Section>
			<Calendars />
		</>
	);
}

function Reminder() {
	const t = useT();
	const remind = useSetting(calendarSettings.remind);
	const leads = leadList(useSetting(remindMinutes));
	const own = useSetting(eventReminders);
	const sound = useSetting(remindSound);
	const label = (n: number) =>
		n === 0
			? t("calendar.remindMinutes.atStart")
			: n < 60
				? t("calendar.remindMinutes.before", { n })
				: n < 1440
					? t("calendar.remindMinutes.hoursBefore", { n: n / 60 })
					: t("calendar.remindMinutes.daysBefore", { n: n / 1440 });
	const free = LEAD_OPTIONS.filter((n) => !leads.includes(n));

	return (
		<Block className={cn(!remind && "*:opacity-45")}>
			<Row
				icon={
					<Tile tone="linear-gradient(180deg, #ff7a6e, #e5483b)">
						<BellIcon />
					</Tile>
				}
				label={t("calendar.remindMinutes.label")}
				desc={t("calendar.remindMinutes.desc")}
			>
				<Select
					value=""
					disabled={!remind || !free.length}
					onChange={(e) => setSetting(remindMinutes, leadList([...leads, Number(e.target.value)]))}
				>
					<option value="" disabled>
						{t("calendar.remindMinutes.add")}
					</option>
					{free.map((n) => (
						<option key={n} value={n}>
							{label(n)}
						</option>
					))}
				</Select>
			</Row>
			<ul className="flex list-none flex-wrap gap-1.5">
				{leads.map((n) => (
					<li
						key={n}
						className={cn(
							"flex h-7 items-center gap-0.5 rounded-full bg-(--settings-field) ps-3 pe-1 text-[12.5px] font-medium shadow-[inset_0_0_0_1px_var(--hairline)]",
							leads.length <= 1 && "pe-3",
						)}
					>
						{label(n)}
						{leads.length > 1 && (
							<IconButton
								size="sm"
								tone="danger"
								className="size-5"
								title={t("calendar.remindMinutes.remove")}
								aria-label={`${t("calendar.remindMinutes.remove")}: ${label(n)}`}
								disabled={!remind}
								onClick={() =>
									setSetting(
										remindMinutes,
										leads.filter((m) => m !== n),
									)
								}
							>
								<XIcon size={10} />
							</IconButton>
						)}
					</li>
				))}
			</ul>
			{[
				{ def: eventReminders, value: own },
				{ def: remindSound, value: sound },
			].map(({ def, value }) => (
				<Row as="label" label={t(def.label)} desc={def.description && t(def.description)} key={def.key}>
					<Toggle checked={value} disabled={!remind} onChange={(v) => setSetting(def, v)} />
				</Row>
			))}
		</Block>
	);
}

function GoogleAccount() {
	const t = useT();
	const google = useProvider<CalendarState>(CALENDAR_PROVIDER)?.google;
	const [busy, setBusy] = useState<"connect" | "other" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [clientId, setClientId] = useState("");
	const [clientSecret, setClientSecret] = useState("");

	const run = async (action: string, payload?: unknown, kind: "connect" | "other" = "other") => {
		setBusy(kind);
		setError(null);
		try {
			await providerAction(CALENDAR_PROVIDER, action, payload);
			return true;
		} catch (e) {
			const code = String(e);
			if (code !== "cancelled") setError(errorText(t, code));
			return false;
		} finally {
			setBusy(null);
		}
	};

	const status = !google?.hasClient
		? t("calendar.google.noClient")
		: google.error === "unauthorized"
			? t("calendar.google.revoked")
			: google.connected
				? t("calendar.google.connected", { account: google.account ?? "…" })
				: t("calendar.google.none");

	const saveClient = async (e: FormEvent) => {
		e.preventDefault();
		if (await run("setClient", { id: clientId, secret: clientSecret })) {
			setClientId("");
			setClientSecret("");
		}
	};

	return (
		<Block>
			<Row
				icon={
					<Tile tone="linear-gradient(180deg, #5f9bff, #2f6fe0)">
						<CalendarIcon />
					</Tile>
				}
				label={t("calendar.google.title")}
				desc={busy === "connect" ? t("calendar.google.waiting") : status}
				descTone={google?.error === "unauthorized" ? "warn" : undefined}
			>
				{busy === "connect" ? (
					<Button onClick={() => providerAction(CALENDAR_PROVIDER, "cancelConnect")}>
						{t("calendar.google.cancel")}
					</Button>
				) : google?.connected && google.error !== "unauthorized" ? (
					<Button variant="danger" disabled={!!busy} onClick={() => run("disconnectGoogle")}>
						{t("calendar.google.disconnect")}
					</Button>
				) : (
					google?.hasClient && (
						<Button variant="primary" disabled={!!busy} onClick={() => run("connectGoogle", undefined, "connect")}>
							{t("calendar.google.connect")}
						</Button>
					)
				)}
			</Row>

			{google && !google.hasClient && (
				<>
					<Desc>
						{t("calendar.google.clientHow")}{" "}
						<LinkButton onClick={() => command("open_external", { url: CLOUD_CONSOLE_URL })}>
							{t("calendar.google.clientOpen")}
						</LinkButton>
					</Desc>
					<form className="flex gap-2" onSubmit={saveClient}>
						<Input
							className="flex-1"
							value={clientId}
							placeholder={t("calendar.google.clientId")}
							spellCheck={false}
							onChange={(e) => setClientId(e.target.value)}
						/>
						<Input
							className="flex-1"
							type="password"
							value={clientSecret}
							placeholder={t("calendar.google.clientSecret")}
							autoComplete="off"
							spellCheck={false}
							onChange={(e) => setClientSecret(e.target.value)}
						/>
						<Button type="submit" variant="primary" disabled={!!busy || !clientId.trim()}>
							{t("calendar.google.clientSave")}
						</Button>
					</form>
				</>
			)}
			{google?.hasClient && !google.builtinClient && !google.connected && (
				<Desc>
					<LinkButton disabled={!!busy} onClick={() => run("clearClient")}>
						{t("calendar.google.clientRemove")}
					</LinkButton>
				</Desc>
			)}
			{error && <Desc tone="error">{error}</Desc>}
		</Block>
	);
}

function IcalLinks() {
	const t = useT();
	const state = useProvider<CalendarState>(CALENDAR_PROVIDER);
	const [url, setUrl] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const add = async (e: FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await providerAction(CALENDAR_PROVIDER, "addFeed", { url });
			setUrl("");
		} catch (err) {
			setError(errorText(t, String(err)));
		} finally {
			setBusy(false);
		}
	};

	const feeds = state?.feeds ?? [];
	return (
		<Block>
			<Row
				icon={
					<Tile>
						<LinkIcon />
					</Tile>
				}
				label={t("calendar.ics.title")}
				desc={t("calendar.ics.desc")}
			/>
			<form className="flex gap-2" onSubmit={add}>
				<Input
					className="flex-1"
					type="password"
					value={url}
					placeholder={t("calendar.ics.placeholder")}
					aria-label={t("calendar.ics.placeholder")}
					autoComplete="off"
					spellCheck={false}
					onChange={(e) => {
						setUrl(e.target.value);
						setError(null);
					}}
				/>
				<Button type="submit" variant="primary" loading={busy} disabled={!url.trim()}>
					{t("calendar.ics.add")}
				</Button>
			</form>
			{error && <Desc tone="error">{error}</Desc>}
			{feeds.length > 0 && (
				<List>
					{feeds.map((f) => (
						<ListItem key={f.id} name={f.name ?? f.host}>
							<span
								className={cn(
									"text-[12px] whitespace-nowrap text-text-faint",
									f.error && "text-destructive-foreground",
								)}
							>
								{f.error ? errorText(t, f.error) : f.name ? f.host : ""}
							</span>
							<IconButton
								size="sm"
								tone="danger"
								title={t("calendar.ics.remove")}
								aria-label={`${t("calendar.ics.remove")}: ${f.name ?? f.host}`}
								onClick={() => providerAction(CALENDAR_PROVIDER, "removeFeed", { id: f.id })}
							>
								<XIcon size={12} />
							</IconButton>
						</ListItem>
					))}
				</List>
			)}
		</Block>
	);
}

function Calendars() {
	const t = useT();
	const calendars = useProvider<CalendarState>(CALENDAR_PROVIDER)?.calendars ?? [];
	const visibility = useSetting(calendarVisibility);
	if (!calendars.length) return null;

	return (
		<Section>
			<Block>
				<RowText label={t("calendar.calendars.title")} desc={t("calendar.calendars.desc")} />
				<List>
					{calendars.map((c) => {
						// From the setting, not `c.visible`: that one only catches up after
						// the backend has fetched every calendar again.
						const visible = visibility[c.key] ?? c.defaultVisible;
						return (
							<li
								key={c.key}
								className="flex min-h-10 items-center gap-2.5 rounded-lg bg-(--settings-field) ps-3 pe-2 shadow-[inset_0_0_0_1px_var(--hairline)]"
							>
								<i aria-hidden className="size-3 flex-none rounded-full" style={{ background: c.color }} />
								<span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={c.name}>
									{c.name}
								</span>
								<span
									className={cn(
										"text-[12px] whitespace-nowrap text-text-faint",
										c.error && "text-destructive-foreground",
									)}
								>
									{c.error ? errorText(t, c.error) : c.source === "google" ? "Google" : "iCal"}
								</span>
								<Toggle
									checked={visible}
									label={c.name}
									onChange={(v) => {
										const next = { ...visibility, [c.key]: v };
										// Back to the calendar's own default: forget the override.
										if (v === c.defaultVisible) delete next[c.key];
										setSetting(calendarVisibility, next);
									}}
								/>
							</li>
						);
					})}
				</List>
			</Block>
		</Section>
	);
}
