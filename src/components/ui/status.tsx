import { CheckIcon, CircleAlertIcon, MinusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { tv } from "tailwind-variants";

const status = tv({
	base: "inline-flex h-6 flex-none items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap shadow-[inset_0_0_0_1px_var(--ring-color)] [&_svg]:size-3 [&_svg]:flex-none",
	variants: {
		tone: {
			ok: "bg-success/12 text-success-foreground [--ring-color:color-mix(in_srgb,var(--color-success)_22%,transparent)]",
			off: "bg-white/6 text-text-dim [--ring-color:var(--hairline)]",
			warn: "bg-warning/12 text-warning-foreground [--ring-color:color-mix(in_srgb,var(--color-warning)_24%,transparent)]",
		},
	},
	defaultVariants: { tone: "off" },
});

const ICONS = { ok: CheckIcon, off: MinusIcon, warn: CircleAlertIcon };

/**
 * Whether something works: "Connected", "Not found", "Hooks"… Always words
 * and an icon beside the color, so the state never rests on the hue alone.
 */
export function Status({ tone = "off", children }: { tone?: "ok" | "off" | "warn"; children: ReactNode }) {
	const Icon = ICONS[tone];
	return (
		<span className={status({ tone })}>
			<Icon aria-hidden strokeWidth={2.6} />
			{children}
		</span>
	);
}

/** A row of them. */
export function Statuses({ children }: { children: ReactNode }) {
	return <div className="flex flex-wrap gap-1.5">{children}</div>;
}
