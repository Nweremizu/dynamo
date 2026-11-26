import type { ReactNode } from "react";
import { Status, Statuses } from "../../../../components/ui/status";

/** Whether one part of an integration works: green with a check, or plain with a dash. */
export function CheckBadge({ ok, children }: { ok: boolean; children: ReactNode }) {
	return <Status tone={ok ? "ok" : "off"}>{children}</Status>;
}

/** A row of them. */
export const CheckBadges = Statuses;
