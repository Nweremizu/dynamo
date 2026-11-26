import { MotionConfig, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { cn } from "../core/cn";
import { useSyncLocale } from "../core/i18n";
import { useSettings } from "../core/settings";
import { Sidebar, scrollbar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { ToolbarTitle } from "./components/toolbar";
import { parentOf } from "./nav";
import { AboutPage } from "./pages/AboutPage";
import { AppearancePage } from "./pages/AppearancePage";
import { BehaviorPage } from "./pages/BehaviorPage";
import { GeneralPage } from "./pages/GeneralPage";
import { ModulePage } from "./pages/ModulePage";
import { ModulesPage } from "./pages/ModulesPage";
import { PluginPage } from "./pages/plugins/PluginPage";
import { PluginsPage } from "./pages/plugins/PluginsPage";
import { ShortcutsPage } from "./pages/ShortcutsPage";

/**
 * Settings window: a Windows title bar (the app's mark, a sub-page's back
 * button, the page title once it scrolls away, minimize and close) over a
 * sidebar (search, the pages) beside the content.
 * Pages are routes in a `MemoryRouter`, since the window has no URL. Motion
 * follows the system's reduced-motion setting throughout.
 */
export function SettingsApp() {
	const values = useSettings();
	useSyncLocale();

	return (
		<MotionConfig reducedMotion="user">
			<MemoryRouter>
				<div className="flex h-full flex-col bg-(--settings-window) text-text" data-settings>
					<Content sidebar={<Sidebar values={values} />}>
						<Routes>
							<Route index element={<GeneralPage values={values} />} />
							<Route path="appearance" element={<AppearancePage values={values} />} />
							<Route path="behavior" element={<BehaviorPage values={values} />} />
							<Route path="modules" element={<ModulesPage values={values} />} />
							<Route path="modules/:id" element={<ModulePage values={values} />} />
							<Route path="shortcuts" element={<ShortcutsPage values={values} />} />
							<Route path="plugins" element={<PluginsPage values={values} />} />
							<Route path="plugins/:id" element={<PluginPage values={values} />} />
							<Route path="about" element={<AboutPage />} />
						</Routes>
					</Content>
				</div>
			</MemoryRouter>
		</MotionConfig>
	);
}

/**
 * The title bar across the top, then the sidebar beside the scrolling page.
 * The page's header reports its title; the title bar shows it once the header
 * is out of view. Each page fades in and starts at the top.
 */
function Content({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
	const { pathname } = useLocation();
	const main = useRef<HTMLElement>(null);
	const [title, setTitle] = useState("");
	const [scrolled, setScrolled] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-observe each page's header when the route changes
	useEffect(() => {
		const root = main.current;
		root?.scrollTo({ top: 0 });
		setScrolled(false);
		const header = root?.querySelector("[data-page-header] h1");
		if (!root || !header) return;
		const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { root, threshold: 0 });
		io.observe(header);
		return () => io.disconnect();
	}, [pathname]);

	return (
		<ToolbarTitle.Provider value={setTitle}>
			<TitleBar parent={parentOf(pathname)} title={title} showTitle={scrolled} />
			<div className="flex min-h-0 flex-1">
				{sidebar}
				<main
					ref={main}
					className={cn(
						"min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]",
						scrolled && "shadow-[inset_0_1px_0_var(--hairline)]",
						scrollbar,
					)}
				>
					<motion.div
						key={pathname}
						className="mx-auto flex max-w-170 flex-col gap-6 px-8 pt-5 pb-12 select-text max-[40rem]:px-4"
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.18, ease: "easeOut" }}
					>
						{children}
					</motion.div>
				</main>
			</div>
		</ToolbarTitle.Provider>
	);
}
