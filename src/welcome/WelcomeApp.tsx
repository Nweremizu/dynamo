import { getCurrentWindow } from "@tauri-apps/api/window";
import { BellIcon, CheckIcon, MousePointer2Icon, PowerIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AppLogo } from "../components/icons";
import { Button } from "../components/ui/button";
import { borderColors } from "../core/appearance";
import { command, isTauri, providerAction, useProvider, useTauriEvent } from "../core/bridge";
import { cn } from "../core/cn";
import { type MessageKey, useSyncLocale, useT } from "../core/i18n";
import { SNAPPY } from "../core/motion";
import {
	appearanceSettings,
	moduleEnabled,
	readSetting,
	type SettingDef,
	setSetting,
	useSettings,
} from "../core/settings";
import { modules } from "../modules";
import { ClaudeIcon } from "../modules/ai-agents/claude/ClaudeIcon";
import { Toggle } from "../settings/components/Toggle";
import { STYLES, StylePreview } from "../settings/pages/AppearancePage";

/** Set once the tour is finished, skipped or closed; the backend opens it on startup until then. */
const DONE: SettingDef<boolean> = { key: "onboarding.done", label: "onboarding.title", default: false };
/** Where the tour is: kept so it picks up there after enabling notifications restarts the app. */
const STEP: SettingDef<number> = { key: "onboarding.step", label: "onboarding.title", default: 0 };

const STEPS = ["meet", "look", "modules", "connect", "keys", "done"] as const;

/** The modules offered in the tour, each with a one-line reason to turn it on. */
const PICKS: [string, MessageKey][] = [
	["music", "onboarding.modules.music"],
	["ai-agents", "onboarding.modules.agents"],
	["notifications", "onboarding.modules.notifications"],
	["clock", "onboarding.modules.clock"],
	["shelf", "onboarding.modules.shelf"],
	["clipboard", "onboarding.modules.clipboard"],
	["privacy", "onboarding.modules.privacy"],
	["pomodoro", "onboarding.modules.pomodoro"],
	["notes", "onboarding.modules.notes"],
	["monitor", "onboarding.modules.monitor"],
	["github", "onboarding.modules.github"],
	["fitswise", "onboarding.modules.fitswise"],
];

/**
 * First-run welcome window: six short steps from "what is this" to "it's set
 * up the way I want". Every step does something real (hover the actual island,
 * restyle it, turn modules on, connect Claude Code, press a shortcut) and
 * can be skipped; closing the window counts as done.
 */
export function WelcomeApp() {
	useSyncLocale();
	const t = useT();
	const values = useSettings();
	const index = Math.min(readSetting(values, STEP), STEPS.length - 1);
	const step = STEPS[index];
	const last = useRef(index);
	const direction = index >= last.current ? 1 : -1;
	last.current = index;

	// What the user did along the way, for the summary.
	const [opened, setOpened] = useState(false);
	const [tried, setTried] = useState<"ask" | "find" | null>(null);
	useTauriEvent<boolean>("island://hover", (inside) => inside && setOpened(true));
	useTauriEvent("island://ask", () => setTried((v) => v ?? "ask"));
	useTauriEvent("island://find", () => setTried((v) => v ?? "find"));

	const go = (i: number) => setSetting(STEP, Math.max(0, Math.min(STEPS.length - 1, i)));
	const finish = async (openSettings = false) => {
		setSetting(DONE, true);
		setSetting(STEP, 0);
		if (openSettings) await command("open_settings").catch(() => {});
		if (isTauri) getCurrentWindow().close();
	};

	return (
		<MotionConfig reducedMotion="user">
			<div className="flex h-full flex-col bg-(--settings-window) text-text select-none" data-settings>
				<TitleBar onClose={() => finish()} />
				<div className="h-0.5 flex-none bg-white/6" aria-hidden>
					<motion.div
						className="h-full origin-left bg-brand"
						initial={false}
						animate={{ scaleX: (index + 1) / STEPS.length }}
						transition={SNAPPY}
					/>
				</div>

				<main className="relative min-h-0 flex-1 overflow-hidden">
					<AnimatePresence mode="popLayout" initial={false} custom={direction}>
						<motion.section
							key={step}
							custom={direction}
							className="absolute inset-0 overflow-y-auto px-12 pt-9 pb-4 [scrollbar-width:none]"
							variants={{
								enter: (d: number) => ({ opacity: 0, x: 28 * d }),
								center: { opacity: 1, x: 0 },
								exit: (d: number) => ({ opacity: 0, x: -20 * d }),
							}}
							initial="enter"
							animate="center"
							exit="exit"
							transition={{ ...SNAPPY, opacity: { duration: 0.18 } }}
						>
							{step === "meet" && <Meet opened={opened} />}
							{step === "look" && <Look values={values} />}
							{step === "modules" && <Modules values={values} />}
							{step === "connect" && <Connect />}
							{step === "keys" && <Keys tried={tried} />}
							{step === "done" && <Done values={values} opened={opened} tried={!!tried} />}
						</motion.section>
					</AnimatePresence>
				</main>

				<footer className="flex h-16 flex-none items-center justify-between gap-4 px-6 shadow-[inset_0_1px_0_var(--hairline)]">
					<div className="flex items-center gap-3">
						<div className="flex gap-1.5" aria-hidden>
							{STEPS.map((s, i) => (
								<span
									key={s}
									className={cn(
										"h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
										i === index ? "w-4 bg-brand-light" : i < index ? "w-1.5 bg-white/40" : "w-1.5 bg-white/12",
									)}
								/>
							))}
						</div>
						<span className="text-[12px] text-text-faint tabular-nums">
							{t("onboarding.step", { n: index + 1, total: STEPS.length })}
						</span>
					</div>
					<div className="flex items-center gap-2">
						{step === "done" ? (
							<>
								<Button onClick={() => finish(true)}>{t("onboarding.done.settings")}</Button>
								<Button variant="primary" onClick={() => finish()} autoFocus>
									{t("onboarding.done.start")}
								</Button>
							</>
						) : (
							<>
								<button
									type="button"
									className="me-1 rounded-md px-2 py-1 text-[12.5px] text-text-dim transition-colors hover:text-text"
									onClick={() => finish()}
								>
									{t("onboarding.skip")}
								</button>
								{index > 0 && <Button onClick={() => go(index - 1)}>{t("onboarding.back")}</Button>}
								<Button variant="primary" onClick={() => go(index + 1)} autoFocus>
									{t("onboarding.next")}
								</Button>
							</>
						)}
					</div>
				</footer>
			</div>
		</MotionConfig>
	);
}

