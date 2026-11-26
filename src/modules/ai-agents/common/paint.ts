import type { CSSProperties } from "react";
import type { AgentDefinition } from "./types";

/**
 * An agent's colors as CSS variables, for its subtree:
 * - `--agent`: the base accent (spinners, single-color marks);
 * - `--agent-light`: the gradient's top, also used for accent text;
 * - `--agent-deep`: the gradient's bottom;
 * - `--agent-tint`: a soft backdrop.
 * An agent without a gradient sets all four to its `color`, so it looks as before.
 */
export function agentPaint(agent: AgentDefinition): CSSProperties {
	const g = agent.gradient;
	return {
		"--agent": agent.color,
		"--agent-light": g?.light ?? agent.color,
		"--agent-deep": g?.deep ?? agent.color,
		"--agent-tint": g?.tint ?? agent.color,
	} as CSSProperties;
}

/**
 * The color at `t` along the agent's gradient, 0 = deep (bottom) to 1 =
 * light (top), through the base at 0.5. Mixed in oklab so the blend stays vivid.
 */
export function gradientAt(t: number): string {
	const at = Math.max(0, Math.min(1, t));
	if (at <= 0.5) return `color-mix(in oklab, var(--agent-deep), var(--agent) ${Math.round(at * 200)}%)`;
	return `color-mix(in oklab, var(--agent), var(--agent-light) ${Math.round((at - 0.5) * 200)}%)`;
}

/**
 * Four distinct shades for a split bar, strongest first: the gradient's
 * stops then its deep end faded (the pale tint reads grey on the dark card),
 * or the solid color faded in steps.
 */
export function shades(agent: AgentDefinition): [string, string, string, string] {
	if (agent.gradient) {
		return [
			"var(--agent-light)",
			"var(--agent)",
			"var(--agent-deep)",
			"color-mix(in srgb, var(--agent-deep) 40%, transparent)",
		];
	}
	return [100, 72, 46, 24].map((mix) => `color-mix(in srgb, var(--agent) ${mix}%, transparent)`) as [
		string,
		string,
		string,
		string,
	];
}
