import { BellOffIcon, CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { type CSSProperties, type FormEvent, type KeyboardEvent, useState } from "react";
import { command } from "../../../core/bridge";
import { cn } from "../../../core/cn";
import { useLocale, useT } from "../../../core/i18n";
import { useIsland } from "../../../core/island";
import { NOTES_YELLOW, type NotesState, nextAt, notes, type Todo } from "../store";

/**
 * Typing in the island: it takes the keyboard on click and stays open while a
 * field has it; Esc gives the keyboard back to the app you were in.
 */
function useTyping() {
	const island = useIsland();
	return {
		onMouseDown: () => command("focus_island"),
		onFocus: () => island.keepOpen(true, "notes"),
		onBlur: () => island.keepOpen(false, "notes"),
		onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
			if (e.key !== "Escape") return;
			e.preventDefault();
			(e.target as HTMLElement).blur();
			command("restore_focus");
		},
	};
}

const field =
	"rounded-xl bg-white/6 text-[13px] text-text outline-none select-text placeholder:text-text-faint focus:bg-white/9";

/** A scratchpad on the left, the to-do list on the right. */
export function NotesPanel({ state, now }: { state: NotesState; now: number }) {
	const t = useT();
	const typing = useTyping();
	const open = state.todos.filter((x) => !x.done).length;

	return (
		<div className="flex h-full gap-3 pt-1" onClick={(e) => e.stopPropagation()} data-no-drag>
			<textarea
				{...typing}
				className={cn(field, "min-w-0 flex-1 resize-none px-3 py-2.5 leading-[1.45] [scrollbar-width:thin]")}
				value={state.text}
				placeholder={t("notes.scratch")}
				aria-label={t("notes.scratch")}
				spellCheck={false}
				onChange={(e) => notes.setText(e.target.value)}
			/>
			<div className="flex w-62 flex-none flex-col gap-1.5">
				<AddTodo />
				<ul
					className="flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto [scrollbar-width:none]"
					data-scroll
				>
					{state.todos.map((todo) => (
						<TodoRow key={todo.id} todo={todo} now={now} />
					))}
					{!state.todos.length && <li className="px-2 py-3 text-[12px] text-text-dim">{t("notes.empty")}</li>}
				</ul>
				{state.todos.length > open && (
					<button
						type="button"
						className="self-end px-1 text-[11.5px] text-text-dim hover:text-text"
						onClick={notes.clearDone}
					>
						{t("notes.clearDone")}
					</button>
				)}
			</div>
		</div>
	);
}

function AddTodo() {
	const t = useT();
	const typing = useTyping();
	const [text, setText] = useState("");
	const [time, setTime] = useState("");

	function submit(e: FormEvent) {
		e.preventDefault();
		notes.add(text, nextAt(time, Date.now()));
		setText("");
		setTime("");
	}

	return (
		<form className={cn(field, "flex h-9 flex-none items-center gap-1 pr-1 pl-3")} onSubmit={submit}>
			<input
				{...typing}
				className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-faint"
				value={text}
				placeholder={t("notes.add")}
				aria-label={t("notes.add")}
				spellCheck={false}
				onChange={(e) => setText(e.target.value)}
			/>
			<input
				{...typing}
				type="time"
				className="h-7 w-17 flex-none rounded-lg bg-white/7 px-1 text-[11.5px] text-text-dim tabular-nums outline-none [color-scheme:dark]"
				value={time}
				aria-label={t("notes.remind")}
				title={t("notes.remind")}
				onChange={(e) => setTime(e.target.value)}
			/>
			<button
				type="submit"
				className="grid size-7 flex-none place-items-center rounded-lg text-text-dim hover:bg-white/10 hover:text-text disabled:opacity-40"
				aria-label={t("notes.addButton")}
				disabled={!text.trim()}
			>
				<PlusIcon size={15} />
			</button>
		</form>
	);
}

function TodoRow({ todo, now }: { todo: Todo; now: number }) {
	const t = useT();
	const locale = useLocale();
	const overdue = !todo.done && todo.due !== null && todo.due <= now;
	const ringing = overdue && !todo.alerted;
	const time =
		todo.due === null ? null : new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(todo.due);

	return (
		<li
			className={cn(
				"group flex min-h-8 items-center gap-2 rounded-lg px-1.5 hover:bg-white/6",
				ringing && "bg-[color-mix(in_srgb,var(--notes)_14%,transparent)]",
			)}
			style={{ "--notes": NOTES_YELLOW } as CSSProperties}
		>
			<button
				type="button"
				aria-pressed={todo.done}
				aria-label={todo.text}
				onClick={() => notes.toggle(todo.id)}
				className={cn(
					"grid size-4.5 flex-none place-items-center rounded-full border-[1.5px] border-white/30 transition-colors duration-150",
					todo.done && "border-(--notes) bg-(--notes) text-black",
				)}
			>
				{todo.done && <CheckIcon size={11} strokeWidth={3} />}
			</button>
			<span className={cn("min-w-0 flex-1 truncate text-[12.5px]", todo.done && "text-text-faint line-through")}>
				{todo.text}
			</span>
			{time && !todo.done && (
				<span className={cn("flex-none text-[11px] tabular-nums", overdue ? "text-(--notes)" : "text-text-dim")}>
					{time}
				</span>
			)}
			{ringing ? (
				<button
					type="button"
					className="grid size-6 flex-none place-items-center rounded-md text-(--notes) hover:bg-white/10"
					aria-label={t("notes.dismiss")}
					title={t("notes.dismiss")}
					onClick={() => notes.dismiss(todo.id)}
				>
					<BellOffIcon size={13} />
				</button>
			) : (
				<button
					type="button"
					className="hidden size-6 flex-none place-items-center rounded-md text-text-dim group-hover:grid hover:bg-white/10 hover:text-text"
					aria-label={t("notes.remove")}
					title={t("notes.remove")}
					onClick={() => notes.remove(todo.id)}
				>
					<XIcon size={13} />
				</button>
			)}
		</li>
	);
}
