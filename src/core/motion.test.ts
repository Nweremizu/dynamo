import { describe, expect, test } from "bun:test";
import { rubberBand, spring } from "./motion";

describe("spring", () => {
	test("damping 1 is critically damped, below it overshoots", () => {
		const ratio = (s: ReturnType<typeof spring>) => s.damping / (2 * Math.sqrt(s.stiffness * s.mass));
		expect(ratio(spring(0.4))).toBeCloseTo(1);
		expect(ratio(spring(0.4, 0.8))).toBeCloseTo(0.8);
	});
});

describe("rubberBand", () => {
	test("resists more the further it goes, without ever passing its room", () => {
		expect(rubberBand(0)).toBe(0);
		expect(rubberBand(20)).toBeLessThan(20);
		expect(rubberBand(200) - rubberBand(180)).toBeLessThan(rubberBand(20));
		expect(rubberBand(1e6)).toBeLessThan(140);
		expect(rubberBand(-50)).toBeCloseTo(-rubberBand(50));
	});
});