/** Frameless window: the app's mark to drag by, and a Windows close button. */
function TitleBar({ onClose }: { onClose: () => void }) {
	const t = useT();
	return (
		<header className="flex h-11 flex-none items-center justify-between" data-tauri-drag-region>
			<div className="pointer-events-none flex items-center gap-2.5 ps-4">
				<AppLogo size={18} />
				<span className="text-[12px] text-text-dim">Dynamo</span>
			</div>
			<button
				type="button"
				aria-label={t("onboarding.close")}
				title={t("onboarding.close")}
				className="grid h-8 w-11.5 place-items-center self-start font-glyph text-[10px] text-text transition-colors duration-100 ease-out hover:bg-[#c42b1c] hover:text-white"
				onClick={onClose}
			>
				{/* Segoe Fluent Icons' ChromeClose. */}
				{""}
			</button>
		</header>
	);
}

/** A step's heading: eyebrow, title, a sentence. */
function Head({ eyebrow, title, desc }: { eyebrow: MessageKey; title: MessageKey; desc: MessageKey }) {
	const t = useT();
	return (
		<div className="max-w-[34rem]">
			<p className="text-[11px] font-semibold tracking-[0.14em] text-brand-light uppercase">{t(eyebrow)}</p>
			<h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.02em]">{t(title)}</h1>
			<p className="mt-2 text-[14px] leading-relaxed text-text-dim">{t(desc)}</p>
		</div>
	);
}

/** A line that turns into a green check once the user has done the thing. */
function Hint({ ok, children }: { ok: boolean; children: ReactNode }) {
	return (
		<p
			className={cn(
				"mt-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] transition-colors duration-300",
				ok ? "bg-ok/12 text-text" : "bg-white/5 text-text-dim",
			)}
			aria-live="polite"
		>
			<span
				className={cn(
					"grid size-5 flex-none place-items-center rounded-full transition-colors duration-300",
					ok ? "bg-ok text-black" : "bg-white/10",
				)}
			>
				{ok ? <CheckIcon size={12} strokeWidth={3.5} /> : <MousePointer2Icon size={11} />}
			</span>
			{children}
		</p>
	);
}

/* --- 1. Meet the island: hover the real one -------------------------------------- */

