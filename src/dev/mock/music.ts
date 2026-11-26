import { emitLocal } from "../../core/bridge";
import { showVolume } from "./activities";
import { art, defineMock, provider, svgArt } from "./kit";

const tracks = [
	{
		title: "Midnight City (Extended Version)",
		artist: "M83",
		album: "Hurry Up, We're Dreaming",
		durationMs: 283_000,
		thumbnail: art,
	},
	{
		title: "Blinding Lights",
		artist: "The Weeknd",
		album: "After Hours",
		durationMs: 200_000,
		thumbnail: svgArt(
			// A pastel mesh: butter yellow, mint and sky blue.
			"<defs><filter id='b' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='16'/></filter></defs><rect width='120' height='120' fill='#ffe27a'/><g filter='url(#b)'><circle cx='100' cy='100' r='44' fill='#7cc8ff'/><circle cx='16' cy='96' r='38' fill='#8fe3b8'/><circle cx='96' cy='14' r='30' fill='#fff4b8'/><circle cx='56' cy='62' r='20' fill='#b9f0d6'/></g>",
		),
	},
];

const state = provider("music", {
	available: true,
	playing: true,
	...tracks[0],
	appId: "Spotify.exe",
	appName: "Spotify",
	positionMs: 30_000,
	positionAt: Date.now(),
	canNext: true,
	canPrevious: true,
	youtubeId: null as string | null,
	volume: { level: 0.42, muted: false },
	appVolume: { level: 0.8, muted: false },
	appIcon: null as string | null,
	appDevice: null as string | null,
});

let track = 0;

const position = () => {
	const s = state.get();
	return s.playing ? s.positionMs + Date.now() - s.positionAt : s.positionMs;
};

/** Switches to track `index` (wrapping), `atMs` into it. */
export function playTrack(index: number, atMs = 0) {
	track = (index + tracks.length) % tracks.length;
	state.set((s) => ({ ...s, ...tracks[track], positionMs: atMs, positionAt: Date.now() }));
}

function setPlaying(playing: boolean) {
	state.set((s) => ({ ...s, playing, positionMs: position(), positionAt: Date.now() }));
}

function setSystemVolume(level: number) {
	state.set((s) => ({ ...s, volume: { ...s.volume, level } }));
	showVolume(level);
}

export const music = defineMock({
	label: "Music",
	start() {
		state.publish();
		// The next song once this one ends, and the waveform while playing.
		setInterval(() => {
			if (state.get().playing && position() >= state.get().durationMs) playTrack(track + 1);
		}, 1000);
		setInterval(() => {
			if (state.get().playing) emitLocal("music://level", 0.25 + Math.random() * 0.6);
		}, 33);
	},
	controls: [
		{
			kind: "toggle",
			label: "Player open",
			value: () => state.get().available,
			set: (available) => state.set((s) => ({ ...s, available })),
		},
		{ kind: "toggle", label: "Playing", value: () => state.get().playing, set: setPlaying },
		{
			kind: "select",
			label: "Track",
			options: tracks.map((t) => t.title),
			value: () => state.get().title,
			set: (title) => playTrack(tracks.findIndex((t) => t.title === title)),
		},
		{ kind: "button", label: "Next track", run: () => playTrack(track + 1) },
		{
			kind: "range",
			label: "System volume",
			min: 0,
			max: 1,
			step: 0.01,
			value: () => state.get().volume.level,
			set: setSystemVolume,
		},
	],
	actions: {
		music: {
			toggle: () => setPlaying(!state.get().playing),
			next: () => playTrack(track + 1),
			previous: () => playTrack(track - 1),
			seek: (ms) => state.set((s) => ({ ...s, positionMs: Number(ms), positionAt: Date.now() })),
			volume: (change) => {
				const { target, level, muted } = change as { target: "system" | "app"; level?: number; muted?: boolean };
				const key = target === "system" ? "volume" : "appVolume";
				state.set((s) => ({
					...s,
					[key]: { level: level ?? s[key].level, muted: muted ?? s[key].muted },
				}));
			},
		},
	},
});
