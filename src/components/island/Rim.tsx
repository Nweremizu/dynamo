import type { CSSProperties } from "react";
import { tv } from "tailwind-variants";
import { type Appearance, rimBackground } from "../../core/appearance";

/**
 * A gradient ring masked to the border, inside the parent's rounded shape.
 * `corner-shape` too, not only the radius: the island's squircle corners are
 * squarer than circular ones, and its black would show outside the ring.
 */
const rim = tv({
	base: "pointer-events-none absolute inset-0 z-2 rounded-[inherit] [corner-shape:inherit] p-(--rim-w) [mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)] [mask-clip:content-box,border-box] [mask-composite:exclude]",
	variants: {
		classic: { true: "bg-white/9" },
		animated: { true: "[container-type:size]", false: "bg-(image:--rim-bg)" },
	},
});

/** The ring itself: a gradient `background`, or a faint hairline without one. */
export function RimRing({
	background,
	width,
	animate,
}: {
	background: string | undefined;
	width: number;
	animate?: boolean;
}) {
	const animated = !!background && !!animate;
	return (
		<span
			className={rim({ classic: !background, animated })}
			style={{ "--rim-bg": background, "--rim-w": `${width}px` } as CSSProperties}
		>
			{animated && <span className="island-rim-gradient animate-rim-spin motion-reduce:animate-none" />}
		</span>
	);
}

/** The colored rim of the Windows Island style (a hairline when "classic"). */
export function Rim({ look }: { look: Appearance }) {
	const background = rimBackground(look.rim);
	return <RimRing background={background} width={background ? look.thickness : 1} animate={look.animate} />;
}

/** A glow in the rim's middle color, when turned on. */
export function glowStyle(look: Appearance): CSSProperties | undefined {
	if (!look.glow || !look.rim.length) return undefined;
	const color = look.rim[Math.floor(look.rim.length / 2)];
	return { boxShadow: `0 0 20px -2px ${color}bb, 0 14px 34px -14px rgba(0, 0, 0, 0.7)` };
}
