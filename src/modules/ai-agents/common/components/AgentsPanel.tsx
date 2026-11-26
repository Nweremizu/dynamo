import { useState } from "react";
import { Badge } from "../../../../components/coss/badge";
import { Tabs, TabsList, TabsTab } from "../../../../components/coss/tabs";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import { useNow } from "../format";
import { PANEL } from "../layout";
import { agentPaint } from "../paint";
import type { AgentDefinition, AgentSessionRef, AgentSnapshot } from "../types";
import { AgentCard } from "./AgentCard";
import { PermissionPrompt } from "./PermissionPrompt";
import { Rolling } from "./Rolling";
import { SessionList } from "./SessionList";
import { UsageChart } from "./UsageChart";

/** Expanded "AI Agents" panel. */
export function AgentsPanel({
	agents,
	snapshots,
	sessions,
}: {
	agents: AgentDefinition[];
	snapshots: AgentSnapshot[];
	sessions: AgentSessionRef[];
}) {
	const running = sessions.filter((s) => s.session.status === "working").length;
	const waiting = sessions.filter((s) => s.session.status === "waiting").length;
	const now = useNow(running + waiting ? 1000 : 30_000);
	const asking = sessions.filter((s) => s.session.permission && s.agent.decide);
	// Picked tab, else the agent of the busiest session.
	const [picked, setPicked] = useState<string | null>(null);
	const index = Math.max(
		0,
		agents.findIndex((a) => a.id === (picked ?? sessions[0]?.agent.id)),
	);
	const agent = agents[index];
	const snapshot = snapshots[index];
	const showAgent = agents.length > 1;

	// Something to answer: just that, and the sessions.
	if (asking.length) {
		return (
			<div className="flex h-full flex-col" style={{ gap: PANEL.gap }}>
				{/* biome-ignore lint/style/noNonNullAssertion: asking only holds sessions with a pending permission */}
				<PermissionPrompt key={asking[0].session.permission!.id} item={asking[0]} now={now} more={asking.length - 1} />
				<SessionList items={sessions} now={now} showAgent={showAgent} />
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col" style={{ gap: PANEL.gap }}>
			<header className="flex items-center gap-3" style={{ height: PANEL.header }}>
				{showAgent ? (
					<Tabs value={agent.id} onValueChange={(id) => setPicked(String(id))}>
						<TabsList size="sm" aria-label="Agents">
							{agents.map((a) => (
								<TabsTab
									key={a.id}
									value={a.id}
									className="px-2.5 text-[12.5px] sm:text-[12.5px]"
									onClick={(e) => e.stopPropagation()}
								>
									{/* Only the picked agent's icon takes its colors; the rest stay muted. */}
									<span
										className={cn("grid text-muted-foreground", a === agent && "text-(--agent)")}
										style={a === agent ? agentPaint(a) : undefined}
									>
										<a.Icon size={14} />
									</span>
									{a.name}
								</TabsTab>
							))}
						</TabsList>
					</Tabs>
				) : (
					<span className="flex items-center gap-2 text-(--agent)" style={agentPaint(agent)}>
						<agent.Icon size={16} />
						<span className="text-[14px] font-semibold text-foreground">{agent.name}</span>
					</span>
				)}
				<Summary running={running} waiting={waiting} />
			</header>
			<AgentCard key={agent.id} agent={agent} snapshot={snapshot} now={now} />
			{snapshot?.usage?.daily.length ? <UsageChart usage={snapshot.usage} agent={agent} /> : null}
			<SessionList items={sessions} now={now} showAgent={showAgent} />
		</div>
	);
}

/** "2 running · 1 waiting on you", rolling as it changes; "All quiet" otherwise. */
function Summary({ running, waiting }: { running: number; waiting: number }) {
	const t = useT();
	if (!running && !waiting) {
		return (
			<span className="ms-auto flex items-center gap-1.5 text-[12px] text-muted-foreground">
				<span aria-hidden className="size-1.5 rounded-full bg-white/25" />
				{t("agents.summary.quiet")}
			</span>
		);
	}
	return (
		<span className="ms-auto flex items-center gap-2 text-[12px] text-muted-foreground" aria-live="polite">
			{!!running && (
				<span className="flex items-center gap-1.5">
					<span aria-hidden className="size-1.5 rounded-full bg-info" />
					<Rolling value={running} /> {t("agents.summary.running")}
				</span>
			)}
			{!!waiting && (
				<Badge size="sm" variant="warning" className="gap-1 rounded-full px-1.5">
					<Rolling value={waiting} /> {t("agents.summary.waiting")}
				</Badge>
			)}
		</span>
	);
}
