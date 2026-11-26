/**
 * Alarm sounds, synthesized with Web Audio so they ship without audio files:
 * a two-note chime, a struck bell and a digital beep. When the webview won't
 * play sound (no audio device, autoplay blocked), Windows' reminder sound
 * plays instead through the calendar provider.
 */
import { providerAction } from "../../core/bridge";
import type { AlarmSound, AlarmVolume } from "./settings";

const GAIN: Record<AlarmVolume, number> = { low: 0.12, medium: 0.3, high: 0.6 };
/** One ring of each sound, in seconds; the alarm repeats it after a short gap. */
const LENGTH: Record<Exclude<AlarmSound, "none">, number> = { chime: 1.6, bell: 2.4, digital: 1.2 };
const GAP = 0.6;

let context: AudioContext | null = null;

async function audio(): Promise<AudioContext | null> {
	try {
		context ??= new AudioContext();
		if (context.state === "suspended") await context.resume();
		return context.state === "running" ? context : null;
	} catch {
		return null;
	}
}

/** One note: an oscillator through an envelope that strikes and fades. */
function note(
	ctx: AudioContext,
	out: AudioNode,
	at: number,
	freq: number,
	length: number,
	type: OscillatorType,
	peak: number,
) {
	const osc = ctx.createOscillator();
	const env = ctx.createGain();
	osc.type = type;
	osc.frequency.value = freq;
	env.gain.setValueAtTime(0, at);
	env.gain.linearRampToValueAtTime(peak, at + 0.012);
	env.gain.exponentialRampToValueAtTime(0.0001, at + length);
	osc.connect(env).connect(out);
	osc.start(at);
	osc.stop(at + length + 0.05);
}

/** Schedules one ring of `sound` at `at`. */
function ring(ctx: AudioContext, out: AudioNode, sound: Exclude<AlarmSound, "none">, at: number) {
	if (sound === "chime") {
		// A rising major third, soft sines.
		note(ctx, out, at, 880, 1.1, "sine", 0.9);
		note(ctx, out, at + 0.32, 1108.73, 1.3, "sine", 0.8);
	} else if (sound === "bell") {
		// A struck bell: a fundamental and its inharmonic partials, the high ones dying first.
		for (const [ratio, peak, length] of [
			[1, 0.8, 2.3],
			[2.76, 0.35, 1.4],
			[5.4, 0.18, 0.8],
			[8.93, 0.08, 0.5],
		] as const) {
			note(ctx, out, at, 523.25 * ratio, length, "sine", peak);
		}
	} else {
		// Four quick square beeps, like a kitchen timer.
		for (let i = 0; i < 4; i++) note(ctx, out, at + i * 0.16, 1760, 0.09, "square", 0.35);
	}
}

/**
 * Rings `sound` for `seconds` (0: until stopped; 1: a single ring). Returns
 * a function that stops it.
 */
export function playAlarm(sound: AlarmSound, volume: AlarmVolume, seconds: number): () => void {
	if (sound === "none") return () => {};
	let stopped = false;
	let master: GainNode | null = null;
	let timer: number | undefined;

	void audio().then((ctx) => {
		if (stopped) return;
		if (!ctx) {
			providerAction("calendar", "chime");
			return;
		}
		master = ctx.createGain();
		master.gain.value = GAIN[volume];
		master.connect(ctx.destination);
		const period = LENGTH[sound] + GAP;
		const until = seconds === 0 ? Number.POSITIVE_INFINITY : ctx.currentTime + Math.max(seconds, 0.1);
		let next = ctx.currentTime + 0.05;
		if (seconds === 1) {
			ring(ctx, master, sound, next);
			return;
		}
		// Schedules a couple of rings ahead, topping up as it goes, until the time is up.
		const top = () => {
			if (stopped || !master) return;
			while (next < until && next < ctx.currentTime + 2 * period) {
				ring(ctx, master, sound, next);
				next += period;
			}
			if (next < until) timer = window.setTimeout(top, period * 1000);
		};
		top();
	});

	return () => {
		stopped = true;
		window.clearTimeout(timer);
		if (master && context) {
			// A short fade instead of a click.
			master.gain.setTargetAtTime(0, context.currentTime, 0.04);
			const m = master;
			window.setTimeout(() => m.disconnect(), 300);
		}
	};
}
