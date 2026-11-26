import { RotateCcwIcon, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { IconButton } from "../../components/ui/button";
import { Row } from "../../components/ui/card";
import { providerAction, useProvider } from "../../core/bridge";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import { useAllModules } from "../../core/plugins/modules";
import { readSetting, setSetting } from "../../core/settings";
import {
	comboOf,
	modifiersOf,
	moduleShortcutId,
	SHORTCUTS_PROVIDER,
	type ShortcutId,
	type ShortcutsState,
	shortcutSetting,
	shortcutStateIds,
	showKeys,
} from "../../core/shortcuts";
import type { IslandModule } from "../../core/types";
import { Tile } from "./Heading";

/**
 * A global shortcut: click, then press the new combination (Esc cancels).
 * `label` names the action (a module's own page leaves the generic one);
 * `hint` turns off the "works from anywhere" line where the page says it once.
 */
export function ShortcutRow({
	id,
	values,
	label: actionLabel,
	icon,
	hint = true,
}: {
	id: ShortcutId;
	values: Record<string, unknown>;
	label?: string;
	icon?: ReactNode;
	hint?: boolean;
}) {
	const t = useT();
	const modules = useAllModules();
	const def = shortcutSetting(id);
	const status = useProvider<ShortcutsState>(SHORTCUTS_PROVIDER)?.[id];
	const chosen = readSetting(values, def);
	const [recording, setRecording] = useState(false);
	const [held, setHeld] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!recording) return;
		// The current combination would fire instead of reaching this window.
		providerAction(SHORTCUTS_PROVIDER, "pause");
		const stop = () => setRecording(false);
		const onKey = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.type === "keyup") return setHeld(modifiersOf(e));
			if (e.code === "Escape" && !modifiersOf(e).length) return stop();
			const combo = comboOf(e);
			if (!combo) return setHeld(modifiersOf(e));
			const other = shortcutStateIds(values).find(
				(o) => o !== id && (readSetting(values, shortcutSetting(o)) ?? shortcutSetting(o).fallback) === combo,
			);
			if (other)
				setError(
					t("shortcuts.duplicate", {
						keys: showKeys(combo),
						action: actionName(other, modules, t),
					}),
				);
			else {
				setError(null);
				setSetting(def, combo);
			}
			stop();
		};
		window.addEventListener("keydown", onKey, true);
		window.addEventListener("keyup", onKey, true);
		window.addEventListener("blur", stop);
		return () => {
			window.removeEventListener("keydown", onKey, true);
			window.removeEventListener("keyup", onKey, true);
			window.removeEventListener("blur", stop);
			setHeld([]);
			providerAction(SHORTCUTS_PROVIDER, "resume");
		};
	}, [recording, id, def, values, t, modules]);

	const keys = chosen ?? (def.fallback || null);
	const shown = keys ? showKeys(status?.keys && chosen === null ? status.keys : keys) : null;
	const label = recording
		? held.length
			? `${showKeys(held.join("+"))}+…`
			: t("shortcuts.press")
		: (shown ?? t("shortcuts.off"));
	const taken = !recording && status?.taken;
	// Opt-in shortcuts have no default to go back to: off is their reset.
	const hasDefault = !!def.fallback;

	return (
		<Row
			label={
				icon ? (
					<span className="flex items-center gap-2.5">
						<Tile size="sm">{icon}</Tile>
						{actionLabel ?? t("shortcuts.label")}
					</span>
				) : (
					(actionLabel ?? t("shortcuts.label"))
				)
			}
			desc={error ?? (taken ? t("shortcuts.taken", { keys: showKeys(taken) }) : hint ? t("shortcuts.desc") : undefined)}
			descTone={error || taken ? "error" : undefined}
		>
			<div className="flex flex-none items-center gap-1.5">
				{hasDefault && chosen !== null && !recording && (
					<IconButton
						size="sm"
						tone="faint"
						title={t("shortcuts.reset")}
						aria-label={t("shortcuts.reset")}
						onClick={() => setSetting(def, null)}
					>
						<RotateCcwIcon aria-hidden size={12} strokeWidth={2.2} />
					</IconButton>
				)}
				{/* Click to record; the keys sit on keycaps, or say "Off" / "Press the keys…". */}
				<button
					type="button"
					aria-label={`${actionLabel ?? t("shortcuts.label")}: ${label}`}
					aria-pressed={recording}
					className={cn(
						"flex h-8 min-w-32 items-center justify-center gap-1 rounded-lg bg-(--settings-field) px-2 text-[12px] text-text shadow-[inset_0_0_0_1px_var(--hairline)] transition-[background-color,box-shadow] duration-150 ease-out hover:bg-(--settings-field-hover)",
						!shown && !recording && "text-text-dim",
						recording && "text-brand-light shadow-[inset_0_0_0_1.5px_var(--brand-light)]",
					)}
					onClick={() => {
						setError(null);
						setRecording((r) => !r);
					}}
				>
					{shown && !recording ? <Keycaps keys={shown} /> : label}
				</button>
				{/* Hidden, not removed: the key buttons stay lined up row to row. */}
				<IconButton
					size="sm"
					tone="danger"
					title={t("shortcuts.disable")}
					aria-label={t("shortcuts.disable")}
					className={cn((!keys || recording) && "invisible")}
					onClick={() => setSetting(def, hasDefault ? "" : null)}
				>
					<XIcon aria-hidden size={11} strokeWidth={2.4} />
				</IconButton>
			</div>
		</Row>
	);
}

/** "Ctrl+Alt+F" as one keycap per key ("Ctrl++" keeps its plus key). */
function Keycaps({ keys }: { keys: string }) {
	const caps = keys.split(/\+(?=.)/).map((k) => k || "+");
	return (
		<span aria-hidden className="flex items-center gap-1">
			{caps.map((k, i) => (
				<kbd
					// biome-ignore lint/suspicious/noArrayIndexKey: a fixed combination, never reordered
					key={i}
					className="grid h-5.5 min-w-5.5 place-items-center rounded-[5px] bg-white/10 px-1.5 font-sans text-[11.5px] font-medium text-text shadow-[inset_0_-1px_0_rgb(0_0_0/0.35),inset_0_0_0_1px_rgb(255_255_255/0.07)]"
				>
					{k}
				</kbd>
			))}
		</span>
	);
}

/** What a shortcut opens, for the "already opens …" message. */
function actionName(id: ShortcutId, modules: IslandModule[], t: ReturnType<typeof useT>) {
	const module = modules.find((m) => moduleShortcutId(m) === id);
	return module ? t(module.title) : t(shortcutSetting(id).label);
}
