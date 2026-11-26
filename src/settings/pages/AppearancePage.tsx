import { CheckCircle2Icon, PencilIcon } from "lucide-react";
import { RimRing } from "../../components/island/Rim";
import { Block, Desc, Row, Section } from "../../components/ui/card";
import { Segmented } from "../../components/ui/form";
import {
	BORDER_PRESETS,
	borderColors,
	glassLevel,
	PALETTE,
	rimBackground,
	swatchBackground,
	THICKNESSES,
} from "../../core/appearance";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import {
	appearanceSettings,
	GLASS_LEVELS,
	ISLAND_HIDDEN_KEY,
	type IslandStyle,
	readSetting,
	setSetting,
} from "../../core/settings";
import { useGlassSupported } from "../../core/useGlass";
import { PageHeader } from "../components/Heading";
import { Toggle, ToggleRow } from "../components/Toggle";
import { PAGES } from "../nav";

const STYLES: {
	id: IslandStyle;
	name: "appearance.style.dynamic" | "appearance.style.windows";
	desc: "appearance.style.dynamicDesc" | "appearance.style.windowsDesc";
}[] = [
	{ id: "dynamic", name: "appearance.style.dynamic", desc: "appearance.style.dynamicDesc" },
	{ id: "windows", name: "appearance.style.windows", desc: "appearance.style.windowsDesc" },
];

/** Look of the island: the visual style and, for Windows Island, its rim. */
export function AppearancePage({ values }: { values: Record<string, unknown> }) {
	const t = useT();
	const glassSupported = useGlassSupported();
	const style = readSetting(values, appearanceSettings.style);
	const border = readSetting(values, appearanceSettings.border);
	const custom = readSetting(values, appearanceSettings.customColors);
	const thickness = readSetting(values, appearanceSettings.thickness);
	const rim = borderColors(border, custom);
	const windows = style === "windows";
	const hidden = values[ISLAND_HIDDEN_KEY] === true;

	return (
		<>
			<PageHeader
				icon={PAGES.appearance.icon}
				tone={PAGES.appearance.tone}
				title={t("appearance.title")}
				desc={t("appearance.lead")}
			/>

			<Section title={t("appearance.style.label")} className="py-4">
				<fieldset aria-label={t("appearance.style.label")} className="m-0 grid min-w-0 border-0 p-0 grid-cols-2 gap-3">
					{STYLES.map((s) => {
						const chosen = style === s.id;
						return (
							<button
								type="button"
								aria-pressed={chosen}
								key={s.id}
								className={cn(
									"flex flex-col gap-1 rounded-[10px] p-1.5 pb-3 text-start transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-white/4 active:scale-[0.985]",
									chosen ? "shadow-[inset_0_0_0_2px_var(--brand)]" : "shadow-[inset_0_0_0_1px_var(--hairline)]",
								)}
								onClick={() => setSetting(appearanceSettings.style, s.id)}
							>
								<StylePreview style={s.id} rim={s.id === "windows" ? rim : []} />
								<span className="mt-2 flex items-center gap-1.5 px-1 text-[13.5px] font-semibold">
									{t(s.name)}
									{chosen && <CheckCircle2Icon aria-hidden size={14} className="text-brand-light" />}
								</span>
								<Desc className="px-1">{t(s.desc)}</Desc>
							</button>
						);
					})}
				</fieldset>
			</Section>

			{/* Off (dimmed, out of the tab order) while the Notch style is on: none of it applies there. */}
			<Section
				title={t("appearance.groups.windows")}
				note={windows ? undefined : t("appearance.windowsOnly")}
				inert={!windows}
			>
				<Block>
					<Row label={t("appearance.border.label")} desc={t("appearance.border.desc")}>
						<span className="text-[13px] text-text-dim">
							{border === "custom"
								? t("appearance.preset.custom")
								: t(BORDER_PRESETS.find((p) => p.id === border)?.name ?? "appearance.preset.none")}
						</span>
					</Row>
					<fieldset
						aria-label={t("appearance.border.label")}
						className="m-0 flex min-w-0 border-0 p-0 flex-wrap gap-1.5"
					>
						{BORDER_PRESETS.map((p) => (
							<Swatch
								key={p.id}
								fill={swatchBackground(p.colors)}
								outlined={!p.colors.length}
								title={t(p.name)}
								selected={border === p.id}
								onPick={() => setSetting(appearanceSettings.border, p.id)}
							/>
						))}
						<Swatch
							fill={swatchBackground(custom)}
							title={t("appearance.preset.custom")}
							selected={border === "custom"}
							onPick={() => setSetting(appearanceSettings.border, "custom")}
							edit
						/>
					</fieldset>
					{border === "custom" &&
						[0, 1].map((index) => (
							<fieldset
								key={index}
								aria-label={t(index ? "appearance.custom.end" : "appearance.custom.start")}
								className="m-0 flex min-w-0 flex-col gap-1.5 rounded-lg border-0 bg-black/15 p-2.5 shadow-[inset_0_0_0_1px_var(--hairline)]"
							>
								<Desc>{t(index ? "appearance.custom.end" : "appearance.custom.start")}</Desc>
								<div className="flex flex-wrap gap-1">
									{PALETTE.map((color) => (
										<Swatch
											key={color}
											small
											fill={color}
											title={color}
											selected={custom[index]?.toLowerCase() === color.toLowerCase()}
											onPick={() => {
												const next = [custom[0] ?? PALETTE[7], custom[1] ?? PALETTE[4]];
												next[index] = color;
												setSetting(appearanceSettings.customColors, next);
											}}
										/>
									))}
								</div>
							</fieldset>
						))}
				</Block>

				<Row label={t("appearance.thickness.label")} disabled={!rim.length}>
					<Segmented
						label={t("appearance.thickness.label")}
						options={THICKNESSES.map((n) => ({ value: n, label: t(`appearance.thickness.${n}`) }))}
						value={thickness}
						disabled={!rim.length}
						onChange={(n) => setSetting(appearanceSettings.thickness, n)}
					/>
				</Row>
				<ToggleRow def={appearanceSettings.animate} value={readSetting(values, appearanceSettings.animate)} />
				<ToggleRow def={appearanceSettings.glow} value={readSetting(values, appearanceSettings.glow)} />
				<ToggleRow def={appearanceSettings.idleClock} value={readSetting(values, appearanceSettings.idleClock)} />
				<Row label={t("appearance.tabsPosition.label")} desc={t("appearance.tabsPosition.desc")}>
					<Segmented
						label={t("appearance.tabsPosition.label")}
						options={[
							{ value: "top", label: t("appearance.tabsPosition.top") },
							{ value: "bottom", label: t("appearance.tabsPosition.bottom") },
						]}
						value={readSetting(values, appearanceSettings.tabsPosition)}
						onChange={(value) => setSetting(appearanceSettings.tabsPosition, value)}
					/>
				</Row>
			</Section>

			{/* Both styles: the glass applies to either. */}
			<Section title={t("appearance.groups.island")}>
				{glassSupported && (
					<Row label={t("appearance.glass.label")} desc={t("appearance.glass.desc")}>
						<Segmented
							label={t("appearance.glass.label")}
							options={GLASS_LEVELS.map((level) => ({ value: level, label: t(`appearance.glass.${level}`) }))}
							value={glassLevel(readSetting(values, appearanceSettings.glass))}
							onChange={(level) => setSetting(appearanceSettings.glass, level)}
						/>
					</Row>
				)}
				<Row as="label" label={t("appearance.hide.label")} desc={t("appearance.hide.desc")}>
					<Toggle checked={hidden} onChange={(v) => setSetting(ISLAND_HIDDEN_KEY, v)} />
				</Row>
			</Section>
		</>
	);
}

