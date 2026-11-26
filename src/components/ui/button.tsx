import { Loader2Icon } from "lucide-react";
import type { ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";

/**
 * Button of the settings window. `primary` is the one filled action of a view
 * (the brand's deep end, so white text holds 4.5:1); `danger` removes
 * something; `soft` is everything else. A 0.96 press scale for touch feedback.
 */
export const button = tv({
	base: "inline-flex h-7.5 flex-none items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-[filter,opacity,scale,background-color] duration-150 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:flex-none",
	variants: {
		variant: {
			primary:
				"bg-(image:--settings-selected) text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_rgb(0_0_0/0.3)] hover:brightness-110",
			danger:
				"bg-destructive/14 text-destructive-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-destructive)_24%,transparent)] hover:bg-destructive/20",
			soft: "bg-(--settings-field) text-text shadow-[inset_0_0_0_1px_var(--hairline)] hover:bg-(--settings-field-hover)",
		},
	},
	defaultVariants: { variant: "soft" },
});

/** The small size, for a row of actions under a setting. */
const small = "h-6.5 gap-1 rounded-md px-2.5 text-[12px] [&_svg]:size-3";

/**
 * `type="button"` unless given: inside a form, the one that sends it needs
 * `type="submit"`. `loading` disables it and adds a spinner, keeping the label.
 */
export function Button({
	variant,
	size,
	loading,
	disabled,
	className,
	children,
	...rest
}: ComponentProps<"button"> & VariantProps<typeof button> & { size?: "sm" | "md"; loading?: boolean }) {
	return (
		<button
			type="button"
			className={button({ variant, class: [size === "sm" && small, className] })}
			disabled={disabled || loading}
			aria-busy={loading || undefined}
			{...rest}
		>
			{loading && <Loader2Icon aria-hidden className="animate-spin" />}
			{children}
		</button>
	);
}

/** Small text action in a panel header ("Clear", "New"). */
export const textButton = tv({
	base: "flex-none rounded-[10px] px-2.5 py-0.5 text-[12px] text-text-dim hover:bg-white/10 hover:text-text",
});

export function TextButton({ className, ...rest }: ComponentProps<"button">) {
	return <button type="button" className={textButton({ class: className })} {...rest} />;
}

/** Round icon-only button. */
export const iconButton = tv({
	base: "grid flex-none place-items-center rounded-full transition-colors duration-200 disabled:cursor-default disabled:opacity-35",
	variants: {
		size: {
			sm: "size-6",
			md: "size-7",
		},
		tone: {
			dim: "text-text-dim enabled:hover:bg-white/10 enabled:hover:text-text",
			faint: "text-text-faint enabled:hover:bg-white/8 enabled:hover:text-text",
			/** Removes something: turns red on hover. */
			danger: "text-text-faint enabled:hover:bg-[rgba(255,95,87,0.12)] enabled:hover:text-danger",
		},
	},
	defaultVariants: { size: "md", tone: "dim" },
});

export function IconButton({
	size,
	tone,
	className,
	...rest
}: ComponentProps<"button"> & VariantProps<typeof iconButton>) {
	return <button type="button" className={iconButton({ size, tone, class: className })} {...rest} />;
}

/** A button that reads as a link, inline in a sentence. */
export const linkButton = tv({
	base: "font-semibold hover:underline",
	variants: {
		tone: {
			accent: "text-accent",
			text: "text-text",
		},
	},
	defaultVariants: { tone: "accent" },
});

export function LinkButton({ tone, className, ...rest }: ComponentProps<"button"> & VariantProps<typeof linkButton>) {
	return <button type="button" className={linkButton({ tone, class: className })} {...rest} />;
}
