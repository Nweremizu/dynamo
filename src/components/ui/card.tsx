import { ChevronRightIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "../../core/cn";

/**
 * A settings card: rows and blocks stacked, a hairline above a row that
 * follows another row or a block. `data-row` / `data-block` mark them for that.
 */
const stack =
	"[&>[data-block]:first-child]:pt-3.5 [&>[data-block]+[data-row]]:border-t [&>[data-block]+[data-row]]:border-hairline [&>[data-row]+[data-row]]:border-t [&>[data-row]+[data-row]]:border-hairline [&>[data-row]+[data-block]]:border-t [&>[data-row]+[data-block]]:border-hairline [&>[data-row]+[data-block]]:pt-3.5 [&>[data-block]+[data-block]]:border-t [&>[data-block]+[data-block]]:border-hairline [&>[data-block]+[data-block]]:pt-3.5";

/** A grouped surface, one step lighter than the window, with a hairline edge and a faint top light. */
export const card = tv({
	base: `rounded-xl bg-(--settings-group) px-4 shadow-[inset_0_0_0_1px_var(--hairline),inset_0_1px_0_rgb(255_255_255/0.03)] ${stack}`,
});

export function Card({ className, ...rest }: ComponentProps<"section">) {
	return <section className={card({ class: className })} {...rest} />;
}

/**
 * A titled group of settings: a heading over its card, an optional note under
 * it. `inert` turns the whole group off (dimmed, out of the tab order) while
 * another setting makes it not apply.
 */
export function Section({
	title,
	note,
	inert,
	className,
	children,
}: {
	title?: ReactNode;
	note?: ReactNode;
	inert?: boolean;
	className?: string;
	children: ReactNode;
}) {
	const id = useId();
	return (
		<section
			aria-labelledby={title ? id : undefined}
			inert={inert}
			className={cn("flex flex-col gap-2 transition-opacity duration-200 ease-out", inert && "opacity-45")}
		>
			{title && (
				<h2 id={id} className="px-1 text-[13px] font-semibold text-text text-balance">
					{title}
				</h2>
			)}
			<div className={card({ class: className })}>{children}</div>
			{note && <p className="px-1 text-[12px]/[1.45] text-text-dim text-pretty">{note}</p>}
		</section>
	);
}

/** A card that folds its rows and blocks under a clickable title. */
export function Collapsible({
	title,
	icon,
	defaultOpen = false,
	children,
}: {
	title: ReactNode;
	icon?: ReactNode;
	defaultOpen?: boolean;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const panel = useId();
	return (
		<section className={card()}>
			<button
				type="button"
				aria-expanded={open}
				aria-controls={panel}
				className="-mx-4 flex min-h-13 w-[calc(100%+2rem)] cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-start transition-colors duration-150 hover:bg-(--settings-hover)"
				onClick={() => setOpen(!open)}
			>
				{icon}
				<span className="flex-1 text-[13.5px] font-medium">{title}</span>
				<ChevronRightIcon
					aria-hidden
					size={15}
					className={cn("text-text-faint transition-transform duration-200 ease-out", open && "rotate-90")}
				/>
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						id={panel}
						className="overflow-hidden"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
					>
						<div className={cn("border-t border-hairline", stack)}>{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}

/**
 * A row already carries its own vertical padding: a block that starts (or
 * ends) with one drops the padding a bare line of text needs there.
 */
const block = tv({
	base: "flex flex-col gap-2.5 pb-3.5 **:data-row:cursor-default [&:has(>[data-row]:first-child)]:pt-0! [&:has(>[data-row]:last-child)]:pb-1",
});

/** Several lines that belong together (a row plus its extras), no dividers inside. */
export function Block({ className, ...rest }: ComponentProps<"div">) {
	return <div data-block className={block({ class: className })} {...rest} />;
}

const descStyles = tv({
	base: "text-[12.5px]/[1.45] text-pretty text-text-dim [&_code]:font-mono [&_code]:text-[11.5px] [&_code]:text-text",
	variants: {
		tone: {
			default: "",
			warn: "text-warn",
			error: "text-destructive-foreground",
		},
	},
	defaultVariants: { tone: "default" },
});

type DescTone = VariantProps<typeof descStyles>["tone"];

/** Secondary text: a row's description, a note under a block. */
export function Desc({ tone, className, ...rest }: ComponentProps<"span"> & { tone?: DescTone }) {
	return <span className={descStyles({ tone, class: className })} {...rest} />;
}

const rowText = tv({
	slots: {
		base: "flex min-w-0 flex-col gap-0.5",
		label: "text-[13.5px] font-medium text-pretty",
	},
})();

type RowTextProps = { label: ReactNode; desc?: ReactNode; descTone?: DescTone };

/** A setting's label over its description; heads a block that has no control of its own. */
export function RowText({ label, desc, descTone }: RowTextProps) {
	return (
		<span className={rowText.base()}>
			<span className={rowText.label()}>{label}</span>
			{desc ? <Desc tone={descTone}>{desc}</Desc> : null}
		</span>
	);
}

const row = tv({
	base: "flex min-h-13 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5",
	variants: {
		/** A `<label>` row flips its toggle when clicked anywhere. */
		clickable: {
			true: "cursor-pointer",
			false: "cursor-default",
		},
		disabled: {
			true: "cursor-default opacity-45",
		},
	},
});

/** One setting: label and description on the leading side, its controls on the trailing one. */
export function Row({
	label,
	desc,
	descTone,
	icon,
	disabled,
	as: Tag = "div",
	className,
	children,
}: RowTextProps & {
	/** A tile before the label, for a row that stands for a service or a device. */
	icon?: ReactNode;
	disabled?: boolean;
	/** `label` when the row wraps a single toggle or field. */
	as?: "div" | "label";
	className?: string;
	children?: ReactNode;
}) {
	return (
		<Tag data-row className={row({ clickable: Tag === "label", disabled, class: className })}>
			<span className="flex min-w-0 flex-[1_1_16rem] items-center gap-3">
				{icon}
				<RowText label={label} desc={desc} descTone={descTone} />
			</span>
			{children}
		</Tag>
	);
}

const divider = tv({ base: "h-px bg-hairline" });

export function Divider({ className }: { className?: string }) {
	return <div className={divider({ class: className })} />;
}

const list = tv({
	slots: {
		base: "mt-0.5 flex list-none flex-col gap-1",
		item: "flex min-h-9 items-center gap-2.5 rounded-lg bg-(--settings-field) ps-3 pe-1.5",
		name: "min-w-0 flex-1 truncate text-[13px] font-medium",
	},
})();

/** A short editable list (repositories, calendars). */
export function List({ className, ...rest }: ComponentProps<"ul">) {
	return <ul className={list.base({ class: className })} {...rest} />;
}

export function ListItem({ name, children }: { name: ReactNode; children?: ReactNode }) {
	return (
		<li className={list.item()}>
			<span className={list.name()} title={typeof name === "string" ? name : undefined}>
				{name}
			</span>
			{children}
		</li>
	);
}
