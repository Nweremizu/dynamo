import { CheckCircle2Icon, PencilIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { glowStyle, RimRing } from "../../components/island/Rim";
import { Block, Desc, Row, Section } from "../../components/ui/card";
import { Segmented } from "../../components/ui/form";
import {
	type Appearance,
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
	type GlassLevel,
	ISLAND_HIDDEN_KEY,
	type IslandStyle,
	readSetting,
	setSetting,
} from "../../core/settings";
import { useGlassSupported } from "../../core/useGlass";
import { PageHeader } from "../components/Heading";
import { Toggle, ToggleRow } from "../components/Toggle";
import { PAGES } from "../nav";

export const STYLES: {
	id: IslandStyle;
	name: "appearance.style.dynamic" | "appearance.style.windows";
	desc: "appearance.style.dynamicDesc" | "appearance.style.windowsDesc";
}[] = [
	{ id: "dynamic", name: "appearance.style.dynamic", desc: "appearance.style.dynamicDesc" },
	{ id: "windows", name: "appearance.style.windows", desc: "appearance.style.windowsDesc" },
];

/**
 * Look of the island: a live preview with the style picker under it, the
 * settings both styles share, then the Windows Island rim and layout.
 */
export function AppearancePage({ values }: { values: Record<string, unknown> }) {
	const t = useT();
	const glassSupported = useGlassSupported();
	const style = readSetting(values, appearanceSettings.style);
	const border = readSetting(values, appearanceSettings.border);
	const custom = readSetting(values, appearanceSettings.customColors);
	const rim = borderColors(border, custom);
	const windows = style === "windows";
	const look: Appearance = {
		style: windows ? "windows" : "dynamic",
		tabsPosition: readSetting(values, appearanceSettings.tabsPosition),
		rim,
		thickness: readSetting(values, appearanceSettings.thickness),
		animate: readSetting(values, appearanceSettings.animate),
		glow: readSetting(values, appearanceSettings.glow),
		glass: glassSupported ? glassLevel(readSetting(values, appearanceSettings.glass)) : "off",
		idleClock: readSetting(values, appearanceSettings.idleClock),
	};

	return (
		<>
			<PageHeader
				icon={PAGES.appearance.icon}
				tone={PAGES.appearance.tone}
				title={t("appearance.title")}
				desc={t("appearance.lead")}
			/>

			<Section title={t("appearance.style.label")} className="py-3">
				<LivePreview look={look} />
				<fieldset
					aria-label={t("appearance.style.label")}
					className="m-0 mt-3 grid min-w-0 grid-cols-2 gap-2 border-0 p-0"
				>
					{STYLES.map((s) => {
						const chosen = style === s.id;
						return (
							<button
								type="button"
								aria-pressed={chosen}
								key={s.id}
								className={cn(
									"flex items-start gap-3 rounded-[10px] p-3 text-start transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-white/4 active:scale-[0.985]",
									chosen
										? "bg-brand/8 shadow-[inset_0_0_0_2px_var(--brand)]"
										: "shadow-[inset_0_0_0_1px_var(--hairline)]",
								)}
								onClick={() => setSetting(appearanceSettings.style, s.id)}
							>
								<StyleGlyph style={s.id} />
								<span className="flex min-w-0 flex-col gap-0.5">
									<span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
										{t(s.name)}
										{chosen && <CheckCircle2Icon aria-hidden size={14} className="text-brand-light" />}
									</span>
									<Desc>{t(s.desc)}</Desc>
								</span>
							</button>
						);
					})}
				</fieldset>
			</Section>

			{/* Both styles. */}
			<Section title={t("appearance.groups.island")}>
				{glassSupported && (
					<Row label={t("appearance.glass.label")} desc={t("appearance.glass.desc")}>
						<Segmented
							label={t("appearance.glass.label")}
							options={GLASS_LEVELS.map((level) => ({ value: level, label: t(`appearance.glass.${level}`) }))}
							value={look.glass}
							onChange={(level) => setSetting(appearanceSettings.glass, level)}
						/>
					</Row>
				)}
				<Row as="label" label={t("appearance.hide.label")} desc={t("appearance.hide.desc")}>
					<Toggle checked={values[ISLAND_HIDDEN_KEY] === true} onChange={(v) => setSetting(ISLAND_HIDDEN_KEY, v)} />
				</Row>
			</Section>

			{windows ? (
				<>
					<Section title={t("appearance.border.label")}>
						<Block className="pt-3.5">
							<Desc>{t("appearance.border.desc")}</Desc>
							<fieldset
								aria-label={t("appearance.border.label")}
								className="m-0 grid min-w-0 grid-cols-5 gap-x-1 gap-y-3 border-0 p-0"
							>
								{BORDER_PRESETS.map((p) => (
									<Preset
										key={p.id}
										fill={swatchBackground(p.colors)}
										outlined={!p.colors.length}
										name={t(p.name)}
										selected={border === p.id}
										onPick={() => setSetting(appearanceSettings.border, p.id)}
									/>
								))}
								<Preset
									fill={swatchBackground(custom)}
									name={t("appearance.preset.custom")}
									selected={border === "custom"}
									onPick={() => setSetting(appearanceSettings.border, "custom")}
									edit
								/>
							</fieldset>
							{border === "custom" && (
								<div className="grid grid-cols-2 gap-2">
									{[0, 1].map((index) => (
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
								</div>
							)}
						</Block>
						{/* ponytail: Classic is a plain hairline, so its rim has nothing to tune. */}
						{rim.length > 0 && (
							<>
								<Row label={t("appearance.thickness.label")}>
									<Segmented
										label={t("appearance.thickness.label")}
										options={THICKNESSES.map((n) => ({ value: n, label: t(`appearance.thickness.${n}`) }))}
										value={look.thickness}
										onChange={(n) => setSetting(appearanceSettings.thickness, n)}
									/>
								</Row>
								<ToggleRow def={appearanceSettings.animate} value={look.animate} />
								<ToggleRow def={appearanceSettings.glow} value={look.glow} />
							</>
						)}
					</Section>

					<Section title={t("appearance.groups.windows")}>
						<ToggleRow def={appearanceSettings.idleClock} value={look.idleClock} />
						<Row label={t("appearance.tabsPosition.label")} desc={t("appearance.tabsPosition.desc")}>
							<Segmented
								label={t("appearance.tabsPosition.label")}
								options={[
									{ value: "top", label: t("appearance.tabsPosition.top") },
									{ value: "bottom", label: t("appearance.tabsPosition.bottom") },
								]}
								value={look.tabsPosition}
								onChange={(value) => setSetting(appearanceSettings.tabsPosition, value)}
							/>
						</Row>
					</Section>
				</>
			) : (
				<Section title={t("appearance.groups.windows")}>
					<Row label={t("appearance.windowsOnly")} desc={t("appearance.style.windowsDesc")}>
						<button
							type="button"
							className="rounded-md px-3 py-1.5 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--hairline)] transition-[background-color,scale] duration-150 ease-out hover:bg-white/6 active:scale-[0.97]"
							onClick={() => setSetting(appearanceSettings.style, "windows")}
						>
							{t("appearance.switchToWindows")}
						</button>
					</Row>
				</Section>
			)}
		</>
	);
}

/** How see-through each glass level makes the island, and how much it blurs. */
const GLASS: Record<GlassLevel, CSSProperties> = {
	off: { background: "#000" },
	subtle: { background: "rgb(0 0 0 / 0.78)", backdropFilter: "blur(8px)" },
	moderate: { background: "rgb(0 0 0 / 0.62)", backdropFilter: "blur(14px)" },
	strong: { background: "rgb(0 0 0 / 0.45)", backdropFilter: "blur(20px)" },
};

/** The island as it's set up right now, over a wallpaper with color for the glass to blur. */
function LivePreview({ look }: { look: Appearance }) {
	const windows = look.style === "windows";
	const background = rimBackground(look.rim);
	const fill = GLASS[look.glass];
	return (
		<div
			aria-hidden
			className="relative h-40 overflow-hidden rounded-lg bg-[radial-gradient(120%_120%_at_80%_100%,#3b3a6b_0%,#16162a_60%,#0d0d17_100%)]"
		>
			{/* Color right behind the island, for the glass to show. */}
			<span className="absolute top-0 left-[calc(50%-70px)] size-16 rounded-full bg-[#6866F9] blur-lg" />
			<span className="absolute top-2 left-[calc(50%+6px)] size-13 rounded-full bg-[#FF5F6D] blur-lg" />
			<span className="absolute right-6 bottom-5 h-14 w-28 rounded-md bg-white/6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" />
			<span className="absolute bottom-5 left-6 h-20 w-36 rounded-md bg-white/5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" />
			{windows ? (
				<div
					className={cn(
						"absolute top-3.5 left-1/2 grid h-8 -translate-x-1/2 place-items-center rounded-2xl transition-[width,box-shadow] duration-300 ease-out",
						look.idleClock ? "w-32" : "w-24",
					)}
					style={{ ...fill, ...glowStyle(look) }}
				>
					<RimRing background={background} width={background ? look.thickness : 1} animate={look.animate} />
					{look.idleClock && <span className="text-[12.5px] font-[650] text-white tabular-nums">9:41</span>}
				</div>
			) : (
				<div
					className="absolute top-0 left-1/2 h-8 w-40 -translate-x-1/2 rounded-b-2xl before:absolute before:top-0 before:right-full before:size-3 before:bg-[radial-gradient(circle_at_0_100%,transparent_70%,var(--fill)_71%)] after:absolute after:top-0 after:left-full after:size-3 after:bg-[radial-gradient(circle_at_100%_100%,transparent_70%,var(--fill)_71%)]"
					style={{ ...fill, "--fill": fill.background } as CSSProperties}
				/>
			)}
		</div>
	);
}

/** Each style's silhouette, small enough to sit beside its name. */
function StyleGlyph({ style }: { style: IslandStyle }) {
	return (
		<span className="relative mt-0.5 h-6 w-10 flex-none overflow-hidden rounded-md bg-white/8 shadow-[inset_0_0_0_1px_var(--hairline)]">
			<span
				className={cn(
					"absolute left-1/2 h-2 -translate-x-1/2 bg-text",
					style === "dynamic" ? "top-0 w-5 rounded-b-[4px]" : "top-1 w-6 rounded-full",
				)}
			/>
		</span>
	);
}

/** A miniature of each look (the welcome tour's style cards). */
export function StylePreview({ style, rim }: { style: IslandStyle; rim: string[] }) {
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

/** A border preset: its colors in a circle, its name under it. */
function Preset({
	fill,
	name,
	selected,
	onPick,
	outlined,
	edit,
}: {
	fill: string;
	name: string;
	selected: boolean;
	onPick: () => void;
	outlined?: boolean;
	edit?: boolean;
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			className="group flex min-w-0 flex-col items-center gap-1.5 rounded-lg py-1 transition-[scale] duration-150 ease-out active:scale-[0.96]"
			onClick={onPick}
		>
			<span
				className={cn(
					"grid size-10 place-items-center rounded-full shadow-[inset_0_0_0_2px_transparent] transition-[box-shadow] duration-150 ease-out group-hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.35)]",
					selected && "shadow-[inset_0_0_0_2px_#fff] group-hover:shadow-[inset_0_0_0_2px_#fff]",
				)}
			>
				<span
					className={cn(
						"grid size-[calc(100%-8px)] place-items-center rounded-full text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] [&_svg]:drop-shadow-[0_1px_1px_rgb(0_0_0/0.6)]",
						outlined && "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]",
					)}
					style={{ background: fill }}
				>
					{edit && <PencilIcon aria-hidden size={13} strokeWidth={2.4} />}
				</span>
			</span>
			<span
				className={cn(
					"line-clamp-2 w-full text-center text-[11.5px]/[1.25] text-balance",
					selected ? "font-medium text-text" : "text-text-dim",
				)}
			>
				{name}
			</span>
		</button>
	);
}

/** One color of the custom gradient. */
function Swatch({
	fill,
	title,
	selected,
	onPick,
}: {
	fill: string;
	title: string;
	selected: boolean;
	onPick: () => void;
}) {
	return (
		<button
			type="button"
			className={cn(
				"grid size-6.5 place-items-center rounded-full shadow-[inset_0_0_0_2px_transparent] transition-[box-shadow,scale] duration-150 ease-out hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.35)] active:scale-[0.96]",
				selected && "shadow-[inset_0_0_0_2px_#fff] hover:shadow-[inset_0_0_0_2px_#fff]",
			)}
			aria-pressed={selected}
			aria-label={title}
			title={title}
			onClick={onPick}
		>
			<span
				className="size-[calc(100%-8px)] rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
				style={{ background: fill }}
			/>
		</button>
	);
}
