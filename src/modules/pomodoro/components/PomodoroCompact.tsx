import { BellRingIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useT } from "../../../core/i18n";
import { formatElapsed, useNow } from "../../ai-agents/common/format";
import { PHASE_COLOR } from "../format";
import { remaining, type Timer } from "../timer";
import { Dial } from "./Dial";

/** Left of the closed island: a small dial and the phase; a bell once it rang. */
export function PomodoroCompactLeft({ timer }: { timer: Timer }) {
	const t = useT();
	const ringing = timer.status === "ringing";
	return (
		<span className="flex min-w-0 items-center gap-2" style={{ "--phase": PHASE_COLOR[timer.phase] } as CSSProperties}>
			{ringing ? (
				<BellRingIcon aria-hidden size={15} className="flex-none text-(--phase)" />
			) : (
				<Dial timer={timer} size={16} />
			)}
			<span className="truncate text-[13px] font-semibold">
				{ringing ? t(`pomodoro.done.${timer.phase}`) : t(`pomodoro.phase.${timer.phase}`)}
			</span>
		</span>
	);
}

/** Right of the closed island: the time left, ticking on its own. */
export function PomodoroCompactRight({ timer }: { timer: Timer }) {
	const t = useT();
	const now = useNow(1000, timer.status === "running");
	return (
		<span
			className="text-[13px] font-semibold whitespace-nowrap tabular-nums"
			style={{ color: PHASE_COLOR[timer.phase] }}
		>
			{timer.status === "ringing" ? t("pomodoro.timesUp") : formatElapsed(remaining(timer, now) + 999)}
		</span>
	);
}