/** A miniature of each look. */
function StylePreview({ style, rim }: { style: IslandStyle; rim: string[] }) {
	const background = rimBackground(rim);
	return (
		<div className="relative h-18.5 overflow-hidden rounded-lg bg-[radial-gradient(120%_120%_at_80%_100%,#3b3a6b_0%,#16162a_60%,#0d0d17_100%)]">
			<div
				className={cn(
					"absolute left-1/2 grid h-5.5 -translate-x-1/2 place-items-center bg-black",
					style === "dynamic"
						? "top-0 w-23 rounded-b-xl before:absolute before:top-0 before:right-full before:size-2 before:bg-[radial-gradient(circle_at_0_100%,transparent_70%,#000_71%)] after:absolute after:top-0 after:left-full after:size-2 after:bg-[radial-gradient(circle_at_100%_100%,transparent_70%,#000_71%)]"
						: "top-2 w-20 rounded-[11px]",
				)}
			>
				{style === "windows" && <RimRing background={background} width={1.5} />}
				{style === "windows" && <span className="text-[9.5px] font-[650] text-white">9:41</span>}
			</div>
		</div>
	);
}

function Swatch({
	fill,
	title,
	selected,
	onPick,
	outlined,
	small,
	edit,
}: {
	fill: string;
	title: string;
	selected: boolean;
	onPick: () => void;
	outlined?: boolean;
	small?: boolean;
	edit?: boolean;
}) {
	return (
		<button
			type="button"
			className={cn(
				"grid size-8 place-items-center rounded-full shadow-[inset_0_0_0_2px_transparent] transition-[box-shadow,scale] duration-150 ease-out hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.35)] active:scale-[0.96]",
				small && "size-6.5",
				selected && "shadow-[inset_0_0_0_2px_#fff] hover:shadow-[inset_0_0_0_2px_#fff]",
			)}
			aria-pressed={selected}
			aria-label={title}
			title={title}
			onClick={onPick}
		>
			<span
				className={cn(
					"grid size-[calc(100%-8px)] place-items-center rounded-full text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] [&_svg]:drop-shadow-[0_1px_1px_rgb(0_0_0/0.6)]",
					outlined && "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]",
				)}
				style={{ background: fill }}
			>
				{edit && <PencilIcon aria-hidden size={small ? 10 : 12} strokeWidth={2.4} />}
			</span>
		</button>
	);
}
