import { BellIcon, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Block, Desc, Row, Section } from "../../../components/ui/card";
import { Status } from "../../../components/ui/status";
import { Tile } from "../../../components/ui/tile";
import { providerAction, useProvider } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { NOTIFICATIONS_PROVIDER, type NotificationsState } from "../types";

/** Access status, and the one-time setup that lets the island read notifications. */
export function NotificationsSettings() {
	const t = useT();
	const state = useProvider<NotificationsState>(NOTIFICATIONS_PROVIDER);
	const [busy, setBusy] = useState(false);
	const access = state?.access ?? "noIdentity";

	return (
		<Section>
			<Block>
				<Row
					icon={
						<Tile tone="linear-gradient(180deg, #ff7a6e, #e5483b)">
							<BellIcon />
						</Tile>
					}
					label={t("notifications.access.title")}
					desc={t(`notifications.access.${access}`)}
				>
					{access === "noIdentity" && (
						<Button
							variant="primary"
							loading={busy}
							onClick={async () => {
								setBusy(true);
								try {
									// Restarts the app on success.
									await providerAction(NOTIFICATIONS_PROVIDER, "enable");
								} catch {
									setBusy(false);
								}
							}}
						>
							{busy ? t("notifications.access.enabling") : t("notifications.access.enable")}
						</Button>
					)}
					{access === "denied" && (
						<Button onClick={() => providerAction(NOTIFICATIONS_PROVIDER, "openPrivacy")}>
							{t("notifications.access.openPrivacy")}
							<ExternalLinkIcon aria-hidden className="text-text-dim" />
						</Button>
					)}
					{access === "allowed" && <Status tone="ok">{t("notifications.access.on")}</Status>}
				</Row>
				{access === "noIdentity" && <Desc>{t("notifications.access.how")}</Desc>}
				{state?.error && (
					<div className="flex flex-col items-start gap-2 rounded-lg bg-destructive/8 p-3 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-destructive)_20%,transparent)]">
						<Desc tone="error">{state.error}</Desc>
						<Button size="sm" onClick={() => providerAction(NOTIFICATIONS_PROVIDER, "openDeveloper")}>
							{t("notifications.access.openDeveloper")}
							<ExternalLinkIcon aria-hidden className="text-text-dim" />
						</Button>
					</div>
				)}
			</Block>
		</Section>
	);
}
