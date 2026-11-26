import { useState } from "react";
import { Badge } from "../../../../components/coss/badge";
import { Button } from "../../../../components/coss/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../../../components/coss/tooltip";
import { useT } from "../../../../core/i18n";
import { formatAgo } from "../format";
import { PANEL } from "../layout";
import type { AgentSessionRef, PermissionDecision } from "../types";
import { StatusGlyph } from "./StatusGlyph";

/**
 * A permission request answered from the island (after devl's Go / No-go):
 * who asks for what, the exact command or file, and Deny / Always / Allow
 * with the main action trailing. Answering in the terminal or the editor
 * still works; the request then just goes away.
 */
export function PermissionPrompt({ item, now, more }: { item: AgentSessionRef; now: number; more: number }) {
	const t = useT();
	const { agent, session } = item;
	// biome-ignore lint/style/noNonNullAssertion: only rendered for sessions with a pending permission
	const request = session.permission!;
	const [busy, setBusy] = useState<PermissionDecision | null>(null);
	const [error, setError] = useState<string | null>(null);

	const decide = async (decision: PermissionDecision) => {
		if (!agent.decide) return;
		setBusy(decision);
		setError(null);
		try {
			await agent.decide(session, decision);
		} catch (e) {
			setError(String(e));
			setBusy(null);
		}
	};
	const answer = (decision: PermissionDecision) => (e: React.MouseEvent) => {
		e.stopPropagation();
		decide(decision);
	};

	return (
		<section
			aria-label={t("agents.permission.title", { project: session.title || agent.name, tool: request.tool })}
			className="flex flex-col gap-2.5 rounded-2xl bg-card p-3.5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-warning)_35%,transparent)]"
			style={{ height: request.detail ? PANEL.permission : PANEL.permissionBare }}
		>
			<header className="flex h-8 items-center gap-3">
				<span className="grid size-8 flex-none place-items-center rounded-full bg-white/6">
					<StatusGlyph agent={agent} status="waiting" size={16} />
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-[13.5px]">
						<span className="font-semibold">{session.title || agent.name}</span>{" "}
						<span className="text-muted-foreground">{t("agents.permission.wants")}</span>{" "}
						<span className="font-semibold">{request.tool}</span>
					</span>
					<span className="truncate text-[11.5px] text-muted-foreground">
						{agent.name} · {formatAgo(t, request.since, now)}
					</span>
				</span>
				{more > 0 && (
					<Badge size="sm" variant="warning" className="rounded-full px-1.5">
						{t("agents.permission.more", { n: more })}
					</Badge>
				)}
			</header>
			{request.detail && (
				<pre
					className="h-13 overflow-y-auto rounded-lg bg-black/45 px-3 py-2 font-mono text-[11.5px]/[1.45] break-all whitespace-pre-wrap text-foreground [scrollbar-width:none]"
					data-scroll
				>
					{request.detail}
				</pre>
			)}
			<footer className="mt-auto flex items-center gap-2">
				<span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
					{error ? <span className="text-destructive-foreground">{error}</span> : t("agents.permission.hint")}
				</span>
				<Button
					size="sm"
					variant="destructive-outline"
					loading={busy === "deny"}
					disabled={!!busy}
					onClick={answer("deny")}
				>
					{t("agents.permission.deny")}
				</Button>
				{request.always && (
					<Tooltip>
						<TooltipTrigger
							delay={300}
							render={
								<Button
									size="sm"
									variant="outline"
									loading={busy === "always"}
									disabled={!!busy}
									onClick={answer("always")}
								/>
							}
						>
							{t("agents.permission.always")}
						</TooltipTrigger>
						<TooltipPopup side="bottom" className="max-w-72">
							{t("agents.permission.alwaysTitle", { rule: request.always })}
						</TooltipPopup>
					</Tooltip>
				)}
				<Button size="sm" loading={busy === "allow"} disabled={!!busy} onClick={answer("allow")}>
					{t("agents.permission.allow")}
				</Button>
			</footer>
		</section>
	);
}