function Meet({ opened }: { opened: boolean }) {
	const t = useT();
	return (
		<>
			<Head eyebrow="onboarding.meet.eyebrow" title="onboarding.meet.title" desc="onboarding.meet.desc" />
			{/* A little screen: the island at its top edge, opening once you've opened the real one. */}
			<div className="relative mt-6 h-36 overflow-hidden rounded-2xl bg-[#101012] shadow-[inset_0_0_0_1px_var(--hairline)]">
				<motion.div
					className="absolute top-0 left-1/2 flex -translate-x-1/2 items-center gap-2 overflow-hidden bg-black px-3 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
					initial={false}
					animate={
						opened
							? { width: 250, height: 64, borderRadius: "0 0 22px 22px" }
							: { width: 130, height: 24, borderRadius: "0 0 12px 12px" }
					}
					transition={SNAPPY}
				>
					<span className={cn("flex-none rounded-md bg-[#1f63ff] transition-all", opened ? "size-9" : "size-3")} />
					{opened && (
						<motion.span
							className="flex flex-col gap-1.5"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1, transition: { delay: 0.15 } }}
						>
							<span className="h-1.5 w-28 rounded-full bg-white/70" />
							<span className="h-1.5 w-18 rounded-full bg-white/30" />
						</motion.span>
					)}
				</motion.div>
				{!opened && (
					<MousePointer2Icon
						aria-hidden
						size={20}
						className="absolute top-14 left-[62%] fill-white text-black animate-[onboarding-cursor_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
					/>
				)}
			</div>
			<Hint ok={opened}>{t(opened ? "onboarding.meet.done" : "onboarding.meet.try")}</Hint>
		</>
	);
}

/* --- 2. Pick a look: restyles the real island as you choose -------------------------------- */

function Look({ values }: { values: Record<string, unknown> }) {
	const t = useT();
	const style = readSetting(values, appearanceSettings.style);
	const rim = borderColors(
		readSetting(values, appearanceSettings.border),
		readSetting(values, appearanceSettings.customColors),
	);
	return (
		<>
			<Head eyebrow="onboarding.look.eyebrow" title="onboarding.look.title" desc="onboarding.look.desc" />
			<fieldset aria-label={t("appearance.style.label")} className="m-0 mt-6 grid grid-cols-2 gap-3 border-0 p-0">
				{STYLES.map((s) => {
					const chosen = style === s.id;
					return (
						<button
							type="button"
							aria-pressed={chosen}
							key={s.id}
							className={cn(
								"flex flex-col gap-1 rounded-[14px] p-2 pb-3.5 text-start transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-white/4 active:scale-[0.985]",
								chosen ? "shadow-[inset_0_0_0_2px_var(--brand)]" : "shadow-[inset_0_0_0_1px_var(--hairline)]",
							)}
							onClick={() => setSetting(appearanceSettings.style, s.id)}
						>
							<StylePreview style={s.id} rim={s.id === "windows" ? rim : []} />
							<span className="mt-2.5 flex items-center gap-1.5 px-1 text-[14px] font-semibold">
								{t(s.name)}
								{chosen && (
									<span className="grid size-4 place-items-center rounded-full bg-brand text-white">
										<CheckIcon size={10} strokeWidth={3.5} />
									</span>
								)}
							</span>
							<span className="px-1 text-[12.5px] leading-snug text-text-dim">{t(s.desc)}</span>
						</button>
					);
				})}
			</fieldset>
		</>
	);
}

/* --- 3. Modules: what the island shows -------------------------------------------------- */

function Modules({ values }: { values: Record<string, unknown> }) {
	const t = useT();
	const picks = PICKS.flatMap(([id, desc]) => {
		const module = modules.find((m) => m.id === id);
		return module ? [{ module, desc, on: readSetting(values, moduleEnabled(module)) }] : [];
	});
	return (
		<>
			<div className="flex items-end justify-between gap-6">
				<Head eyebrow="onboarding.modules.eyebrow" title="onboarding.modules.title" desc="onboarding.modules.desc" />
				<span className="mb-1 flex-none rounded-full bg-white/6 px-2.5 py-1 text-[12px] font-medium text-text-dim tabular-nums">
					{t("onboarding.modules.count", { n: picks.filter((p) => p.on).length })}
				</span>
			</div>
			<div className="mt-5 grid grid-cols-3 gap-2">
				{picks.map(({ module, desc, on }) => (
					<button
						type="button"
						key={module.id}
						aria-pressed={on}
						className={cn(
							"relative flex items-start gap-2.5 rounded-xl p-2.5 text-start transition-[background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.98]",
							on
								? "bg-brand/10 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_45%,transparent)]"
								: "bg-white/3 shadow-[inset_0_0_0_1px_var(--hairline)] hover:bg-white/6",
						)}
						onClick={() => setSetting(moduleEnabled(module), !on)}
					>
						<span
							className={cn(
								"grid size-8 flex-none place-items-center rounded-lg transition-colors",
								on ? "bg-brand/25 text-white" : "bg-white/8 text-text-dim",
							)}
						>
							{module.settingsIcon}
						</span>
						<span className="flex min-w-0 flex-col">
							<span className="truncate text-[13px] font-semibold">{t(module.title)}</span>
							<span className="line-clamp-2 text-[11.5px] leading-snug text-text-dim">{t(desc)}</span>
						</span>
						<span
							aria-hidden
							className={cn(
								"absolute top-2 right-2 grid size-4 place-items-center rounded-full transition-[background-color,opacity] duration-150",
								on ? "bg-brand text-white" : "opacity-0",
							)}
						>
							<CheckIcon size={10} strokeWidth={3.5} />
						</span>
					</button>
				))}
			</div>
		</>
	);
}

