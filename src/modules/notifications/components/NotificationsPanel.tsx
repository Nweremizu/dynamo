import { BellIcon, CheckIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { providerAction } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { SNAPPY } from "../../../core/motion";
import { formatAgo, useNow } from "../../ai-agents/common/format";
import { type AppStack, stacksOf } from "../stacks";
import { NOTIFICATION_BLUE, NOTIFICATIONS_PROVIDER, type NotificationItem, type NotificationsState } from "../types";
import { AppIcon } from "./AppIcon";

const act = (name: string, payload?: unknown) => providerAction(NOTIFICATIONS_PROVIDER, name, payload);

/**
 * Notifications stacked by app, like a phone's lock screen: each app is one
 * card with its newest message and the rest peeking out underneath; the count
 * unfolds them. Click a card to open its app.
 */
export function NotificationsPanel({ state }: { state: NotificationsState | undefined }) {
	const t = useT();
	const now = useNow(30_000);
	const items = state?.items ?? [];
	const stacks = stacksOf(items);
	const [open, setOpen] = useState<string | null>(null);
	// What was new when the panel opened stays marked while you look, though looking marks it read.
	const [fresh] = useState(() => new Set(items.filter((i) => !i.read).map((i) => i.id)));
	const unread = items.some((i) => !i.read);
	useEffect(() => {
		if (unread) act("markRead");
	}, [unread]);

	const freshCount = items.filter((i) => fresh.has(i.id)).length;

	return (
		<div className="flex h-full flex-col" onClick={(e) => e.stopPropagation()}>
			<div className="flex h-8 flex-none items-center justify-between px-0.5">
				<div className="flex items-center gap-2">
					<span className="text-[15px] font-semibold tracking-[-0.01em]">{t("notifications.title")}</span>
					{freshCount > 0 && (
						<span
							className="rounded-full px-1.75 py-px text-[11px] font-semibold"
							style={{ background: `color-mix(in srgb, ${NOTIFICATION_BLUE} 22%, transparent)`, color: "#7cc0ff" }}
						>
							{t("notifications.new", { n: freshCount })}
						</span>
					)}
				</div>
				{items.length > 0 && (
					<button
						type="button"
						className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-text-dim transition-colors hover:bg-white/8 hover:text-text"
						onClick={() => act("clear")}
					>
						<XIcon size={12} strokeWidth={2.5} />
						{t("notifications.clearAll")}
					</button>
				)}
			</div>

			{stacks.length === 0 ? (
				<CaughtUp />
			) : (
				<ul
					className="-mx-2 mt-0.5 flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto px-2 pt-1.5 pb-1 [scrollbar-width:none]"
					data-scroll
				>
					{stacks.map((stack) => (
						<Stack
							key={stack.key}
							stack={stack}
							fresh={fresh}
							now={now}
							open={open === stack.key}
							onToggle={() => setOpen((o) => (o === stack.key ? null : stack.key))}
						/>
					))}
				</ul>
			)}
		</div>
	);
}

/** An app's notifications: the newest on top, up to two sheets peeking out under it until unfolded. */
function Stack({
	stack,
	fresh,
	now,
	open,
	onToggle,
}: {
	stack: AppStack;
	fresh: Set<number>;
	now: number;
	open: boolean;
	onToggle: () => void;
}) {
	const t = useT();
	const [first, ...rest] = stack.items;
	const depth = open ? 0 : Math.min(rest.length, 2);
	/** How far each sheet peeks out under the one above. */
	const peek = 7;

	return (
		<li className="relative flex-none" style={{ paddingBottom: depth * peek }}>
			{depth >= 2 && (
				<span
					aria-hidden
					className="absolute inset-x-7 bottom-0 h-8 rounded-b-[14px] bg-[#1e1e21] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
				/>
			)}
			{depth >= 1 && (
				<span
					aria-hidden
					className="absolute inset-x-3.5 h-8 rounded-b-[15px] bg-[#28282b] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
					style={{ bottom: (depth - 1) * peek }}
				/>
			)}
			<Card
				item={first}
				fresh={fresh.has(first.id)}
				now={now}
				// Folded, the cross puts the whole app away; unfolded, just this one.
				dismiss={() => act("dismiss", open ? first.id : stack.items.map((i) => i.id))}
				extra={
					rest.length > 0 && (
						<button
							type="button"
							aria-expanded={open}
							aria-label={open ? t("notifications.showLess") : t("notifications.showAll", { n: stack.items.length })}
							className="flex h-6.5 flex-none items-center gap-0.5 self-center rounded-full bg-white/8 px-2 text-[11.5px] font-semibold tabular-nums text-text-dim transition-colors hover:bg-white/14 hover:text-text"
							onClick={onToggle}
						>
							{open ? <ChevronUpIcon size={14} strokeWidth={2.5} /> : `+${rest.length}`}
						</button>
					)
				}
			/>
			<AnimatePresence initial={false}>
				{open &&
					rest.map((item, i) => (
						<motion.div
							key={item.id}
							className="mt-1.5"
							initial={{ opacity: 0, y: -12, scale: 0.97 }}
							animate={{ opacity: 1, y: 0, scale: 1, transition: { ...SNAPPY, delay: i * 0.03 } }}
							exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.12 } }}
						>
							<Card item={item} fresh={fresh.has(item.id)} now={now} dismiss={() => act("dismiss", item.id)} />
						</motion.div>
					))}
			</AnimatePresence>
		</li>
	);
}

