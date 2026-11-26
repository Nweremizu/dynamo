import { motion } from "motion/react";
import { tv } from "tailwind-variants";
import { Row } from "../../components/ui/card";
import { useT } from "../../core/i18n";
import { SNAPPY } from "../../core/motion";
import { type SettingDef, setSetting } from "../../core/settings";

const toggle = tv({
	slots: {
		base: "relative flex h-5.5 w-9.5 flex-none items-center rounded-full bg-white/16 p-0.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.04)] transition-[background-color] duration-200 ease-out enabled:hover:bg-white/20 disabled:cursor-default disabled:opacity-40",
		knob: "size-4.5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.35),0_0_0_0.5px_rgb(0_0_0/0.08)]",
	},
	variants: {
		checked: {
			true: { base: "justify-end bg-brand enabled:hover:bg-brand" },
		},
	},
});

/** An on/off switch, in the brand color when on; the knob slides on a spring. */
export function Toggle({
	checked,
	onChange,
	disabled,
	label,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
	/** Its name when no `<label>` wraps it (a list row's switch). */
	label?: string;
}) {
	const s = toggle({ checked });
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			className={s.base()}
			onClick={(e) => {
				e.preventDefault();
				onChange(!checked);
			}}
		>
			<motion.span className={s.knob()} layout transition={SNAPPY} />
		</button>
	);
}

/** A row bound to a boolean setting. */
export function ToggleRow({ def, value }: { def: SettingDef; value: boolean }) {
	const t = useT();
	return (
		<Row as="label" label={t(def.label)} desc={def.description && t(def.description)}>
			<Toggle checked={value} onChange={(v) => setSetting(def, v)} />
		</Row>
	);
}