/* --- 4. Connect: Claude Code, start with Windows, notifications ----------------------------- */

interface ClaudeState {
	integration?: { hooks: boolean; statusline: boolean };
}
interface NotificationsState {
	access: "noIdentity" | "denied" | "allowed" | "unavailable";
}

function Connect() {
	const t = useT();
	const claude = useProvider<ClaudeState>("claude");
	const notifications = useProvider<NotificationsState>("notifications");
	const claudeOn = !!claude?.integration?.hooks && !!claude.integration.statusline;
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [autostart, setAutostart] = useState(false);
	useEffect(() => {
		if (isTauri) command<boolean>("get_autostart").then((on) => setAutostart(!!on));
	}, []);

	const run = async (id: string, action: () => Promise<unknown>) => {
		setBusy(id);
		setError(null);
		try {
			await action();
		} catch (e) {
			setError(String(e));
		} finally {
			setBusy(null);
		}
	};

	return (
		<>
			<Head eyebrow="onboarding.connect.eyebrow" title="onboarding.connect.title" desc="onboarding.connect.desc" />
			<div className="mt-6 flex flex-col gap-2">
				<ConnectRow
					icon={<ClaudeIcon size={18} />}
					tint="#d97757"
					title={t("onboarding.connect.claude")}
					desc={t("onboarding.connect.claudeDesc")}
				>
					{claudeOn ? (
						<OnBadge />
					) : (
						<Button
							variant="primary"
							loading={busy === "claude"}
							disabled={!!busy || !claude}
							onClick={() => run("claude", () => providerAction("claude", "install"))}
						>
							{t("onboarding.connect.enable")}
						</Button>
					)}
				</ConnectRow>
				<ConnectRow
					icon={<PowerIcon size={17} />}
					tint="#30d158"
					title={t("onboarding.connect.autostart")}
					desc={t("onboarding.connect.autostartDesc")}
				>
					<Toggle
						checked={autostart}
						disabled={!isTauri}
						label={t("onboarding.connect.autostart")}
						onChange={(on) => {
							setAutostart(on);
							command<boolean>("set_autostart", { enabled: on }).then((v) => setAutostart(!!v));
						}}
					/>
				</ConnectRow>
				<ConnectRow
					icon={<BellIcon size={17} />}
					tint="#0a84ff"
					title={t("onboarding.connect.notifications")}
					desc={t("onboarding.connect.notificationsDesc")}
				>
					{notifications?.access === "allowed" ? (
						<OnBadge />
					) : (
						<Button
							loading={busy === "notifications"}
							disabled={!!busy || !notifications || notifications.access === "unavailable"}
							// Registers the package, then the app restarts; the tour comes back on this step.
							onClick={() => run("notifications", () => providerAction("notifications", "enable"))}
						>
							{t("onboarding.connect.enable")}
						</Button>
					)}
				</ConnectRow>
			</div>
			{error && <p className="mt-3 text-[12px] text-destructive-foreground">{error}</p>}
		</>
	);
}

function ConnectRow({
	icon,
	tint,
	title,
	desc,
	children,
}: {
	icon: ReactNode;
	tint: string;
	title: string;
	desc: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-3.5 rounded-xl bg-white/4 px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--hairline)]">
			<span
				className="grid size-9 flex-none place-items-center rounded-[10px]"
				style={{ background: `color-mix(in srgb, ${tint} 18%, transparent)`, color: tint }}
			>
				{icon}
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="text-[13.5px] font-semibold">{title}</span>
				<span className="text-[12px] leading-snug text-text-dim">{desc}</span>
			</span>
			{children}
		</div>
	);
}

function OnBadge() {
	const t = useT();
	return (
		<span className="flex flex-none items-center gap-1 rounded-full bg-ok/14 px-2.5 py-1 text-[12px] font-semibold text-ok">
			<CheckIcon size={12} strokeWidth={3} />
			{t("onboarding.connect.on")}
		</span>
	);
}

