/**
 * Notes — a scratchpad and a to-do list one shortcut away. A to-do can have a
 * time: when it comes, the island chimes, peeks and keeps it in the closed
 * island until it's ticked off or put away.
 *
 * All front end: the notes live in `store.ts` (localStorage).
 */
import { AlarmClockIcon, NotebookPenIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "../../core/i18n";
import { moduleEnabled, useSetting } from "../../core/settings";
import type { IslandModule, ModuleView } from "../../core/types";
import { playAlarm } from "../pomodoro/alarm";
import { NotesPanel } from "./components/NotesPanel";
import { dueTodo, NOTES_YELLOW, nextDue, useNotes } from "./store";

/** setTimeout's ceiling (~24.8 days); a later reminder is looked at again then. */
const MAX_WAIT = 2 ** 31 - 1;

export const notesModule: IslandModule = {
	id: "notes",
	title: "notes.title",
	settingsIcon: <NotebookPenIcon size={15} />,
	enabledByDefault: false,
	useView(): ModuleView {
		const t = useT();
		const enabled = useSetting(moduleEnabled(notesModule));
		const state = useNotes();
		const [now, setNow] = useState(Date.now);

		// One timeout to the next reminder.
		const next = nextDue(state.todos, now);
		useEffect(() => {
			if (!Number.isFinite(next)) return;
			const id = window.setTimeout(() => setNow(Date.now()), Math.min(next - Date.now(), MAX_WAIT));
			return () => window.clearTimeout(id);
		}, [next]);

		const due = enabled ? dueTodo(state.todos, now) : undefined;

		// Each reminder chimes once.
		const dueId = due?.id;
		useEffect(() => {
			if (dueId) playAlarm("chime", "medium", 1);
		}, [dueId]);

		return {
			active: !!due,
			priority: 60,
			accent: NOTES_YELLOW,
			icon: <NotebookPenIcon size={14} color={NOTES_YELLOW} />,
			compact: due
				? {
						left: (
							<span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
								<AlarmClockIcon size={15} color={NOTES_YELLOW} className="flex-none" />
								<span className="truncate">{due.text}</span>
							</span>
						),
						right: <span className="text-[12px] font-bold text-[#ffe766]">{t("notes.due")}</span>,
						width: 290,
					}
				: undefined,
			expanded: <NotesPanel state={state} now={now} />,
			expandedSize: { width: 620, height: 230 },
			activityKey: due ? `due:${due.id}` : undefined,
			attention: !!due,
		};
	},
};
