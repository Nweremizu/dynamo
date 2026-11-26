import { ActivityIcon, ShieldAlertIcon } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Row } from "../../../components/ui/card";
import { Input, NumberField, Select } from "../../../components/ui/form";
import { Chip } from "../../../components/ui/text";
import { matchLocale, type Translate, useLocale, useT } from "../../../core/i18n";
import { pluginKey, pluginSettingKey } from "../../../core/plugins/store";
import type { LocalizedText, PluginSettingDef } from "../../../core/plugins/types";
import { readSetting, setSetting } from "../../../core/settings";
import { Toggle } from "../../components/Toggle";

/** What a permission lets a plugin do, in words. */
export function permissionLabel(permission: string, t: Translate): string {
	if (permission === "clipboard:read") return t("plugins.permission.clipboardRead");
	if (permission === "clipboard:write") return t("plugins.permission.clipboardWrite");
	if (permission === "open-url") return t("plugins.permission.openUrl");
	if (permission.startsWith("network:")) return t("plugins.permission.network", { host: permission.slice(8) });
	if (permission.startsWith("fs:read:")) return t("plugins.permission.fsRead", { path: permission.slice(8) });
	if (permission.startsWith("provider:")) return t("plugins.permission.provider", { provider: permission.slice(9) });
	return permission;
}

/** An index's text in the app's language. */
export function useLocalize() {
	const locale = useLocale();
	return (text: LocalizedText | null | undefined): string => {
		if (!text) return "";
		if (typeof text === "string") return text;
		const [code] = matchLocale(locale, Object.keys(text));
		return text[code] ?? Object.values(text)[0] ?? "";
	};
}

export function PermissionList({ permissions }: { permissions: string[] }) {
	const t = useT();
	return (
		<ul className="flex list-none flex-col gap-1.5 py-1">
			{permissions.map((p) => (
				<li key={p} className="flex items-start gap-2 text-[13px]">
					<span className="mt-1.5 size-1.5 flex-none rounded-full bg-warn" />
					<span>
						{permissionLabel(p, t)}
						<code className="ms-2 font-mono text-[11px] text-text-faint">{p}</code>
					</span>
				</li>
			))}
		</ul>
	);
}

/** Marks a plugin whose background never stops: it costs memory for as long as it's on. */
export function PersistentChip() {
	const t = useT();
	return (
		<Chip className="text-warn" icon={<ActivityIcon size={12} />} title={t("plugins.background.persistentHint")}>
			{t("plugins.background.persistent")}
		</Chip>
	);
}

/** Plugins and sources are third-party: say so where people get them. */
export function TrustNotice() {
	const t = useT();
	return (
		<div
			role="note"
			className="flex items-start gap-3 rounded-xl bg-warn/8 px-4 py-3 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-warn)_22%,transparent)]"
		>
			<ShieldAlertIcon aria-hidden size={16} className="mt-0.5 flex-none text-warn" />
			<div className="flex flex-col gap-0.5">
				<span className="text-[13px] font-semibold text-warn">{t("plugins.trust.title")}</span>
				<span className="text-[12.5px]/[1.45] text-text-dim text-pretty">{t("plugins.trust.body")}</span>
			</div>
		</div>
	);
}

/**
 * A centered modal dialog, on the native `<dialog>`: it keeps focus inside,
 * makes the window behind it inert, closes on Escape and gives focus back to
 * whatever opened it. Fades and scales in (`@starting-style`), unless the
 * system asks for reduced motion.
 */
export function Dialog({
	open,
	onClose,
	labelledBy,
	children,
}: {
	open: boolean;
	onClose: () => void;
	labelledBy?: string;
	children: ReactNode;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	}, [open]);
	return (
		<dialog
			ref={ref}
			aria-labelledby={labelledBy}
			className="m-auto w-[min(27.5rem,calc(100%-4rem))] scale-96 flex-col gap-3 overscroll-contain rounded-2xl bg-[#262629] p-5.5 text-text opacity-0 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8),inset_0_0_0_1px_var(--hairline)] transition-[opacity,scale,display,overlay] transition-discrete duration-200 ease-out backdrop:bg-black/0 backdrop:transition-[background-color,display,overlay] backdrop:transition-discrete backdrop:duration-200 open:flex open:scale-100 open:opacity-100 open:backdrop:bg-black/55 motion-reduce:scale-100 motion-reduce:transition-none starting:open:scale-96 starting:open:opacity-0 starting:open:backdrop:bg-black/0"
			onCancel={(e) => {
				e.preventDefault();
				onClose();
			}}
		>
			{children}
		</dialog>
	);
}