function Card({
	item,
	fresh,
	now,
	dismiss,
	extra,
}: {
	item: NotificationItem;
	fresh: boolean;
	now: number;
	dismiss: () => void;
	extra?: ReactNode;
}) {
	const t = useT();
	return (
		<div className="group relative z-1 flex items-start gap-3 rounded-[16px] bg-[#1d1d1f] p-3 pr-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-colors hover:bg-[#242427]">
			<button
				type="button"
				className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none"
				title={item.app ? t("notifications.open", { app: item.app }) : undefined}
				onClick={() => act("open", item.id)}
			>
				<AppIcon app={item.app} logo={item.logo} size={38} />
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="flex items-center gap-1.5 text-[11.5px] leading-4">
						<span className="truncate font-semibold text-text-dim">{item.app}</span>
						<span className="flex-none text-text-faint tabular-nums">{formatAgo(t, item.receivedAt, now)}</span>
						{fresh && <span className="size-1.5 flex-none rounded-full" style={{ background: NOTIFICATION_BLUE }} />}
					</span>
					<span className="mt-0.5 truncate text-[13.5px] font-semibold leading-5">{item.title}</span>
					{item.body && <span className="line-clamp-2 text-[12.5px]/[1.4] text-text-dim">{item.body}</span>}
				</span>
			</button>
			{extra}
			<button
				type="button"
				aria-label={t("notifications.dismiss")}
				title={t("notifications.dismiss")}
				className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-[#3a3a3c] text-text opacity-0 shadow-[0_0_0_2px_#000] transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
				onClick={dismiss}
			>
				<XIcon size={11} strokeWidth={3} />
			</button>
		</div>
	);
}

/** Nothing left: a bell with a check. */
function CaughtUp() {
	const t = useT();
	return (
		<div className="grid flex-1 place-items-center">
			<div className="flex flex-col items-center gap-1.5 text-center">
				<span className="relative mb-1 grid size-11 place-items-center rounded-full bg-white/6">
					<BellIcon size={18} className="text-text-dim" />
					<span className="absolute -right-0.5 -bottom-0.5 grid size-4.5 place-items-center rounded-full bg-ok text-black shadow-[0_0_0_2px_#000]">
						<CheckIcon size={10} strokeWidth={3.5} />
					</span>
				</span>
				<span className="text-[13.5px] font-semibold">{t("notifications.caughtUp")}</span>
				<span className="max-w-80 text-[12px] text-text-dim">{t("notifications.caughtUpDesc")}</span>
			</div>
		</div>
	);
}
