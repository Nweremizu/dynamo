import { ExternalLinkIcon } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { Badge } from "../../../../components/coss/badge";
import { Button } from "../../../../components/coss/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../../../components/coss/tooltip";
import { command } from "../../../../core/bridge";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import { SETTLE } from "../../../../core/motion";
import { formatTokens } from "../format";
import { PANEL } from "../layout";
import { agentPaint, shades } from "../paint";
import type { AgentDefinition, AgentSnapshot, TokenUsage } from "../types";
import { QuotaRing } from "./QuotaRing";

const LIMITS_REFRESH_MS = 2 * 60_000;

/** The two cards under the header: plan limits, and today's tokens. */
export function AgentCard({ agent, snapshot, now }: { agent: AgentDefinition; snapshot: AgentSnapshot; now: number }) {
	// The card is only mounted while the panel is visible.
	const { refreshLimits } = snapshot;
	useEffect(() => {
		if (!refreshLimits) return;
		refreshLimits();
		const id = setInterval(refreshLimits, LIMITS_REFRESH_MS);
		return () => clearInterval(id);
	}, [refreshLimits]);

	return (
		<div className="grid grid-cols-2 gap-3" style={{ height: PANEL.overview, ...agentPaint(agent) }}>
			<LimitsCard agent={agent} snapshot={snapshot} now={now} />
			<TokensCard agent={agent} snapshot={snapshot} />
		</div>
	);
}

/** A rounded surface in the panel; 16px sits concentric inside the open island. */
function Surface({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
	return (
		<section className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl bg-card px-3.5 py-2.5 shadow-[inset_0_0_0_1px_var(--hairline)]">
			<header className="flex h-5 items-center gap-2">
				<h3 className="flex-1 truncate text-[12px] font-medium text-muted-foreground">{title}</h3>
				{aside}
			</header>
			{children}
		</section>
	);
}

function LimitsCard({ agent, snapshot, now }: { agent: AgentDefinition; snapshot: AgentSnapshot; now: number }) {
	const t = useT();
	const { limits } = snapshot;
	const many = limits.length > 2;
	return (
		<Surface
			title={t("agents.limits")}
			aside={
				<>
					{snapshot.model && (
						<Badge size="sm" variant="outline" className="max-w-24 truncate rounded-full px-1.5 text-(--agent-light)">
							{snapshot.model}
						</Badge>
					)}
					{agent.usageUrl && (
						<Tooltip>
							<TooltipTrigger
								delay={300}
								render={
									<Button
										size="icon-xs"
										variant="ghost"
										aria-label={t("agents.viewUsage")}
										className="-me-1.5 text-muted-foreground"
										onClick={(e) => {
											e.stopPropagation();
											command("open_external", { url: agent.usageUrl });
										}}
									/>
								}
							>
								<ExternalLinkIcon aria-hidden />
							</TooltipTrigger>
							<TooltipPopup side="bottom">{t("agents.viewUsage")}</TooltipPopup>
						</Tooltip>
					)}
				</>
			}
		>
			{limits.length ? (
				<div
					className={cn("flex min-h-0 flex-col gap-2", many && "grid grid-cols-2 gap-x-3 overflow-y-auto")}
					data-scroll={many || undefined}
				>
					{limits.map((l) => (
						<QuotaRing key={l.id} limit={l} now={now} size={many ? 30 : 36} />
					))}
				</div>
			) : (
				<p className="text-[12px]/[1.4] text-muted-foreground">{snapshot.limitsHint ?? t("agents.noLimits")}</p>
			)}
			{snapshot.setup && <SetupAction setup={snapshot.setup} />}
		</Surface>
	);
}

/** Output, input and the two caches, strongest shade first (see `shades`). */
const PARTS: {
	key: keyof Omit<TokenUsage, "messages">;
	label: "input" | "output" | "cacheRead" | "cacheWrite";
}[] = [
	{ key: "output", label: "output" },
	{ key: "input", label: "input" },
	{ key: "cacheWrite", label: "cacheWrite" },
	{ key: "cacheRead", label: "cacheRead" },
];

function TokensCard({ agent, snapshot }: { agent: AgentDefinition; snapshot: AgentSnapshot }) {
	const t = useT();
	const shade = shades(agent);
	const tokens = snapshot.tokensToday;
	const total = tokens ? tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite : 0;
	const responses = snapshot.usage?.daily.at(-1)?.responses ?? tokens?.messages;

	return (
		<Surface
			title={t("agents.tokensToday")}
			aside={
				tokens &&
				responses != null && (
					<span className="text-[11.5px] text-muted-foreground tabular-nums">
						{t(responses === 1 ? "agents.usage.response" : "agents.usage.responses", { n: responses })}
					</span>
				)
			}
		>
			{tokens ? (
				<>
					<motion.span
						key={total}
						className="-mt-1 text-[26px]/[30px] font-semibold tracking-[-0.02em] tabular-nums"
						initial={{ opacity: 0.4 }}
						animate={{ opacity: 1 }}
					>
						{formatTokens(total)}
					</motion.span>
					{/* Where today's tokens went: one bar split by kind. */}
					<div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/8">
						{PARTS.map((p, i) => (
							<motion.span
								key={p.key}
								className="h-full rounded-full"
								style={{ background: shade[i] }}
								initial={false}
								animate={{ flexGrow: total ? tokens[p.key] / total : 0 }}
								transition={SETTLE}
							/>
						))}
					</div>
					<dl className="grid grid-cols-2 gap-x-3 gap-y-px text-[11px]">
						{PARTS.map((p, i) => (
							<div key={p.key} className="flex min-w-0 items-center gap-1.5">
								<span aria-hidden className="size-1.5 flex-none rounded-full" style={{ background: shade[i] }} />
								<dt className="truncate text-muted-foreground">{t(`agents.tokens.${p.label}`)}</dt>
								<dd className="ms-auto text-foreground/80 tabular-nums">{formatTokens(tokens[p.key])}</dd>
							</div>
						))}
					</dl>
				</>
			) : (
				<p className="text-[12px]/[1.4] text-muted-foreground">{snapshot.metricsHint ?? t("agents.noSessions")}</p>
			)}
		</Surface>
	);
}

function SetupAction({ setup }: { setup: NonNullable<AgentSnapshot["setup"]> }) {
	const t = useT();
	const [state, setState] = useState<"idle" | "busy" | "error">("idle");
	return (
		<div className="mt-auto flex flex-col items-start gap-2">
			<p className="text-[11.5px]/[1.4] text-muted-foreground">{setup.message}</p>
			<Button
				size="xs"
				loading={state === "busy"}
				onClick={async (e) => {
					e.stopPropagation();
					setState("busy");
					try {
						await setup.action();
						setState("idle");
					} catch {
						setState("error");
					}
				}}
			>
				{state === "error" ? t("agents.setup.failed") : setup.actionLabel}
			</Button>
		</div>
	);
}
