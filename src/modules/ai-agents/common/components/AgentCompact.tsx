import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { Badge } from "../../../../components/coss/badge";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import { useIsland } from "../../../../core/island";
import { formatElapsed, useNow } from "../format";
import type { AgentSessionRef } from "../types";
import { StatusGlyph } from "./StatusGlyph";

/** Left slot of the compact pill: the agent's glyph, what it's doing, and how many are busy. */
export function AgentCompactLeft({ hot, busyCount }: { hot: AgentSessionRef; busyCount: number }) {
	const { agent, session } = hot;
	const t = useT();
	const { keepOpen } = useIsland();
	const hold = `agent-icon:${agent.id}`;
	useEffect(() => () => keepOpen(false, hold), [keepOpen, hold]);
	const label =
		session.status === "working"
			? (session.activity ?? t("agents.status.working"))
			: session.status === "waiting" && session.permission
				? // What it asks for ("Allow Bash?").
					t("agents.permission.compact", { tool: session.permission.tool })
				: session.status === "idle"
					? ""
					: session.status === "done" && session.summary
						? // How the reply starts.
							session.summary
						: t(`agents.status.${session.status}`);

	const glyph = <StatusGlyph agent={agent} status={session.status} size={16} />;

	return (
		<>
			{agent.openApp ? (
				<button
					type="button"
					data-no-drag
					className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label={agent.name}
					onPointerEnter={() => keepOpen(true, hold)}
					onPointerLeave={() => keepOpen(false, hold)}
					onClick={(event) => event.stopPropagation()}
					onDoubleClick={(event) => {
						event.stopPropagation();
						agent.openApp?.().catch(console.error);
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							agent.openApp?.().catch(console.error);
						}
					}}
				>
					{glyph}
				</button>
			) : (
				<span className="grid size-6 shrink-0 place-items-center">{glyph}</span>
			)}
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.span
					key={label}
					className={cn(
						"max-w-50 truncate text-[12.5px] font-medium text-foreground",
						session.status === "waiting" && "text-warning-foreground",
						session.status === "done" && "text-success-foreground",
					)}
					initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
					animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
					transition={{ type: "spring", duration: 0.3, bounce: 0 }}
				>
					{label}
				</motion.span>
			</AnimatePresence>
			{busyCount > 1 && (
				<Badge size="sm" variant="secondary" className="rounded-full px-1.5 tabular-nums">
					{busyCount}
				</Badge>
			)}
		</>
	);
}

/** Right slot: live turn timer, in the agent's color while it runs (final duration when done). */
export function AgentCompactRight({ hot }: { hot: AgentSessionRef }) {
	const { session } = hot;
	const running = session.status === "working" || session.status === "waiting";
	const now = useNow(1000, running);
	if (!session.turnStartedAt) return null;
	const end = running ? now : (session.finishedAt ?? now);

	return (
		<span
			className="text-[12.5px] font-medium text-muted-foreground tabular-nums"
			style={running ? { color: hot.agent.gradient?.light ?? hot.agent.color } : undefined}
		>
			{formatElapsed(end - session.turnStartedAt)}
		</span>
	);
}
