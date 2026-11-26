import { CheckIcon, XIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

/** Small uppercase heading over a section of a panel. */
export const sectionLabel = tv({
	base: "font-bold tracking-[0.06em] text-text-faint uppercase",
	variants: {
		size: {
			sm: "text-[10.5px]",
			md: "text-[11px]",
		},
	},
	defaultVariants: { size: "md" },
});

export function SectionLabel({ size, className, ...rest }: ComponentProps<"span"> & VariantProps<typeof sectionLabel>) {
	return <span className={sectionLabel({ size, class: className })} {...rest} />;
}

const empty = tv({ base: "m-auto text-[13px] text-text-faint" });

/** "Nothing here" message, centered in a panel. */
export function Empty({ className, ...rest }: ComponentProps<"div">) {
	return <div className={empty({ class: className })} {...rest} />;
}

const chip = tv({
	base: "inline-flex items-center gap-1 rounded-full bg-white/7 px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap text-text-dim [&_svg]:size-3 [&_svg]:flex-none",
	variants: {
		ok: {
			true: "bg-success/12 text-success-foreground",
		},
	},
});

/**
 * A tag. As a status it shows a check (green) when `ok` and a cross when
 * not; a label passes its own `icon` (developer mode, runs in the background…).
 */
export function Chip({
	ok,
	icon,
	className,
	children,
	...rest
}: ComponentProps<"span"> & { ok?: boolean; icon?: ReactNode }) {
	return (
		<span className={chip({ ok, class: className })} {...rest}>
			{icon ?? (ok ? <CheckIcon size={12} strokeWidth={2.5} /> : <XIcon size={12} strokeWidth={2.5} />)}
			{children}
		</span>
	);
}

const chips = tv({ base: "flex flex-wrap gap-1.5" });

export function Chips({ className, ...rest }: ComponentProps<"div">) {
	return <div className={chips({ class: className })} {...rest} />;
}

const code = tv({
	base: "block rounded-lg bg-black/30 px-3 py-2.5 font-mono text-[11.5px]/[1.5] break-all whitespace-pre-wrap text-text-dim shadow-[inset_0_0_0_1px_var(--hairline)] select-text",
});

/** A ready-to-copy snippet. */
export function Code({ className, ...rest }: ComponentProps<"code">) {
	return <code className={code({ class: className })} {...rest} />;
}
