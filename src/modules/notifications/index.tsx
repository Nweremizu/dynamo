import { BellIcon } from "lucide-react";
/**
 * Windows notifications — WhatsApp, Teams, Outlook… mirrored into the
 * island. New ones arrive as alerts (through the activities module); this
 * module keeps the recent history. Backend: `src-tauri/src/providers/notifications/`.
 */
import { Marquee } from "../../components/Marquee";
import { useProvider } from "../../core/bridge";
import type { IslandModule, ModuleView } from "../../core/types";
import { useNow } from "../ai-agents/common/format";
import { AppIcon } from "./components/AppIcon";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { NotificationsSettings } from "./components/NotificationsSettings";
import { stacksOf } from "./stacks";
import { NOTIFICATION_BLUE, NOTIFICATIONS_PROVIDER, type NotificationsState } from "./types";

/** Unread notifications this recent keep a spot in the compact island. */
const UNREAD_WINDOW_MS = 5 * 60_000;
/** One app's stack: the card and its peeking sheets, with the gap under it. */
const STACK = 104;

export const notificationsModule: IslandModule = {
	id: "notifications",
	title: "notifications.title",
	settingsIcon: <BellIcon size={14} />,
	SettingsSection: NotificationsSettings,
	settingsSectionCards: true,
	useView(): ModuleView {
		const state = useProvider<NotificationsState>(NOTIFICATIONS_PROVIDER);
		const items = state?.items ?? [];
		const now = useNow(30_000, items.length > 0);
		const unread = items.filter((i) => !i.read);
		const latest = items[0];
		const recent = !!latest && !latest.read && now - latest.receivedAt < UNREAD_WINDOW_MS;

		return {
			active: recent,
			priority: 30,
			hidden: items.length === 0,
			accent: NOTIFICATION_BLUE,
			icon: <BellIcon size={14} color={NOTIFICATION_BLUE} />,
			compact: latest && {
				left: (
					<>
						<AppIcon app={latest.app} logo={latest.logo} size={24} />
						<Marquee text={latest.title} className="max-w-55 text-[13px] font-semibold" />
					</>
				),
				right:
					unread.length > 1 ? (
						<span
							className="grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white tabular-nums"
							style={{ background: NOTIFICATION_BLUE }}
						>
							{unread.length}
						</span>
					) : null,
				width: 340,
			},
			expanded: <NotificationsPanel state={state} />,
			expandedSize: { width: 560, height: 80 + Math.min(Math.max(stacksOf(items).length, 1), 3) * STACK },
		};
	},
};
