import { ArrowUpRightIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactElement } from "react";
import { Badge } from "../../../../components/coss/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../../../components/coss/tooltip";
import { cn } from "../../../../core/cn";
import { type MessageKey, useT } from "../../../../core/i18n";
import { SETTLE } from "../../../../core/motion";
import { formatAgo, formatElapsed } from "../format";
import { PANEL } from "../layout";
import { agentPaint } from "../paint";
import type { AgentSession, AgentSessionRef, AgentStatus } from "../types";
import { StatusIcon } from "./StatusGlyph";

const BADGE: Record<AgentStatus, "info" | "warning" | "success" | "outline"> = {
	working: "info",
	waiting: "warning",
	done: "success",
	limitsReset: "success",
	idle: "outline",
};

/**
 * Every recent session across agents, the ones waiting on you first (after
 * devl's Run List): what it is and what it's doing on the leading side, the
 * live clock and its state on the trailing side. Clicking a row opens its
 * project; hovering shows the prompt and how the reply began.
 */
export function SessionList({ items, now, showAgent }: { items: AgentSessionRef[]; now: number; showAgent: boolean }) {
	const t = useT();
	return (
		<section className="flex min-h-0 flex-col gap-1">
			<h3 className="flex h-4.5 items-center px-2 text-[12px] font-medium text-muted-foreground">
				{t("agents.sessions")}
			</h3>
			{items.length ? (
				<ul className="flex list-none flex-col">
					<AnimatePresence initial={false} mode="popLayout">
						{items.map((item) => (
							<SessionRow key={`${item.agent.id}:${item.session.id}`} item={item} now={now} showAgent={showAgent} />
						))}
					</AnimatePresence>
				</ul>
			) : (
				<div className="flex flex-col justify-center px-2" style={{ height: PANEL.row }}>
					<span className="text-[13px] font-medium">{t("agents.noSessions")}</span>
					<span className="truncate text-[11.5px] text-muted-foreground">{t("agents.emptyBody")}</span>
				</div>
			)}
		</section>
	);
}

function SessionRow({ item, now, showAgent }: { item: AgentSessionRef; now: number; showAgent: boolean }) {
	const t = useT();
	const { agent, session } = item;
	const running = session.status === "working" || session.status === "waiting";
	const time =
		running && session.turnStartedAt
			? formatElapsed(now - session.turnStartedAt)
			: formatAgo(t, session.finishedAt ?? session.lastEventAt, now);
	// Busy: what it's doing. Otherwise what it was asked, which tells apart sessions of one project.
	const line = running ? session.activity : (session.prompt ?? session.summary ?? session.activity);
	const opens = !!(agent.openSession && session.cwd);
	const status = t(`agents.badge.${session.status}` as MessageKey);
	const tip = detail(session);

	const row: ReactElement = (
		<button
			type="button"
			disabled={!opens}
			aria-label={opens ? `${session.title || agent.name}: ${t("agents.openProject")}` : undefined}
			className="group/row flex w-full items-center gap-3 rounded-xl px-2 text-start outline-none transition-[background-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring enabled:cursor-pointer enabled:hover:bg-highlight enabled:active:scale-[0.99] disabled:cursor-default"
			style={{ height: PANEL.row }}
			onClick={(e) => {
				if (!opens) return;
				e.stopPropagation();
				agent.openSession?.(session);
			}}
		/>
	);

	return (
		<motion.li
			layout
			initial={{ opacity: 0, y: -4 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -4, transition: { duration: 0.15, ease: "easeOut" } }}
			transition={SETTLE}
		>
			<Tooltip disabled={!tip}>
				<TooltipTrigger delay={500} render={row}>
					<StatusIcon status={session.status} color={agent.color} label={status} />
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="flex min-w-0 items-center gap-1.5">
							{showAgent && (
								<span className="grid flex-none text-(--agent)" style={agentPaint(agent)} title={agent.name}>
									<agent.Icon size={12} />
								</span>
							)}
							<span className="truncate text-[13px] font-medium">{session.title || agent.name}</span>
							{opens && (
								<ArrowUpRightIcon
									aria-hidden
									className="size-3 flex-none text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/row:opacity-100"
								/>
							)}
						</span>
						<span
							className={cn(
								"truncate text-[11.5px] text-muted-foreground",
								session.status === "waiting" && "text-warning-foreground",
							)}
						>
							{line ?? status}
							{session.contextPct != null && (
								<span className="text-muted-foreground/70">
									{" · "}
									{t("agents.context", { n: Math.round(session.contextPct) })}
								</span>
							)}
						</span>
					</span>
					<span className="flex flex-none flex-col items-end gap-1">
						<span
							className={cn("text-[12px] font-medium tabular-nums", !running && "text-muted-foreground")}
							style={running ? { color: agent.gradient?.light ?? agent.color } : undefined}
						>
							{time}
						</span>
						<Badge size="sm" variant={BADGE[session.status]} className="rounded-full px-1.5">
							{status}
						</Badge>
					</span>
				</TooltipTrigger>
				{tip && (
					<TooltipPopup side="bottom" className="max-w-80 whitespace-pre-line">
						{tip}
					</TooltipPopup>
				)}
			</Tooltip>
		</motion.li>
	);
}

/** Tooltip: the prompt and how the reply started. */
function detail(session: AgentSession) {
	const parts = [session.prompt && `“${session.prompt}”`, session.summary].filter(Boolean);
	return parts.length ? parts.join("\n\n") : null;
}
