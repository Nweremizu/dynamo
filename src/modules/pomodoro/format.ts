import type { Phase } from "./timer";

/** Focus warm, short break mint, long break the brand's light end; all readable on the black island. */
export const PHASE_COLOR: Record<Phase, string> = {
	focus: "#ff7a5c",
	short: "#3ddc97",
	long: "#9e8bff",
};

/** 4_500_000 → "1h 15m", 1_500_000 → "25m", 0 → "0m". */
export function formatDuration(ms: number): string {
	const m = Math.round(ms / 60_000);
	const h = Math.floor(m / 60);
	return h ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}
