import { describe, expect, test } from "bun:test";
import { agentPaint, gradientAt, shades } from "./paint";
import type { AgentDefinition } from "./types";

const solid = { id: "a", name: "A", color: "#D97757" } as AgentDefinition;
const brand = {
	...solid,
	color: "#6866F9",
	gradient: { light: "#9E8BFF", deep: "#3A4DF2", tint: "#C7D6FF" },
} as AgentDefinition;

describe("agentPaint", () => {
	test("a gradient agent sets its stops and tint", () => {
		expect(agentPaint(brand) as Record<string, string>).toEqual({
			"--agent": "#6866F9",
			"--agent-light": "#9E8BFF",
			"--agent-deep": "#3A4DF2",
			"--agent-tint": "#C7D6FF",
		});
	});

	test("a solid agent sets its color everywhere, so it looks as before", () => {
		expect(new Set(Object.values(agentPaint(solid)))).toEqual(new Set(["#D97757"]));
	});
});

describe("gradientAt", () => {
	test("runs deep, then base, then light", () => {
		expect(gradientAt(0)).toBe("color-mix(in oklab, var(--agent-deep), var(--agent) 0%)");
		expect(gradientAt(0.5)).toBe("color-mix(in oklab, var(--agent-deep), var(--agent) 100%)");
		expect(gradientAt(1)).toBe("color-mix(in oklab, var(--agent), var(--agent-light) 100%)");
	});

	test("clamps outside 0–1", () => {
		expect(gradientAt(-1)).toBe(gradientAt(0));
		expect(gradientAt(2)).toBe(gradientAt(1));
	});
});

describe("shades", () => {
	test("a gradient agent uses its stops, then its deep end faded", () => {
		expect(shades(brand)).toEqual([
			"var(--agent-light)",
			"var(--agent)",
			"var(--agent-deep)",
			"color-mix(in srgb, var(--agent-deep) 40%, transparent)",
		]);
	});

	test("a solid agent fades its color in four distinct steps", () => {
		expect(new Set(shades(solid)).size).toBe(4);
	});
});
