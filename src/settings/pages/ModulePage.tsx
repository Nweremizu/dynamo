import { ChevronRightIcon } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Button } from "../../components/ui/button";
import { Row, Section } from "../../components/ui/card";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import { useAllModules } from "../../core/plugins/modules";
import { pluginKey } from "../../core/plugins/store";
import type { PluginInfo } from "../../core/plugins/types";
import { moduleEnabled, readSetting, setSetting } from "../../core/settings";
import { moduleShortcutId } from "../../core/shortcuts";
import type { IslandModule } from "../../core/types";
import { PageHeader } from "../components/Heading";
import { PlacementSelect } from "../components/PlacementSelect";
import { ShortcutRow } from "../components/ShortcutRow";
import { Toggle, ToggleRow } from "../components/Toggle";

export function ModulePage({ values }: { values: Record<string, unknown> }) {
	const { id } = useParams();
	const modules = useAllModules();
	const module = modules.find((m) => m.id === id);
	if (!module) return <Navigate to="/modules" replace />;
	// Keyed so each module's `useHiddenSettings` hook gets its own component.
	return <ModuleSettings key={module.id} module={module} values={values} />;
}

const noHidden = () => [] as string[];

function ModuleSettings({ module, values }: { module: IslandModule; values: Record<string, unknown> }) {
	const t = useT();
	const hidden = (module.useHiddenSettings ?? noHidden)();
	const settings = module.settings?.filter((def) => !hidden.includes(def.key)) ?? [];

	const enabledDef = moduleEnabled(module);
	const enabled = readSetting(values, enabledDef);
	const Extra = module.SettingsSection;

	return (
		<>
			<PageHeader icon={module.settingsIcon} title={t(module.title)} />
			{module.plugin && <FromPlugin plugin={module.plugin.plugin} />}
			<Section>
				<Row as="label" label={t("settings.module.label")} desc={t("settings.module.desc")}>
					<Toggle checked={enabled} onChange={(v) => setSetting(enabledDef, v)} />
				</Row>
				<Row label={t("layout.place")} desc={t("layout.placeDesc")} disabled={!enabled}>
					<PlacementSelect moduleId={module.id} disabled={!enabled} />
				</Row>
			</Section>
			{/* Off (dimmed, out of the tab order) while the module is: none of it applies then. */}
			<div
				inert={!enabled}
				className={cn("flex flex-col gap-6 transition-opacity duration-200 ease-out", !enabled && "opacity-45")}
			>
				{!!settings.length && (
					<Section title={t("settings.module.options")}>
						{settings.map((def) => (
							<ToggleRow key={def.key} def={def} value={readSetting(values, def)} />
						))}
					</Section>
				)}
				<Section>
					<ShortcutRow id={moduleShortcutId(module)} values={values} />
				</Section>
				{Extra &&
					(module.settingsSectionCards ? (
						<Extra />
					) : (
						<Section>
							<Extra />
						</Section>
					))}
			</div>
		</>
	);
}

/** A plugin's module links back to the plugin's own page. */
function FromPlugin({ plugin }: { plugin: PluginInfo }) {
	const t = useT();
	const navigate = useNavigate();
	const name = t(pluginKey(plugin.id, plugin.manifest?.name ?? plugin.id));
	return (
		<Section>
			<Row label={t("plugins.module.from", { name })}>
				<Button onClick={() => navigate(`/plugins/${plugin.id}`)}>
					{t("plugins.module.open")}
					<ChevronRightIcon aria-hidden />
				</Button>
			</Row>
		</Section>
	);
}
