import { ChevronRightIcon, GripVerticalIcon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Section } from "../../components/ui/card";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import { useOrderedModules } from "../../core/plugins/modules";
import { layoutSettings, moduleEnabled, readSetting, setSetting } from "../../core/settings";
import type { IslandModule } from "../../core/types";
import { PageHeader, Tile } from "../components/Heading";
import { PlacementSelect } from "../components/PlacementSelect";
import { Toggle } from "../components/Toggle";
import { PAGES } from "../nav";

/**
 * Every module of the island in one list: drag (or arrow-key) to reorder the
 * tabs, choose which ones sit in the tab bar (the rest stay one click away in
 * the launcher), turn them on or off, and open one for its own settings.
 * (Pointer-driven reorder: HTML drag & drop doesn't reach the webview while
 * Tauri handles file drops.)
 */
export function ModulesPage({ values }: { values: Record<string, unknown> }) {
	const t = useT();
	const ordered = useOrderedModules(values);
	const ids = ordered.map((m) => m.id);
	/** Moves a module one step up (-1) or down (+1), as the arrow keys on its handle do. */
	const move = (id: string, by: -1 | 1) => {
		const from = ids.indexOf(id);
		const to = from + by;
		if (to < 0 || to >= ids.length) return;
		const next = [...ids];
		[next[from], next[to]] = [next[to], next[from]];
		setSetting(layoutSettings.order, next);
	};

	return (
		<>
			<PageHeader
				icon={PAGES.modules.icon}
				tone={PAGES.modules.tone}
				title={t("modules.title")}
				desc={t("modules.desc")}
			/>
			<Section className="px-1.5 py-1.5">
				<Reorder.Group
					as="ul"
					axis="y"
					className="flex list-none flex-col gap-px"
					values={ids}
					onReorder={(next: string[]) => setSetting(layoutSettings.order, next)}
				>
					{ordered.map((m) => (
						<ModuleRow key={m.id} module={m} enabled={readSetting(values, moduleEnabled(m))} onMove={move} />
					))}
				</Reorder.Group>
			</Section>
		</>
	);
}

function ModuleRow({
	module,
	enabled,
	onMove,
}: {
	module: IslandModule;
	enabled: boolean;
	onMove: (id: string, by: -1 | 1) => void;
}) {
	const t = useT();
	const drag = useDragControls();
	const navigate = useNavigate();
	const name = t(module.title);
	const open = () => navigate(`/modules/${module.id}`);
	const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
		e.preventDefault();
		onMove(module.id, e.key === "ArrowUp" ? -1 : 1);
	};

	return (
		<Reorder.Item
			as="li"
			value={module.id}
			className="relative flex min-h-11 items-center gap-2 rounded-lg bg-(--settings-group) pe-1 transition-colors duration-150 hover:bg-white/4"
			dragListener={false}
			dragControls={drag}
			whileDrag={{ scale: 1.02, boxShadow: "0 12px 28px -12px rgb(0 0 0 / 0.7)", zIndex: 1 }}
		>
			<button
				type="button"
				className="grid h-8 w-6 flex-none cursor-grab touch-none place-items-center rounded-md text-text-faint transition-colors hover:text-text active:cursor-grabbing"
				aria-label={t("layout.reorder", { name })}
				title={t("layout.drag")}
				onPointerDown={(e) => drag.start(e)}
				onKeyDown={onKeyDown}
			>
				<GripVerticalIcon aria-hidden size={14} />
			</button>
			<button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-start" onClick={open}>
				<span className={cn("transition-opacity duration-150", !enabled && "opacity-45")}>
					<Tile size="sm">{module.settingsIcon}</Tile>
				</span>
				<span className={cn("flex min-w-0 flex-1 flex-col", !enabled && "text-text-dim")}>
					<span className="truncate text-[13.5px] font-medium">{name}</span>
				</span>
			</button>
			<PlacementSelect moduleId={module.id} disabled={!enabled} compact />
			<Toggle
				checked={enabled}
				label={t("settings.module.labelFor", { name })}
				onChange={(v) => setSetting(moduleEnabled(module), v)}
			/>
			<button
				type="button"
				className="grid size-7 flex-none place-items-center rounded-md text-text-faint transition-colors duration-150 hover:bg-white/8 hover:text-text"
				aria-label={t("settings.open", { name })}
				title={t("modules.open")}
				onClick={open}
			>
				<ChevronRightIcon aria-hidden size={15} />
			</button>
		</Reorder.Item>
	);
}
