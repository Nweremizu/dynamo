import { FolderOpenIcon, PlayIcon, RotateCcwIcon, Volume2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Block, Desc, Row } from "../../../components/ui/card";
import { providerAction, useProvider } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { setSetting, useSetting } from "../../../core/settings";
import { Toggle } from "../../../settings/components/Toggle";
import { CheckBadge, CheckBadges } from "../common/components/CheckBadge";
import { claudeSounds } from "../settings";

interface IntegrationState {
	integration: { hooks: boolean; statusline: boolean; serverOk: boolean; permissions: boolean };
}

/** Claude Code integration status + install/remove, and the alert sounds, for the settings window. */
export function ClaudeSettings() {
	return (
		<>
			<Integration />
			<SoundRow kind="done" />
			<SoundRow kind="permission" />
		</>
	);
}

function Integration() {
	const state = useProvider<IntegrationState>("claude");
	const t = useT();
	const [busy, setBusy] = useState<"install" | "uninstall" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const i = state?.integration;
	const installed = !!i?.hooks && !!i?.statusline;
	// Installed by an older version: the permission hook needs a longer timeout.
	const outdated = installed && !i?.permissions;

	const run = async (action: "install" | "uninstall") => {
		setBusy(action);
		setError(null);
		try {
			await providerAction("claude", action);
		} catch (e) {
			setError(String(e));
		} finally {
			setBusy(null);
		}
	};

	return (
		<Block>
			<Row
				label={t("claude.integration.title")}
				desc={t("claude.integration.desc", { file: "~/.claude/settings.json" })}
			>
				<div className="flex flex-none gap-2">
					{installed ? (
						<Button variant="danger" loading={busy === "uninstall"} disabled={!!busy} onClick={() => run("uninstall")}>
							{t("claude.integration.remove")}
						</Button>
					) : null}
					{(!installed || outdated) && (
						<Button
							variant="primary"
							loading={busy === "install"}
							disabled={!!busy || !state}
							onClick={() => run("install")}
						>
							{outdated ? t("claude.setup.update") : t("claude.integration.enable")}
						</Button>
					)}
				</div>
			</Row>
			<CheckBadges>
				<CheckBadge ok={!!i?.hooks}>Hooks</CheckBadge>
				<CheckBadge ok={!!i?.statusline}>Statusline</CheckBadge>
				<CheckBadge ok={!!i?.permissions}>{t("claude.integration.permissions")}</CheckBadge>
				<CheckBadge ok={!!i?.serverOk}>{t("claude.integration.server")}</CheckBadge>
			</CheckBadges>
			{installed && <Desc>{t("claude.integration.restart")}</Desc>}
			{error && <Desc tone="error">{error}</Desc>}
		</Block>
	);
}

/**
 * A sound on/off, then the file it plays on a strip of its own, with buttons
 * to hear it, pick another or go back to the default.
 */
function SoundRow({ kind }: { kind: keyof typeof claudeSounds }) {
	const t = useT();
	const defs = claudeSounds[kind];
	const enabled = useSetting(defs.enabled);
	const file = useSetting(defs.file);
	const name = file ? file.split(/[\\/]/).pop() : t("claude.sound.default");

	const pick = async () => {
		const path = await providerAction<string | null>("claude", "pickSound");
		if (path) setSetting(defs.file, path);
	};

	return (
		<Block>
			<Row as="label" label={t(defs.enabled.label)}>
				<Toggle checked={enabled} onChange={(v) => setSetting(defs.enabled, v)} />
			</Row>
			<div
				inert={!enabled}
				className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-(--settings-field) py-1.5 ps-3 pe-1.5 shadow-[inset_0_0_0_1px_var(--hairline)] transition-opacity duration-200 data-[off=true]:opacity-45"
				data-off={!enabled}
			>
				<span className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px]">
					<Volume2Icon aria-hidden size={14} className="flex-none text-text-dim" />
					<span className="truncate" title={file ?? undefined}>
						{name}
					</span>
				</span>
				<span className="flex flex-none gap-1">
					<Button size="sm" onClick={() => providerAction("claude", "testSound", kind)}>
						<PlayIcon aria-hidden />
						{t("claude.sound.test")}
					</Button>
					<Button size="sm" onClick={pick}>
						<FolderOpenIcon aria-hidden />
						{t("claude.sound.choose")}
					</Button>
					{file && (
						<Button size="sm" onClick={() => setSetting(defs.file, null)}>
							<RotateCcwIcon aria-hidden />
							{t("claude.sound.reset")}
						</Button>
					)}
				</span>
			</div>
		</Block>
	);
}
