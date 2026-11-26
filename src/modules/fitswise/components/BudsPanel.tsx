import { EarIcon, ShieldIcon, VolumeOffIcon, ZapIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "../../../core/cn";
import { type MessageKey, useT } from "../../../core/i18n";
import { type Buds, type Cell, FITSWISE, type NoiseMode, setNoiseMode } from "../types";

const MODES: { mode: NoiseMode; label: MessageKey; icon: typeof EarIcon }[] = [
	{ mode: "anc", label: "fitswise.mode.anc", icon: ShieldIcon },
	{ mode: "transparency", label: "fitswise.mode.transparency", icon: EarIcon },
	{ mode: "off", label: "fitswise.mode.off", icon: VolumeOffIcon },
];

/** The buds' name and state, a battery for each bud and the case, and noise control. */
export function BudsPanel({ buds }: { buds: Buds | undefined }) {
	const t = useT();
	const [error, setError] = useState(false);
	const connected = buds?.status === "connected";
	const status = buds?.status ?? "off";
	const note = status === "silent" && buds?.appRunning ? t("fitswise.status.appOpen") : t(`fitswise.status.${status}`);

	function choose(mode: NoiseMode) {
		setError(false);
		setNoiseMode(mode).catch(() => setError(true));
	}

	return (
		<div className="flex h-full items-center gap-5 px-2" onClick={(e) => e.stopPropagation()}>
			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<div className="flex min-w-0 flex-col gap-0.5">
					<span
						className={cn(
							"truncate text-[11px] font-semibold tracking-[0.06em] uppercase",
							connected ? "text-[#8fd3ff]" : "text-text-dim",
							error && "text-danger",
						)}
					>
						{error ? t("fitswise.failed") : note}
					</span>
					<h2 className="truncate text-[18px]/[1.2] font-semibold tracking-[-0.01em]">
						{buds?.name ?? "Beats Fit Pro"}
					</h2>
				</div>
				<div className="flex gap-2">
					<Battery label={t("fitswise.left")} cell={buds?.battery.left} />
					<Battery label={t("fitswise.right")} cell={buds?.battery.right} />
					<Battery label={t("fitswise.case")} cell={buds?.battery.case} />
				</div>
			</div>

			<fieldset className="flex w-44 flex-none flex-col gap-1" disabled={!connected}>
				<legend className="sr-only">{t("fitswise.mode.label")}</legend>
				{MODES.map(({ mode, label, icon: Icon }) => {
					const on = connected && buds?.mode === mode;
					return (
						<button
							key={mode}
							type="button"
							aria-pressed={on}
							onClick={() => choose(mode)}
							className={cn(
								"flex h-8.5 items-center gap-2.5 rounded-[10px] px-3 text-[12.5px] font-semibold transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] disabled:opacity-40",
								on ? "bg-[#8fd3ff] text-black" : "bg-white/7 text-text-dim hover:bg-white/12 hover:text-text",
							)}
						>
							<Icon size={15} aria-hidden />
							{t(label)}
						</button>
					);
				})}
			</fieldset>
		</div>
	);
}

/** One part's level: a bar that fills, the percentage, a bolt while it charges. Faded when it's an old reading. */
function Battery({ label, cell }: { label: string; cell: Cell | null | undefined }) {
	const low = !!cell && cell.percent <= 20 && !cell.charging;
	const color = low ? "#FF453A" : cell?.charging ? "#30D158" : FITSWISE;
	return (
		<div
			className={cn(
				"flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl bg-white/6 px-2.5 py-2",
				cell?.stale && "opacity-55",
			)}
		>
			<div className="flex items-center justify-between gap-1 text-[11.5px]">
				<span className="truncate text-text-dim">{label}</span>
				<span className="flex items-center gap-0.5 font-semibold tabular-nums">
					{cell?.charging && <ZapIcon size={11} color={color} fill={color} aria-hidden />}
					{cell ? `${cell.percent}%` : "–"}
				</span>
			</div>
			<span className="h-1 overflow-hidden rounded-full bg-white/10">
				<span
					className="block h-full rounded-full transition-[width] duration-500 ease-out"
					style={{ width: `${cell?.percent ?? 0}%`, background: color }}
				/>
			</span>
		</div>
	);
}
