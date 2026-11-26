import { activity, showActivity } from "./activities";
import { defineMock, provider } from "./kit";

const ACCESS = ["allowed", "denied", "noIdentity", "unavailable"] as const;

const message = (id: number, app: string, title: string, body: string, receivedAt: number, read = true) => ({
	id,
	app,
	aumid: "",
	logo: null,
	title,
	body,
	receivedAt,
	read,
});

const now = Date.now();
const state = provider("notifications", {
	access: "allowed" as string,
	error: null,
	// A few apps with several each, so the panel shows its stacks.
	items: [
		message(1, "WhatsApp", "Ana", "Are we still on for tonight?", now - 60_000, false),
		message(
			7,
			"Discord",
			"#releases",
			"v0.6 is out: notes, a mic & camera dot and a new shelf 🎉",
			now - 4 * 60_000,
			false,
		),
		message(3, "WhatsApp", "Family", "Mom: Dinner at 8, don't be late!", now - 12 * 60_000, false),
		message(4, "WhatsApp", "Ana", "I'll book the table", now - 25 * 60_000),
		message(6, "Teams", "Rafael Souza", "Can you take a look at the PR before standup?", now - 40 * 60_000),
		message(8, "Discord", "Leo", "gg, rematch tomorrow?", now - 55 * 60_000),
		message(2, "Outlook", "Weekly sync", "Moved to 3 PM", now - 1_800_000 * 3),
	],
});

const samples = [
	["WhatsApp", "Ana", "Are we still on for tonight?"],
	["Discord", "#general", "New release is out 🎉"],
	["Outlook", "Weekly sync", "Moved to 3 PM"],
] as const;
let nextId = 100;

/** A new toast: the backend adds it to the list and shows it as an activity. */
export function notify(app: string, title: string, body: string) {
	const id = nextId++;
	state.set((s) => ({ ...s, items: [message(id, app, title, body, Date.now(), false), ...s.items] }));
	showActivity(
		activity(`notification.${id}`, {
			title,
			subtitle: body,
			caption: app,
			action: `app:${app}`,
			icon: "bell",
			color: "#0A84FF",
			priority: 60,
			expand: true,
			source: "notification",
		}),
		4_500,
	);
}

export const notifications = defineMock({
	label: "Notifications",
	start: () => state.publish(),
	controls: [
		{
			kind: "button",
			label: "New notification",
			run: () => {
				const [app, title, body] = samples[nextId % samples.length] ?? samples[0];
				notify(app, title, body);
			},
		},
		{
			kind: "select",
			label: "Access",
			options: ACCESS,
			value: () => state.get().access,
			set: (access) => state.set((s) => ({ ...s, access })),
		},
	],
	actions: {
		notifications: {
			markRead: () => state.set((s) => ({ ...s, items: s.items.map((n) => ({ ...n, read: true })) })),
			clear: () => state.set((s) => ({ ...s, items: [] })),
			dismiss: (ids) => {
				const gone = new Set([ids].flat() as number[]);
				state.set((s) => ({ ...s, items: s.items.filter((n) => !gone.has(n.id)) }));
			},
			open: (id) => state.set((s) => ({ ...s, items: s.items.filter((n) => n.id !== id) })),
			enable: () => state.set((s) => ({ ...s, access: "allowed" })),
		},
	},
});

export const setNotifications = state.set;
export { message as notificationMessage };
