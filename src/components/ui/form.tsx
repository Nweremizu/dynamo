import { ChevronsUpDownIcon } from "lucide-react";
import { motion } from "motion/react";
import { type ComponentProps, useId } from "react";
import { tv } from "tailwind-variants";
import { SNAPPY } from "../../core/motion";

/** A field's resting surface: a filled well with a hairline, lighter on hover. */
const field =
	"h-7.5 rounded-lg bg-(--settings-field) text-[13px] text-text shadow-[inset_0_0_0_1px_var(--hairline)] transition-[background-color] duration-150 ease-out enabled:hover:bg-(--settings-field-hover)";

const input = tv({ base: [field, "min-w-0 px-2.5 select-text placeholder:text-text-faint"] });

export function Input({ className, ...rest }: ComponentProps<"input">) {
	return <input className={input({ class: className })} {...rest} />;
}

const select = tv({
	slots: {
		base: "relative inline-flex max-w-70 flex-none has-disabled:opacity-60",
		field: [
			field,
			"min-w-0 cursor-pointer appearance-none ps-2.5 pe-7.5 text-ellipsis [&_option]:bg-[#2a2a2d] [&_option]:text-text",
		],
		// The up-and-down chevrons of a macOS pop-up button.
		icon: "pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-text-dim",
	},
	variants: {
		/** Inline in a list row: shorter, tighter. */
		size: {
			sm: { base: "has-disabled:opacity-40", field: "h-6.5 ps-2 pe-6.5 text-[12px]", icon: "end-1.5" },
			md: {},
		},
	},
	defaultVariants: { size: "md" },
});

export function Select({ size, className, ...rest }: Omit<ComponentProps<"select">, "size"> & { size?: "sm" | "md" }) {
	const s = select({ size });
	return (
		<span className={s.base()}>
			<select className={s.field({ class: className })} {...rest} />
			<ChevronsUpDownIcon aria-hidden size={size === "sm" ? 12 : 13} strokeWidth={2} className={s.icon()} />
		</span>
	);
}

const numberField = tv({
	slots: {
		base: `${field} flex flex-none items-center gap-1.5 pe-2.5 ps-1 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-(--settings-focus) has-disabled:opacity-60`,
		input:
			"h-full w-13 px-0.5 py-px text-end tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
		unit: "text-[12.5px] text-text-dim",
	},
})();

/** A whole number with its unit ("5 s", "30 min"). */
export function NumberField({ unit, ...rest }: ComponentProps<"input"> & { unit: string }) {
	return (
		<span className={numberField.base()}>
			{/* The well draws the focus ring, around the number and its unit together. */}
			<input type="number" className={numberField.input()} style={{ outline: "none" }} {...rest} />
			{unit && <span className={numberField.unit()}>{unit}</span>}
		</span>
	);
}

const segmented = tv({
	slots: {
		base: "relative m-0 flex w-fit min-w-0 flex-none rounded-lg border-0 bg-(--settings-field) p-0.5 shadow-[inset_0_0_0_1px_var(--hairline)] has-disabled:opacity-45",
		option:
			"relative h-6.5 rounded-md px-3 text-[12.5px] font-medium whitespace-nowrap text-text-dim transition-colors duration-150 ease-out enabled:hover:text-text disabled:cursor-default",
		thumb:
			"absolute inset-0 rounded-[inherit] bg-white/16 shadow-[0_1px_2px_rgb(0_0_0/0.35),inset_0_0_0_1px_rgb(255_255_255/0.06)]",
	},
	variants: {
		active: {
			true: { option: "text-text" },
		},
	},
});

/**
 * A few mutually exclusive options side by side; the raised thumb slides to
 * the chosen one. Each option says whether it's chosen (`aria-pressed`), so
 * the state isn't carried by the thumb alone.
 */
export function Segmented<T extends string | number>({
	options,
	value,
	onChange,
	disabled,
	label,
}: {
	options: { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
	disabled?: boolean;
	/** Names the group for screen readers when no visible label sits next to it. */
	label?: string;
}) {
	const thumb = useId();
	return (
		<fieldset aria-label={label} className={segmented().base()}>
			{options.map((o) => {
				const active = o.value === value;
				const s = segmented({ active });
				return (
					<button
						type="button"
						key={o.value}
						aria-pressed={active}
						className={s.option()}
						disabled={disabled}
						onClick={() => onChange(o.value)}
					>
						{active && <motion.span layoutId={thumb} className={s.thumb()} transition={SNAPPY} />}
						<span className="relative">{o.label}</span>
					</button>
				);
			})}
		</fieldset>
	);
}
