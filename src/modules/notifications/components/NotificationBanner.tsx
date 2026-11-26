import { ArrowUpRightIcon } from "lucide-react";
import { useT } from "../../../core/i18n";
import { useOpenActivity } from "../../activities/components/ActivityCard";
import type { Activity } from "../../activities/types";
import { AppIcon } from "./AppIcon";

/**
 * A notification as it arrives: the app's icon, who and what, and a hairline
 * running down until the island lets it go. Click to open the app.
 */
export function NotificationBanner({ activity: a }: { activity: Activity }) {
	const t = useT();
	const open = useOpenActivity();
	const app = a.caption ?? "";
	const left = Math.max(0, (a.expiresAt ?? 0) - Date.now());

	return (
		<button
			type="button"
			className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-[18px] bg-[#1d1d1f] p-3.5 pr-4 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-colors hover:bg-[#242427]"
			onClick={(e) => {
				e.stopPropagation();
				open(a);
			}}
		>
			<AppIcon app={app} logo={a.image} size={46} />
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="flex items-center gap-1.5 text-[11.5px] leading-4">
					{app && <span className="truncate font-semibold text-text-dim">{app}</span>}
					<span className="flex-none text-text-faint">{t("time.now")}</span>
				</span>
				<span className="mt-0.5 truncate text-[15px] font-semibold leading-5">{a.title}</span>
				{a.subtitle && <span className="line-clamp-2 text-[13px]/[1.4] text-text-dim">{a.subtitle}</span>}
			</span>
			{a.action && (
				<span className="flex flex-none items-center gap-0.5 self-center rounded-full bg-white/8 py-1 pr-2 pl-2.5 text-[12px] font-semibold text-text-dim transition-colors group-hover:bg-white/14 group-hover:text-text">
					{t("notifications.openShort")}
					<ArrowUpRightIcon size={13} strokeWidth={2.5} />
				</span>
			)}
			{left > 0 && (
				<span
					aria-hidden
					className="absolute inset-x-5 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-white/8 motion-reduce:hidden"
				>
					<span
						key={a.updatedAt}
						className="block h-full origin-left rounded-full bg-white/35"
						style={{ animation: `banner-countdown ${left}ms linear forwards` }}
					/>
				</span>
			)}
		</button>
	);
}