/* --- 5. Shortcuts: press one, from any app -------------------------------------------- */

function Keys({ tried }: { tried: "ask" | "find" | null }) {
	const t = useT();
	const rows: { id: "ask" | "find"; keys: string[]; label: MessageKey }[] = [
		{ id: "ask", keys: ["Ctrl", "Alt", "Space"], label: "onboarding.keys.ask" },
		{ id: "find", keys: ["Ctrl", "Alt", "F"], label: "onboarding.keys.find" },
	];
	return (
		<>
			<Head eyebrow="onboarding.keys.eyebrow" title="onboarding.keys.title" desc="onboarding.keys.desc" />
			<div className="mt-6 flex flex-col gap-2">
				{rows.map((row) => {
					const done = tried === row.id;
					return (
						<div
							key={row.id}
							className={cn(
								"flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 transition-colors duration-300",
								done
									? "bg-ok/10 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-ok)_40%,transparent)]"
									: "bg-white/4 shadow-[inset_0_0_0_1px_var(--hairline)]",
							)}
						>
							<span className="flex gap-1.5">
								{row.keys.map((k) => (
									<kbd
										key={k}
										className={cn(
											"grid h-9 min-w-9 place-items-center rounded-lg border border-b-[3px] px-2.5 font-mono text-[12.5px] font-semibold transition-colors duration-300",
											done ? "border-ok/50 bg-ok/12 text-text" : "border-white/14 bg-white/6 text-text",
										)}
									>
										{k}
									</kbd>
								))}
							</span>
							<span className="flex items-center gap-2 text-[13.5px] font-medium">
								{done && (
									<motion.span
										className="flex items-center gap-1 text-[12px] font-semibold text-ok"
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={SNAPPY}
									>
										<CheckIcon size={13} strokeWidth={3} />
										{t("onboarding.keys.tried")}
									</motion.span>
								)}
								{t(row.label)}
							</span>
						</div>
					);
				})}
			</div>
			<p className="mt-4 text-[12.5px] text-text-faint">{t("onboarding.keys.note")}</p>
		</>
	);
}

/* --- 6. Done: what's set up --------------------------------------------------------- */

function Done({ values, opened, tried }: { values: Record<string, unknown>; opened: boolean; tried: boolean }) {
	const t = useT();
	const claude = useProvider<ClaudeState>("claude");
	const [autostart, setAutostart] = useState(false);
	useEffect(() => {
		if (isTauri) command<boolean>("get_autostart").then((on) => setAutostart(!!on));
	}, []);
	const style = STYLES.find((s) => s.id === readSetting(values, appearanceSettings.style)) ?? STYLES[0];
	// The same count the modules step shows.
	const on = PICKS.filter(([id]) => {
		const module = modules.find((m) => m.id === id);
		return module && readSetting(values, moduleEnabled(module));
	}).length;
	const items: [boolean, string][] = [
		[opened, t("onboarding.done.opened")],
		[true, t("onboarding.done.look", { name: t(style.name) })],
		[true, t("onboarding.done.modules", { n: on })],
		[!!claude?.integration?.hooks, t("onboarding.done.claude")],
		[autostart, t("onboarding.done.autostart")],
		[tried, t("onboarding.done.shortcut")],
	];
	return (
		<div className="flex flex-col items-center text-center">
			<motion.span
				className="mt-2 grid size-16 place-items-center rounded-full bg-ok text-black shadow-[0_0_0_8px_color-mix(in_srgb,var(--color-ok)_14%,transparent)]"
				initial={{ scale: 0.6, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: "spring", duration: 0.5, bounce: 0.35 }}
			>
				<CheckIcon size={30} strokeWidth={3} />
			</motion.span>
			<h1 className="mt-5 text-[26px] font-semibold tracking-[-0.02em]">{t("onboarding.done.title")}</h1>
			<p className="mt-2 max-w-[30rem] text-[14px] leading-relaxed text-text-dim">{t("onboarding.done.desc")}</p>
			<ul className="mt-6 grid w-full max-w-[30rem] grid-cols-2 gap-1.5 text-start">
				{items.map(([ok, label]) => (
					<li
						key={label}
						className={cn(
							"flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px]",
							ok ? "bg-white/5" : "bg-white/2 text-text-faint",
						)}
					>
						<span
							className={cn(
								"grid size-4 flex-none place-items-center rounded-full",
								ok ? "bg-ok text-black" : "bg-white/10",
							)}
						>
							{ok && <CheckIcon size={10} strokeWidth={3.5} />}
						</span>
						{label}
					</li>
				))}
			</ul>
		</div>
	);
}
