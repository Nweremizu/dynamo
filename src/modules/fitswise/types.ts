import { providerAction } from "../../core/bridge";

/** Mirrors `Buds` in `src-tauri/src/providers/fitswise/mod.rs`. */
export type BudsStatus =
	| "off"
	| "bluetoothOff"
	| "notPaired"
	| "unsupported"
	| "disconnected"
	| "connecting"
	| "connected"
	| "silent";

export type NoiseMode = "anc" | "transparency" | "off";

export interface Cell {
	percent: number;
	charging: boolean;
	/** No longer reported: the last known level. */
	stale: boolean;
}

export interface Buds {
	status: BudsStatus;
	name: string | null;
	battery: { left: Cell | null; right: Cell | null; case: Cell | null };
	inCase: { left: boolean; right: boolean };
	caseOpen: boolean;
	mode: NoiseMode | null;
	appRunning: boolean;
}

export const FITSWISE_PROVIDER = "fitswise";
/** FitsWise's ice blue. */
export const FITSWISE = "#8fd3ff";

export const setNoiseMode = (mode: NoiseMode) => providerAction(FITSWISE_PROVIDER, "mode", mode);
