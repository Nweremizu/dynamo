import { PuzzleIcon, SearchIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../../core/cn";
import { type Translate, useT } from "../../core/i18n";
import { useOrderedModules } from "../../core/plugins/modules";
import { PAGES, type PageMeta } from "../nav";
import { ModulesNav } from "./ModulesNav";
import { NavItem, NavSection } from "./NavItem";

/** Thin rounded scrollbar thumb, inset from the edges (sidebar and pages). */
export const scrollbar =
	"[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-3 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-white/14 [&::-webkit-scrollbar-thumb]:bg-clip-padding";

/**
 * The sidebar: a search field and the pages in two
 * groups — the app itself and the island (each module folded under Modules)
 * — with About pinned at the bottom. Typing turns the list into the pages,
 * modules and settings that match. Narrower than 40rem (a small window, or
 * zoomed in), it folds into a rail of icons so the page keeps its room.
 */
export function Sidebar({ values }: { values: Record<string, unknown> }) {
	const t = useT();
	const [query, setQuery] = useState("");
	const field = useRef<HTMLInputElement>(null);
	const searching = query.trim().length > 0;

	return (
		<aside className="flex w-56 flex-none flex-col max-[40rem]:w-15 bg-(--settings-sidebar) shadow-[inset_-1px_0_0_var(--hairline)]">
			<div className="relative mx-3 mt-1 mb-2 flex-none max-[40rem]:hidden">
				<SearchIcon
					aria-hidden
					size={14}
					className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-text-dim"
				/>
				<input
					ref={field}
					type="search"
					value={query}
					aria-label={t("settings.search.label")}
					placeholder={t("settings.search.placeholder")}
					className="h-7.5 w-full rounded-lg bg-white/7 ps-8 pe-7 text-[13px] text-text shadow-[inset_0_0_0_1px_var(--hairline)] transition-[background-color] duration-150 placeholder:text-text-faint hover:bg-white/9 [&::-webkit-search-cancel-button]:hidden"
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => e.key === "Escape" && setQuery("")}
				/>
				{searching && (
					<button
						type="button"
						aria-label={t("settings.search.clear")}
						className="absolute end-1 top-1/2 grid size-5.5 -translate-y-1/2 place-items-center rounded-md text-text-dim hover:bg-white/10 hover:text-text"
						onClick={() => {
							setQuery("");
							field.current?.focus();
						}}
					>
						<XIcon aria-hidden size={12} strokeWidth={2.4} />
					</button>
				)}
			</div>
			<nav aria-label={t("settings.subtitle")} className="flex min-h-0 flex-1 flex-col pb-3">
				{/*
				 * Scrolls on its own when the module list outgrows the window; "About" stays
				 * pinned below. The scrollbar's gutter sits in the sidebar's end padding,
				 * so the entries keep their width whether it shows or not.
				 */}
				<div
					className={cn(
						"flex min-h-0 flex-1 flex-col gap-px overflow-y-auto ps-3 pe-0.5 [scrollbar-gutter:stable] *:shrink-0 max-[40rem]:ps-2",
						scrollbar,
					)}
				>
					{searching ? (
						<Results query={query} values={values} />
					) : (
						<>
							<NavSection label={t("settings.section.app")} />
							<Page page={PAGES.general} />
							<Page page={PAGES.appearance} />
							<Page page={PAGES.behavior} />
							<NavSection label={t("settings.section.island")} />
							<ModulesNav values={values} />
							<Page page={PAGES.shortcuts} />
							<Page page={PAGES.plugins} />
						</>
					)}
				</div>
				<div className="mx-3 mt-2 border-t border-hairline pt-2 max-[40rem]:mx-2">
					<Page page={PAGES.about} />
				</div>
			</nav>
		</aside>
	);
}

function Page({ page }: { page: PageMeta }) {
	const t = useT();
	return <NavItem to={page.path} end={!page.prefix} icon={page.icon} tone={page.tone} label={t(page.title)} />;
}

interface Hit {
	to: string;
	label: string;
	detail?: string;
	page: PageMeta | null;
	icon?: React.ReactNode;
}

/** Case- and accent-insensitive. */
const fold = (s: string) =>
	s
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

/** Pages by name or by a setting on them, then modules by name or by one of their settings. */
function search(query: string, t: Translate, modules: ReturnType<typeof useOrderedModules>): Hit[] {
	const q = fold(query.trim());
	const hits: Hit[] = [];
	for (const page of Object.values(PAGES) as PageMeta[]) {
		const title = t(page.title);
		if (fold(title).includes(q)) hits.push({ to: page.path, label: title, page });
		else {
			const setting = page.keywords?.map((k) => t(k)).find((label) => fold(label).includes(q));
			if (setting) hits.push({ to: page.path, label: title, detail: setting, page });
		}
	}
	for (const m of modules) {
		const title = t(m.title);
		const to = `/modules/${m.id}`;
		const icon = m.settingsIcon ?? <PuzzleIcon />;
		if (fold(title).includes(q)) hits.push({ to, label: title, page: null, icon });
		else {
			const setting = m.settings?.map((d) => t(d.label)).find((label) => fold(label).includes(q));
			if (setting) hits.push({ to, label: title, detail: setting, page: null, icon });
		}
	}
	return hits;
}

function Results({ query, values }: { query: string; values: Record<string, unknown> }) {
	const t = useT();
	const modules = useOrderedModules(values);
	const hits = search(query, t, modules);
	return (
		<>
			{/* Announces the count as it changes; the list itself is the visible result. */}
			<span role="status" className="sr-only">
				{hits.length === 1 ? t("settings.search.one") : t("settings.search.count", { n: hits.length })}
			</span>
			{hits.length ? (
				<>
					<NavSection label={t("settings.search.results")} />
					{hits.map((h) => (
						<NavItem
							key={`${h.to}:${h.detail ?? ""}`}
							to={h.to}
							icon={h.page?.icon ?? h.icon}
							tone={h.page?.tone}
							label={h.label}
							detail={h.detail}
						/>
					))}
				</>
			) : (
				<div className="flex flex-col gap-1 px-2 pt-6 text-center">
					<span className="text-[13px] font-medium">{t("settings.search.empty", { query: query.trim() })}</span>
					<span className="text-[12px] text-text-dim text-pretty">{t("settings.search.emptyHint")}</span>
				</div>
			)}
		</>
	);
}
