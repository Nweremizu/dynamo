/**
 * Building blocks for the browser mock: each provider mock is a {@link Mock}
 * that publishes fake state, answers the UI's actions and lists the controls
 * the DevTools panel shows for it.
 */
import { publishLocal } from "../../core/bridge";

/** A DevTools control. `value` is read on every render, so it can derive from any state. */
export type Control =
	| { kind: "button"; label: string; run: () => void }
	| { kind: "toggle"; label: string; value: () => boolean; set: (on: boolean) => void }
	| { kind: "select"; label: string; options: readonly string[]; value: () => string; set: (value: string) => void }
	| {
			kind: "range";
			label: string;
			min: number;
			max: number;
			step?: number;
			value: () => number;
			set: (value: number) => void;
	  };

/** Answers a `providerAction` call; the return value resolves the UI's promise. */
export type ActionHandler = (payload: unknown) => unknown;

export interface Mock {
	/** Section title in DevTools. */
	label: string;
	/** Publishes the initial state; may start timers. */
	start?: () => void;
	controls?: Control[];
	/** `providerAction` handlers, by provider id then action name. */
	actions?: Record<string, Record<string, ActionHandler>>;
	/** `command` handlers, by command name. */
	commands?: Record<string, ActionHandler>;
}

export const defineMock = (mock: Mock) => mock;

// DevTools re-renders when any mock state changes or an action is logged.
const listeners = new Set<() => void>();
let version = 0;

export function changed() {
	version++;
	for (const l of listeners) l();
}

export const devStore = {
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => void listeners.delete(listener);
	},
	version: () => version,
};

/** A provider's mock state: `set` publishes it to the UI and refreshes DevTools. */
export function provider<T>(id: string, initial: T) {
	let value = initial;
	return {
		id,
		get: () => value,
		set(next: T | ((prev: T) => T)) {
			value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
			publishLocal(id, value);
			changed();
		},
		publish: () => publishLocal(id, value),
	};
}

export interface LoggedCall {
	id: number;
	at: number;
	/** The provider id, or `command`. */
	target: string;
	name: string;
	payload: unknown;
	/** Whether a mock answered it. */
	handled: boolean;
}

const MAX_LOG = 30;
export const callLog: LoggedCall[] = [];

let nextCall = 0;

export function logCall(call: Omit<LoggedCall, "id">) {
	callLog.unshift({ ...call, id: nextCall++ });
	callLog.length = Math.min(callLog.length, MAX_LOG);
	changed();
}

/** Shared fake artwork. */
export const svgArt = (body: string) =>
	`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>${body}</svg>`)}`;

/** A mesh gradient: vivid blue with green, yellow and cyan blobs melting into it. */
export const art = svgArt(
	"<defs><filter id='b' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='16'/></filter></defs><rect width='120' height='120' fill='#1f63ff'/><g filter='url(#b)'><circle cx='18' cy='104' r='46' fill='#19d27c'/><circle cx='106' cy='16' r='40' fill='#ffd60a'/><circle cx='104' cy='106' r='34' fill='#2ee6f0'/><circle cx='22' cy='14' r='30' fill='#3a5bff'/><circle cx='62' cy='60' r='18' fill='#b6f36a'/></g>",
);
