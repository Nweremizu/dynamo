/**
 * The scratchpad and the to-do list, kept in localStorage (shared with the
 * settings window through the `storage` event, like the Pomodoro).
 */
import { useSyncExternalStore } from "react";

const KEY = "notes.state";
export const NOTES_YELLOW = "#FFD60A";

export interface Todo {
	id: string;
	text: string;
	done: boolean;
	/** Unix ms it's due, or null. */
	due: number | null;
	/** Its reminder was seen and put away. */
	alerted: boolean;
}

export interface NotesState {
	text: string;
	todos: Todo[];
}

const EMPTY: NotesState = { text: "", todos: [] };

function load(): NotesState {
	try {
		const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as NotesState | null;
		if (saved && typeof saved === "object") return { ...EMPTY, ...saved };
	} catch {
		/* unreadable: start fresh */
	}
	return EMPTY;
}

let state: NotesState = typeof localStorage === "undefined" ? EMPTY : load();
const listeners = new Set<() => void>();

function set(next: NotesState) {
	state = next;
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		/* storage full or blocked: keep it in memory */
	}
	for (const l of listeners) l();
}

if (typeof window !== "undefined") {
	window.addEventListener("storage", (e) => {
		if (e.key !== KEY) return;
		state = load();
		for (const l of listeners) l();
	});
}

const subscribe = (l: () => void) => {
	listeners.add(l);
	return () => listeners.delete(l);
};

export const useNotes = () => useSyncExternalStore(subscribe, () => state);

const patch = (id: string, f: (t: Todo) => Todo) =>
	set({ ...state, todos: state.todos.map((t) => (t.id === id ? f(t) : t)) });

/** "HH:MM" from a time field → the next time the clock shows it (today, or tomorrow if it's gone). */
export function nextAt(hhmm: string, now: number): number | null {
	const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
	if (!m) return null;
	const d = new Date(now);
	d.setHours(Number(m[1]), Number(m[2]), 0, 0);
	if (d.getTime() <= now) d.setDate(d.getDate() + 1);
	return d.getTime();
}

/** The open to-do whose reminder is due and not yet put away, earliest first. */
export const dueTodo = (todos: Todo[], now: number) =>
	todos
		.filter((t) => !t.done && !t.alerted && t.due !== null && t.due <= now)
		.sort((a, b) => (a.due ?? 0) - (b.due ?? 0))[0];

/** When the next reminder comes due, if any. */
export const nextDue = (todos: Todo[], now: number) =>
	Math.min(...todos.filter((t) => !t.done && !t.alerted && t.due !== null && t.due > now).map((t) => t.due as number));

export const notes = {
	setText: (text: string) => set({ ...state, text }),
	add: (text: string, due: number | null) => {
		const clean = text.trim();
		if (!clean) return;
		const todo: Todo = { id: crypto.randomUUID(), text: clean, done: false, due, alerted: false };
		set({ ...state, todos: [...state.todos, todo] });
	},
	toggle: (id: string) => patch(id, (t) => ({ ...t, done: !t.done })),
	dismiss: (id: string) => patch(id, (t) => ({ ...t, alerted: true })),
	remove: (id: string) => set({ ...state, todos: state.todos.filter((t) => t.id !== id) }),
	clearDone: () => set({ ...state, todos: state.todos.filter((t) => !t.done) }),
};
