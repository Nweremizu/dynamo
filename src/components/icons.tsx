import { type SVGProps, useId } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 16, ...rest }: P) => ({
	width: size,
	height: size,
	viewBox: "0 0 24 24",
	fill: "currentColor",
	...rest,
});

/**
 * The app icon (same artwork as `src-tauri/app-icon.svg`): the island's pill,
 * rimmed in the brand gradient, with a glowing orb and level bars inside, on
 * a deep indigo tile lit from below the pill.
 */
export function AppLogo({ size = 16, ...rest }: P) {
	const id = useId().replace(/[^\w-]/g, "");
	const ref = (name: string) => `url(#${id}-${name})`;
	return (
		<svg width={size} height={size} viewBox="64 64 896 896" aria-hidden {...rest}>
			<defs>
				<linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#262a6b" />
					<stop offset="1" stopColor="#090a1c" />
				</linearGradient>
				<radialGradient id={`${id}-glow`} cx=".5" cy=".56" r=".55">
					<stop offset="0" stopColor="#6866f9" stopOpacity=".75" />
					<stop offset="1" stopColor="#6866f9" stopOpacity="0" />
				</radialGradient>
				<linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#fff" stopOpacity=".16" />
					<stop offset=".45" stopColor="#fff" stopOpacity="0" />
				</linearGradient>
				<linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#9e8bff" />
					<stop offset=".5" stopColor="#6866f9" />
					<stop offset="1" stopColor="#3a4df2" />
				</linearGradient>
				<radialGradient id={`${id}-orb`} cx=".38" cy=".34" r=".7">
					<stop offset="0" stopColor="#c7d6ff" />
					<stop offset=".45" stopColor="#9e8bff" />
					<stop offset="1" stopColor="#4b52f3" />
				</radialGradient>
			</defs>
			<rect x="64" y="64" width="896" height="896" rx="230" fill={ref("bg")} />
			<rect x="64" y="64" width="896" height="896" rx="230" fill={ref("glow")} />
			<rect x="64" y="64" width="896" height="896" rx="230" fill={ref("shine")} />
			<rect x="64.5" y="64.5" width="895" height="895" rx="229.5" fill="none" stroke="#fff" strokeOpacity=".1" />
			<rect x="184" y="392" width="656" height="240" rx="120" fill="#000" stroke={ref("rim")} strokeWidth="20" />
			<circle cx="306" cy="512" r="62" fill={ref("orb")} />
			<g fill="#c7d6ff">
				<rect x="586" y="472" width="26" height="80" rx="13" />
				<rect x="634" y="437" width="26" height="150" rx="13" />
				<rect x="682" y="460" width="26" height="104" rx="13" />
				<rect x="730" y="482" width="26" height="60" rx="13" fillOpacity=".7" />
			</g>
		</svg>
	);
}

export const GitHubIcon = (p: P) => (
	<svg aria-hidden {...base(p)}>
		<path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.5v-1.84c-2.92.63-3.54-1.4-3.54-1.4-.48-1.22-1.17-1.54-1.17-1.54-.95-.65.08-.64.08-.64 1.05.08 1.6 1.08 1.6 1.08.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.66-1.4-2.33-.27-4.78-1.17-4.78-5.18 0-1.14.4-2.08 1.08-2.81-.11-.27-.47-1.34.1-2.78 0 0 .88-.28 2.89 1.07a10 10 0 0 1 5.26 0c2-1.35 2.88-1.07 2.88-1.07.58 1.44.22 2.51.11 2.78.67.73 1.08 1.67 1.08 2.8 0 4.03-2.46 4.91-4.8 5.17.38.33.71.97.71 1.96v2.9c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
	</svg>
);

/** A font-independent water drop used by the hydration module. */
/** Launcher: every module in a grid. */
/** Drag handle for reorderable rows. */