/** Asks before installing: what the plugin will be able to do. */
export function ConfirmInstall({
	name,
	update,
	permissions,
	persistent,
	busy,
	error,
	onCancel,
	onAccept,
}: {
	name: string | null;
	update: boolean;
	permissions: string[];
	persistent: boolean;
	busy: boolean;
	error: string | null;
	onCancel: () => void;
	onAccept: () => void;
}) {
	const t = useT();
	const title = useId();
	return (
		<Dialog open={name !== null} onClose={() => !busy && onCancel()} labelledBy={title}>
			<h2 id={title} className="text-[16px] font-semibold text-balance">
				{t(update ? "plugins.confirm.update" : "plugins.confirm.install", { name: name ?? "" })}
			</h2>
			{permissions.length ? (
				<>
					<p className="text-[13px] text-text-dim">{t("plugins.confirm.permissions")}</p>
					<PermissionList permissions={permissions} />
				</>
			) : (
				<p className="text-[13px] text-text-dim">{t("plugins.confirm.none")}</p>
			)}
			{persistent && <p className="text-[13px] text-warn">{t("plugins.confirm.persistent")}</p>}
			<p className="flex items-start gap-2 rounded-lg bg-warn/8 px-3 py-2 text-[12.5px]/[1.45] text-text-dim">
				<ShieldAlertIcon aria-hidden size={14} className="mt-0.5 flex-none text-warn" />
				{t("plugins.confirm.warning")}
			</p>
			{error && (
				<p role="alert" className="text-[12.5px] text-destructive-foreground select-text">
					{error}
				</p>
			)}
			<div className="mt-1 flex justify-end gap-2">
				<Button onClick={onCancel} disabled={busy}>
					{t("plugins.confirm.cancel")}
				</Button>
				<Button variant="primary" onClick={onAccept} disabled={busy}>
					{busy ? t("plugins.marketplace.installing") : t("plugins.confirm.accept")}
				</Button>
			</div>
		</Dialog>
	);
}

/** One setting declared in a plugin's `plugin.json`. */
export function PluginSettingRow({
	pluginId,
	def,
	values,
}: {
	pluginId: string;
	def: PluginSettingDef;
	values: Record<string, unknown>;
}) {
	const t = useT();
	const key = pluginSettingKey(pluginId, def.key);
	const value = readSetting(values, { key, label: "settings.module.label", default: def.default });
	const label = t(pluginKey(pluginId, def.label));
	const desc = def.description ? t(pluginKey(pluginId, def.description)) : undefined;
	const set = (v: unknown) => setSetting(key, v);

	switch (def.type) {
		case "boolean":
			return (
				<Row as="label" label={label} desc={desc}>
					<Toggle checked={value === true} onChange={set} />
				</Row>
			);
		case "number":
			return (
				<Row label={label} desc={desc}>
					<NumberSetting
						def={def}
						value={Number(value)}
						unit={def.unit ? t(pluginKey(pluginId, def.unit)) : ""}
						onChange={set}
					/>
				</Row>
			);
		case "select":
			return (
				<Row label={label} desc={desc}>
					<Select value={String(value)} onChange={(e) => set(e.target.value)}>
						{def.options?.map((o) => (
							<option key={o.value} value={o.value}>
								{t(pluginKey(pluginId, o.label))}
							</option>
						))}
					</Select>
				</Row>
			);
		default:
			return (
				<Row label={label} desc={desc}>
					<TextSetting value={String(value ?? "")} secret={def.secret} onChange={set} />
				</Row>
			);
	}
}

/** Saved when it's a number within bounds, so typing "1" on the way to "15" doesn't fail. */
function NumberSetting({
	def,
	value,
	unit,
	onChange,
}: {
	def: PluginSettingDef;
	value: number;
	unit: string;
	onChange: (v: number) => void;
}) {
	const [text, setText] = useState(String(value));
	useEffect(() => setText(String(value)), [value]);
	const commit = () => {
		const n = Number(text);
		const ok = text.trim() !== "" && Number.isFinite(n) && (def.min ?? n) <= n && n <= (def.max ?? n);
		if (ok) onChange(n);
		else setText(String(value));
	};
	return (
		<NumberField
			unit={unit}
			value={text}
			min={def.min}
			max={def.max}
			step={def.step ?? 1}
			onChange={(e) => setText(e.target.value)}
			onBlur={commit}
			onKeyDown={(e) => e.key === "Enter" && commit()}
		/>
	);
}

function TextSetting({ value, secret, onChange }: { value: string; secret?: boolean; onChange: (v: string) => void }) {
	const [text, setText] = useState(value);
	useEffect(() => setText(value), [value]);
	return (
		<Input
			className="w-56"
			type={secret ? "password" : "text"}
			value={text}
			onChange={(e) => setText(e.target.value)}
			onBlur={() => text !== value && onChange(text)}
			onKeyDown={(e) => e.key === "Enter" && onChange(text)}
		/>
	);
}
