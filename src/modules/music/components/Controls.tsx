import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../../../core/cn";
import { SNAPPY } from "../../../core/motion";
import { type MusicState, musicAction } from "../hooks/useMusic";

export function Controls({ music }: { music: MusicState }) {
	return (
		<div className="flex items-center gap-3.5">
			<CtrlButton disabled={!music.canPrevious} onClick={() => musicAction("previous")}>
				<SkipBackIcon size={20} fill="currentColor" />
			</CtrlButton>
			<CtrlButton big onClick={() => musicAction("toggle")}>
				<AnimatePresence mode="popLayout" initial={false}>
					<motion.span
						key={music.playing ? "pause" : "play"}
						initial={{ scale: 0.6, opacity: 0, filter: "blur(4px)" }}
						animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
						exit={{ scale: 0.6, opacity: 0, filter: "blur(4px)" }}
						transition={SNAPPY}
						style={{ display: "grid" }}
					>
						{music.playing ? <PauseIcon size={26} fill="currentColor" /> : <PlayIcon size={26} fill="currentColor" />}
					</motion.span>
				</AnimatePresence>
			</CtrlButton>
			<CtrlButton disabled={!music.canNext} onClick={() => musicAction("next")}>
				<SkipForwardIcon size={20} fill="currentColor" />
			</CtrlButton>
		</div>
	);
}

function CtrlButton({
	children,
	onClick,
	disabled,
	big,
}: {
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
	big?: boolean;
}) {
	return (
		<motion.button
			className={cn(
				"grid size-9 place-items-center rounded-full text-text transition-[background,opacity] duration-200 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30",
				big && "size-10.5",
			)}
			disabled={disabled}
			whileTap={{ scale: 0.88 }}
			transition={SNAPPY}
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
		>
			{children}
		</motion.button>
	);
}
