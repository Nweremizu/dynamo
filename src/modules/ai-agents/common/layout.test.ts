import { describe, expect, test } from "bun:test";
import { MAX_HEIGHT } from "../../../components/island/geometry";
import { PANEL, panelHeight } from "./layout";

const TAB_BAR = 46;

describe("panelHeight", () => {
	test("the busiest panel still fits the island", () => {
		expect(panelHeight({ rows: 4, usage: true }) + TAB_BAR).toBeLessThanOrEqual(MAX_HEIGHT);
		expect(panelHeight({ rows: 4, usage: true, permission: "detail" }) + TAB_BAR).toBeLessThanOrEqual(MAX_HEIGHT);
	});

	test("an empty list keeps one row for its message", () => {
		expect(panelHeight({ rows: 0, usage: false })).toBe(panelHeight({ rows: 1, usage: false }));
	});

	test("the usage strip adds its height and a gap", () => {
		expect(panelHeight({ rows: 2, usage: true }) - panelHeight({ rows: 2, usage: false })).toBe(
			PANEL.usage + PANEL.gap,
		);
	});
});
