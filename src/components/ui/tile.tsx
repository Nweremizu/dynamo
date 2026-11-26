import type { ReactNode } from "react";
import { tv } from "tailwind-variants";

/**
 * An icon on a rounded tile, as in macOS System Settings: a color (or the
 * neutral gray) under a soft top light, the glyph in white. `tone` is any CSS
 * background, so a gradient works too.
 */
const tile = tv({
	base: "relative grid flex-none place-items-center text-white shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.3)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-linear-to-b before:from-white/22 before:to-transparent before:to-60%",
	variants: {
		size: {
			sm: "size-5.5 rounded-[6px] [&_img]:size-3.5 [&_svg]:size-3.5",
			md: "size-6.5 rounded-[7px] [&_img]:size-4 [&_svg]:size-4",
			lg: "size-11 rounded-[11px] [&_img]:size-6 [&_svg]:size-6",
		},
	},
	defaultVariants: { size: "md" },
});

export const NEUTRAL_TILE = "linear-gradient(180deg, #5b5b60, #3c3c40)";

export function Tile({
	tone = NEUTRAL_TILE,
	size,
	children,
}: {
	tone?: string;
	size?: "sm" | "md" | "lg";
	children: ReactNode;
}) {
	return (
		<span aria-hidden className={tile({ size })} style={{ background: tone }}>
			<span className="relative grid place-items-center [&_svg]:drop-shadow-[0_1px_1px_rgb(0_0_0/0.2)]">
				{children}
			</span>
		</span>
	);
}
