import { useEffect, useRef } from "react";
import { command, onEvent } from "../../../core/bridge";
import { cn } from "../../../core/cn";
import { LEVEL_EVENT } from "../hooks/useMusic";

const WEIGHTS = [0.6, 0.9, 1, 0.8, 0.55];
const SAMPLE_MS = 1000 / 30;
const SILENCE = 0.004;
const SETTLED = 0.002;
const GAP_RATIO = 0.75;

// Compact and expanded views can overlap while the old one animates out.
let activeVisualizers = 0;
function acquireMeter() {
	if (++activeVisualizers === 1) command("set_music_level_active", { active: true }).catch(console.error);
	return () => {
		if (--activeVisualizers === 0) command("set_music_level_active", { active: false }).catch(console.error);
	};
}

function barPath(levels: number[], height: number, width: number): string {
	return levels
		.map((level, i) => {
			const x = width / 2 + (1 + GAP_RATIO) * width * i;
			const length = Math.max(0.001, (height - width) * level);
			return `M${x} ${((height - length) / 2).toFixed(3)}v${length.toFixed(3)}`;
		})
		.join("");
}

const dots = WEIGHTS.map(() => 0);

/**
 * Audio bars driven by the player's peak level (`music://level`).
 *
 * Raw peaks depend on volume and are smoothed by Windows, so the level goes
 * through an automatic gain (normalised by the recent max) and the deviation
 * from its moving average is boosted to make beats visible. One stroked SVG
 * path keeps the caps round while keeping the visualizer's outer size fixed.
 */
export function Visualizer({
	playing,
	color,
	height = 22,
	barWidth = 3,
	className,
}: {
	playing: boolean;
	color: string;
	height?: number;
	barWidth?: number;
	className?: string;
}) {
	const path = useRef<SVGPathElement>(null);
	const levels = useRef(WEIGHTS.map(() => 0));

	useEffect(() => {
		let timer: number | undefined;
		let raw = 0;
		let t = 0;
		let previous = performance.now();
		let peak = 0.05;
		let average = 0;
		let lastPath = "";

		const tick = () => {
			timer = undefined;
			const now = performance.now();
			const frames = Math.max(1, (now - previous) / (1000 / 60));
			previous = now;
			t += frames;

			peak = Math.max(raw, peak * 0.995 ** frames, 0.02);
			average += (raw - average) * (1 - 0.95 ** frames);
			const punch = Math.max(0, (raw - average) / peak) * 2.2;
			const energy = raw < SILENCE ? 0 : Math.min(1, (raw / peak) * 0.55 + punch);
			const current = levels.current;
			for (const [i, weight] of WEIGHTS.entries()) {
				const level = current[i];
				const wobble = 0.7 + 0.3 * Math.sin(t / (4 + i * 1.3) + i * 2.1);
				const goal = energy * weight * wobble;
				const next = goal + (level - goal) * (goal > level ? 0.5 : 0.86) ** frames;
				current[i] = goal === 0 && next < SETTLED ? 0 : next;
			}
			const d = barPath(current, height, barWidth);
			if (d !== lastPath) {
				path.current?.setAttribute("d", d);
				lastPath = d;
			}
			if (energy > 0 || current.some(Boolean)) timer = window.setTimeout(tick, SAMPLE_MS);
		};

		const stop = playing
			? onEvent<number>(LEVEL_EVENT, (level) => {
					raw = level;
					if (raw >= SILENCE && timer === undefined) {
						previous = performance.now();
						timer = window.setTimeout(tick, 0);
					}
				})
			: undefined;
		const releaseMeter = playing ? acquireMeter() : undefined;
		tick();
		return () => {
			stop?.();
			releaseMeter?.();
			window.clearTimeout(timer);
		};
	}, [playing, height, barWidth]);

	return (
		<svg
			aria-hidden
			className={cn("flex-none overflow-visible transition-colors duration-600 ease-[ease]", className)}
			height={height}
			width={barWidth * (WEIGHTS.length + GAP_RATIO * (WEIGHTS.length - 1))}
			style={{ color, filter: `drop-shadow(0 0 5px ${color}55)` }}
		>
			<path
				ref={path}
				d={barPath(dots, height, barWidth)}
				fill="none"
				stroke="currentColor"
				strokeWidth={barWidth}
				strokeLinecap="round"
			/>
		</svg>
	);
}
