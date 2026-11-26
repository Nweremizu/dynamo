/**
 * FitsWise — Beats Fit Pro in the island: each bud's and the case's battery,
 * and noise control. Peeks when the buds connect or switch mode (a long
 * press on a bud). Talks to the buds the way the FitsWise app does; while that
 * app is open it holds the buds' only control link, so this waits for it.
 * Backend: `src-tauri/src/providers/fitswise/`.
 */
import { EarbudsIcon } from "lucide-react";
import { useEffect } from "react";
import { providerAction, useProvider } from "../../core/bridge";
import { moduleEnabled, useSetting } from "../../core/settings";
import type { IslandModule, ModuleView } from "../../core/types";
import { BudsPanel } from "./components/BudsPanel";
import { type Buds, FITSWISE, FITSWISE_PROVIDER } from "./types";

export const fitswiseModule: IslandModule = {
	id: "fitswise",
	title: "fitswise.title",
	settingsIcon: <EarbudsIcon size={15} />,
	enabledByDefault: false,
	useView(): ModuleView {
		const enabled = useSetting(moduleEnabled(fitswiseModule));
		const buds = useProvider<Buds>(FITSWISE_PROVIDER);
		const connected = buds?.status === "connected";

		// Switched on or off: the backend looks right away instead of at its next check.
		useEffect(() => {
			providerAction(FITSWISE_PROVIDER, "refresh");
		}, [enabled]);

		return {
			active: false,
			priority: 0,
			// Only once there is a Fit Pro to talk about.
			hidden: !buds || buds.status === "off" || buds.status === "notPaired" || buds.status === "unsupported",
			accent: FITSWISE,
			icon: <EarbudsIcon size={14} color={FITSWISE} />,
			expanded: <BudsPanel buds={buds} />,
			expandedSize: { width: 560, height: 150 },
			activityKey: connected ? `on:${buds.mode ?? ""}` : undefined,
		};
	},
};
