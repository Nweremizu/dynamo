import { art, defineMock, provider } from "./kit";

type App = { name: string; icon: string | null };

const privacyState = provider("privacy", { mic: [] as App[], camera: [] as App[] });

export const privacy = defineMock({
	label: "Mic & camera",
	start: () => privacyState.publish(),
	controls: [
		{
			kind: "toggle",
			label: "Discord on the mic",
			value: () => privacyState.get().mic.length > 0,
			set: (on) => privacyState.set((s) => ({ ...s, mic: on ? [{ name: "Discord", icon: art }] : [] })),
		},
		{
			kind: "toggle",
			label: "Camera app on",
			value: () => privacyState.get().camera.length > 0,
			set: (on) => privacyState.set((s) => ({ ...s, camera: on ? [{ name: "WindowsCamera", icon: null }] : [] })),
		},
	],
});

const cell = (percent: number, charging = false) => ({ percent, charging, stale: false });
const budsState = provider("fitswise", {
	status: "connected",
	name: "Bruno's Beats Fit Pro",
	battery: { left: cell(82), right: cell(76), case: cell(54, true) },
	inCase: { left: false, right: false },
	caseOpen: false,
	mode: "anc" as string | null,
	appRunning: false,
});

const STATUSES = ["connected", "connecting", "disconnected", "silent", "bluetoothOff", "notPaired", "off"] as const;

export const fitswise = defineMock({
	label: "FitsWise",
	start: () => budsState.publish(),
	controls: [
		{
			kind: "select",
			label: "Status",
			options: STATUSES,
			value: () => budsState.get().status,
			set: (status) => budsState.set((s) => ({ ...s, status })),
		},
		{
			kind: "range",
			label: "Right bud %",
			min: 1,
			max: 100,
			value: () => budsState.get().battery.right.percent,
			set: (v) => budsState.set((s) => ({ ...s, battery: { ...s.battery, right: cell(v) } })),
		},
	],
	actions: {
		fitswise: {
			mode: (mode) => budsState.set((s) => ({ ...s, mode: mode as string })),
			refresh: () => undefined,
		},
	},
});
