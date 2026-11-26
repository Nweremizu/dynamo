import { describe, expect, test } from "bun:test";
import { dueTodo, nextAt, nextDue, type Todo } from "./store";

const todo = (id: string, due: number | null, extra: Partial<Todo> = {}): Todo => ({
	id,
	text: id,
	done: false,
	due,
	alerted: false,
	...extra,
});

describe("notes reminders", () => {
	test("a time today, or tomorrow once it's gone", () => {
		const now = new Date(2026, 10, 26, 14, 0).getTime();
		expect(nextAt("15:30", now)).toBe(new Date(2026, 10, 26, 15, 30).getTime());
		expect(nextAt("09:00", now)).toBe(new Date(2026, 10, 27, 9, 0).getTime());
		expect(nextAt("", now)).toBeNull();
	});

	test("only open, unseen, past reminders are due, earliest first", () => {
		const todos = [
			todo("later", 300),
			todo("done", 50, { done: true }),
			todo("seen", 60, { alerted: true }),
			todo("b", 200),
			todo("a", 100),
			todo("none", null),
		];
		expect(dueTodo(todos, 250)?.id).toBe("a");
		expect(nextDue(todos, 250)).toBe(300);
		expect(dueTodo(todos, 50)).toBeUndefined();
		expect(nextDue([], 0)).toBe(Number.POSITIVE_INFINITY);
	});
});
