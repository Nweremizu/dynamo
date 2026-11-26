import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { SNAPPY } from "../../../../core/motion";

const roll = {
	enter: (dir: number) => ({ y: `${dir * 100}%`, opacity: 0 }),
	center: { y: "0%", opacity: 1 },
	exit: (dir: number) => ({ y: `${dir * -100}%`, opacity: 0 }),
};

/** A number that rolls up when it grows and down when it shrinks (after devl's Run List). */
export function Rolling({ value }: { value: number }) {
	const prev = useRef(value);
	const dir = value >= prev.current ? 1 : -1;
	useEffect(() => {
		prev.current = value;
	}, [value]);
	return (
		<span className="relative inline-flex overflow-hidden tabular-nums">
			<AnimatePresence custom={dir} initial={false} mode="popLayout">
				<motion.span
					key={value}
					custom={dir}
					variants={roll}
					initial="enter"
					animate="center"
					exit="exit"
					transition={SNAPPY}
				>
					{value}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Text whose digits turn like an odometer ("4.8M" → "39M"), each wheel
 * keeping its place counted from the end (after devl's Uptime Bars).
 */
export function RollingText({ text, className }: { text: string; className?: string }) {
	let digit = 0;
	let other = 0;
	const glyphs = [...text]
		.reverse()
		.map((ch) => {
			const isDigit = ch >= "0" && ch <= "9";
			return { ch, key: isDigit ? `d${digit++}` : `s${other++}${ch}`, n: isDigit ? Number(ch) : null };
		})
		.reverse();
	return (
		<span className={`relative inline-flex leading-none whitespace-nowrap tabular-nums ${className ?? ""}`}>
			<span className="sr-only">{text}</span>
			<span aria-hidden className="inline-flex [--row:1.15em]">
				{glyphs.map((g) =>
					g.n === null ? (
						<span key={g.key} className="inline-block h-(--row) leading-(--row)">
							{g.ch}
						</span>
					) : (
						<span
							key={g.key}
							className="relative inline-block h-(--row) overflow-hidden [mask-image:linear-gradient(transparent,#000_18%,#000_82%,transparent)]"
						>
							<span className="invisible block leading-(--row)">0</span>
							<motion.span
								className="absolute inset-x-0 top-0 flex flex-col items-center"
								initial={false}
								animate={{ y: `${-g.n * 10}%` }}
								transition={SNAPPY}
							>
								{DIGITS.map((n) => (
									<span key={n} className="block h-(--row) leading-(--row)">
										{n}
									</span>
								))}
							</motion.span>
						</span>
					),
				)}
			</span>
		</span>
	);
}
