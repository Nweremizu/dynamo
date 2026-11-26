import { describe, expect, test } from "bun:test";
import { appColor, inkOn, stacksOf } from "./stacks";
import type { NotificationItem } from "./types";

const item = (id: number, app: string, receivedAt: number, read = true): NotificationItem => ({
	id,
	app,
	aumid: "",
	logo: null,
	title: `t${id}`,
	body: null,
	receivedAt,
	read,
});

describe("stacksOf", () => {
	test("groups by app, newest app first, newest first inside", () => {
		const stacks = stacksOf([item(1, "Outlook", 10), item(2, "WhatsApp", 30, false), item(3, "WhatsApp", 20, false)]);
		expect(stacks.map((s) => s.app)).toEqual(["WhatsApp", "Outlook"]);
		expect(stacks[0].items.map((i) => i.id)).toEqual([2, 3]);
		expect(stacks[0].unread).toBe(2);
		expect(stacks[1].unread).toBe(0);
	});
});

test("app colors: brands, and the same color every time for others", () => {
	expect(appColor("WhatsApp Beta")).toBe("#25D366");
	expect(appColor("Notion")).toBe(appColor("notion"));
	expect(inkOn("#FFD60A")).toBe("#000");
	expect(inkOn("#0F78D4")).toBe("#fff");
});
